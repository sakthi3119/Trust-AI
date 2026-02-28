"""Campus map router — upload site map image, extract knowledge graph via LLM vision."""
import base64
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, CampusMap
from services import llm_service
from auth_utils import get_current_user

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 10


@router.post("/upload")
async def upload_campus_map(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a campus site map / blueprint image. LLM extracts a knowledge graph."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG or WebP.")

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, detail=f"File too large. Max {MAX_SIZE_MB} MB.")

    # Base64 encode for LLM vision API
    image_b64 = base64.b64encode(raw_bytes).decode("utf-8")

    # Extract knowledge graph via LLM
    knowledge_graph, raw_description = await llm_service.extract_campus_knowledge(
        image_b64, filename=file.filename or "campus_map"
    )

    # Upsert CampusMap record
    existing = db.query(CampusMap).filter(CampusMap.user_id == current_user.id).first()
    if existing:
        existing.filename = file.filename or "campus_map"
        existing.knowledge_graph = knowledge_graph
        existing.raw_description = raw_description
    else:
        new_map = CampusMap(
            user_id=current_user.id,
            filename=file.filename or "campus_map",
            knowledge_graph=knowledge_graph,
            raw_description=raw_description,
        )
        db.add(new_map)

    db.commit()

    areas = knowledge_graph.get("areas", [])
    return {
        "message": "Campus map analyzed successfully",
        "filename": file.filename,
        "areas_found": len(areas),
        "knowledge_graph": knowledge_graph,
    }


@router.get("/map")
def get_campus_map(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the stored campus map knowledge graph for the current user."""
    campus_map = db.query(CampusMap).filter(CampusMap.user_id == current_user.id).first()
    if not campus_map:
        return {"exists": False, "knowledge_graph": {}, "areas": []}
    return {
        "exists": True,
        "filename": campus_map.filename,
        "knowledge_graph": campus_map.knowledge_graph,
        "areas": campus_map.knowledge_graph.get("areas", []),
        "description": campus_map.knowledge_graph.get("description", ""),
        "updated_at": campus_map.updated_at.isoformat() if campus_map.updated_at else None,
    }


@router.delete("/map")
def delete_campus_map(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete the user's campus map."""
    campus_map = db.query(CampusMap).filter(CampusMap.user_id == current_user.id).first()
    if campus_map:
        db.delete(campus_map)
        db.commit()
    return {"message": "Campus map removed."}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a profile photo — stored as base64 on the user record."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, detail="Unsupported file type. Use JPEG or PNG.")

    raw_bytes = await file.read()
    if len(raw_bytes) > 2 * 1024 * 1024:  # 2 MB limit for avatars
        raise HTTPException(400, detail="Avatar too large. Max 2 MB.")

    b64 = base64.b64encode(raw_bytes).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{b64}"

    user = db.query(User).filter(User.id == current_user.id).first()
    user.avatar = data_url
    db.commit()

    return {"avatar": data_url}


@router.get("/avatar")
def get_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the user's stored avatar data URL."""
    user = db.query(User).filter(User.id == current_user.id).first()
    return {"avatar": user.avatar or ""}
