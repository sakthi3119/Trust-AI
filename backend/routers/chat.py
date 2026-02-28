from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from schemas import ChatRequest, ChatResponse
from models import ChatMessage, ChatSession, User, UserProfile
from services import llm_service
from auth_utils import get_current_user
from datetime import datetime
from typing import Optional

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────
def _get_or_create_session(db: Session, user_id: int, session_id: Optional[int]) -> ChatSession:
    if session_id:
        sess = db.query(ChatSession).filter(
            ChatSession.id == session_id, ChatSession.user_id == user_id
        ).first()
        if not sess:
            raise HTTPException(status_code=404, detail="Session not found")
        return sess
    sess = ChatSession(user_id=user_id, title="New Chat")
    db.add(sess)
    db.flush()
    return sess


def _history_for_session(db: Session, user_id: int, session_id: int, limit: int = 10):
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id, ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in reversed(msgs)]


# ── Session CRUD ───────────────────────────────────────────────────────────────
@router.post("/sessions")
def create_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sess = ChatSession(user_id=current_user.id, title="New Chat")
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return {"id": sess.id, "title": sess.title, "is_pinned": sess.is_pinned,
            "created_at": sess.created_at, "updated_at": sess.updated_at,
            "message_count": 0, "last_message": None}


@router.get("/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.is_pinned), desc(ChatSession.updated_at))
        .all()
    )
    result = []
    for s in sessions:
        last = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == s.id)
            .order_by(desc(ChatMessage.timestamp))
            .first()
        )
        count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        result.append({
            "id": s.id, "title": s.title, "is_pinned": s.is_pinned,
            "created_at": s.created_at, "updated_at": s.updated_at,
            "message_count": count,
            "last_message": last.content[:60] if last else None,
        })
    return result


@router.patch("/sessions/{session_id}")
def update_session(
    session_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sess = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == current_user.id
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if "title" in payload:
        sess.title = payload["title"]
    if "is_pinned" in payload:
        sess.is_pinned = payload["is_pinned"]
    sess.updated_at = datetime.utcnow()
    db.commit()
    return {"id": sess.id, "title": sess.title, "is_pinned": sess.is_pinned}


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sess = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == current_user.id
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(sess)
    db.commit()
    return {"message": "Session deleted"}


# ── Main chat endpoint ─────────────────────────────────────────────────────────
@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sess = _get_or_create_session(db, current_user.id, req.session_id)

    existing_user_msgs = db.query(ChatMessage).filter(
        ChatMessage.session_id == sess.id, ChatMessage.role == "user"
    ).count()

    history = _history_for_session(db, current_user.id, sess.id)

    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    profile_dict = {
        "personalization_summary": getattr(profile, "personalization_summary", ""),
        "top_categories": getattr(profile, "top_categories", []),
        "spending_style": getattr(profile, "spending_style", "balanced"),
        "activity_persona": getattr(profile, "activity_persona", "explorer"),
        "college_name": getattr(current_user, "college_name", "") or "",
        "city": getattr(current_user, "city", "") or "",
    } if profile else {
        "college_name": getattr(current_user, "college_name", "") or "",
        "city": getattr(current_user, "city", "") or "",
    }

    extracted = await llm_service.extract_intent_and_data(req.message)
    intent = extracted.get("intent", "general_chat")
    reply = await llm_service.general_chat(history, req.message, user_profile=profile_dict)

    # Auto-name session from first user message
    if existing_user_msgs == 0 and sess.title == "New Chat":
        sess.title = req.message[:40].strip() + ("…" if len(req.message) > 40 else "")

    db.add(ChatMessage(user_id=current_user.id, session_id=sess.id, role="user",      content=req.message))
    db.add(ChatMessage(user_id=current_user.id, session_id=sess.id, role="assistant", content=reply))
    sess.updated_at = datetime.utcnow()
    db.commit()

    return ChatResponse(reply=reply, intent=intent, extracted_data=extracted, session_id=sess.id)


# ── History ────────────────────────────────────────────────────────────────────
@router.get("/history")
def get_history(
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if session_id:
        msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == current_user.id, ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp.asc())
            .all()
        )
    else:
        msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == current_user.id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(50)
            .all()
        )
        msgs = list(reversed(msgs))
    return [{"role": m.role, "content": m.content, "timestamp": str(m.timestamp)} for m in msgs]


@router.delete("/history")
def clear_all_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(ChatSession).filter(ChatSession.user_id == current_user.id).delete()
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    db.commit()
    return {"message": "All history cleared"}
