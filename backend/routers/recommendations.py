from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from database import get_db
from schemas import RecommendationRequest, RecommendationResponse
from models import Recommendation, User, UserProfile, CampusMap
from services import faiss_service, optimization_service, diversity_service, llm_service
from auth_utils import get_current_user

router = APIRouter()

# Per-user recent sub_category history (in-memory, keyed by user_id)
_user_history: Dict[int, List[str]] = {}


def _get_recent_history(user_id: int) -> List[str]:
    return _user_history.get(user_id, [])


def _update_history(user_id: int, sub_categories: List[str]):
    current = _user_history.get(user_id, [])
    _user_history[user_id] = (current + sub_categories)[-50:]


def _location_matches(rec_location: str, requested: str, campus_areas: list) -> bool:
    """Return True if the recommendation's location is relevant to the requested area."""
    if not requested or not rec_location:
        return True  # no constraint → pass
    req_lower = requested.lower().strip()
    rec_lower = rec_location.lower().strip()
    # Direct substring match
    if req_lower in rec_lower or rec_lower in req_lower:
        return True
    # Generic campus-wide locations always pass
    generic = {"main campus", "campus", "college", "anywhere", "all areas"}
    if rec_lower in generic or req_lower in generic:
        return True
    # Check against user's known campus areas
    for area in (campus_areas or []):
        if area.lower() in rec_lower or rec_lower in area.lower():
            return True
    # Partial word overlap (at least one common significant word)
    req_words = set(req_lower.split()) - {"the", "of", "and", "at", "in", "near"}
    rec_words = set(rec_lower.split()) - {"the", "of", "and", "at", "in", "near"}
    return bool(req_words & rec_words)


def _recs_to_dicts(recs: List[Recommendation]) -> List[dict]:
    return [
        {
            "id": r.id,
            "name": r.name,
            "category": r.category,
            "sub_category": r.sub_category,
            "description": r.description,
            "location": r.location,
            "cost": r.cost,
            "duration_minutes": r.duration_minutes,
            "rating": r.rating,
            "tags": r.tags or [],
            "available_times": r.available_times or [],
        }
        for r in recs
    ]


@router.post("", response_model=List[dict])
async def get_recommendations(
    req: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Merge user's stored preferences with request preferences
    stored_prefs = current_user.preferences or []
    effective_prefs = list(set(req.preferences + stored_prefs))

    # Load user behavioral profile for personalized weights
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    custom_weights = profile.optimization_weights if profile and profile.optimization_weights else None

    # Load user's campus map areas for location validation
    campus_map = db.query(CampusMap).filter(CampusMap.user_id == current_user.id).first()
    campus_areas = []
    if campus_map and campus_map.knowledge_graph:
        campus_areas = campus_map.knowledge_graph.get("areas", [])
    # ── 1. Retrieve candidates (FAISS semantic search) ─────────────────────
    query = f"{' '.join(effective_prefs)} {req.location} {req.time_of_day}"
    faiss_hits = faiss_service.search(query, top_k=20)

    if faiss_hits:
        candidate_ids = [meta["id"] for meta, _ in faiss_hits]
        candidates_db = db.query(Recommendation).filter(Recommendation.id.in_(candidate_ids)).all()
    else:
        # Fallback: all recommendations
        candidates_db = db.query(Recommendation).limit(30).all()

    candidate_dicts = _recs_to_dicts(candidates_db)

    # Filter by category if specified
    if req.categories:
        candidate_dicts = [c for c in candidate_dicts if c["category"] in req.categories]

    # Filter out items exceeding budget
    affordable = [c for c in candidate_dicts if c["cost"] <= req.budget]

    if not affordable:
        affordable = candidate_dicts[:10]  # relax constraint gracefully

    # ── Location validation — filter out items clearly not near requested location ──
    location_valid = [
        c for c in affordable
        if _location_matches(c["location"], req.location, campus_areas)
    ]
    # Fall back gracefully if filter is too strict
    if len(location_valid) >= 3:
        affordable = location_valid
    # location_note for diversity message if some were filtered
    location_filtered_count = len(affordable) - len(location_valid)

    # ── 2. Anti-filter bubble diversity scores ─────────────────────────────
    history = _get_recent_history(current_user.id)
    div_scores = diversity_service.compute_diversity_scores(affordable, history)

    bubble_detected, bubble_msg = diversity_service.detect_filter_bubble(history)

    # ── 3. Score and rank ─────────────────────────────────────────────────
    # Score ALL affordable items so the diversity pool is also fully scored
    full_ranked = optimization_service.rank_recommendations(
        affordable,
        budget=req.budget,
        free_time_minutes=req.free_time_minutes,
        user_preferences=effective_prefs,
        user_location=req.location,
        time_of_day=req.time_of_day,
        diversity_scores=div_scores,
        top_k=len(affordable),  # score everything
        custom_weights=custom_weights,
    )

    ranked = full_ranked[:req.top_k]

    # Ensure diversity across categories — pool is now fully scored
    ranked = diversity_service.ensure_category_diversity(ranked, min_categories=2, pool=full_ranked)

    # ── 4. Generate explanations for top 3 ───────────────────────────────
    rejected_names = [r["name"] for r in ranked[req.top_k:req.top_k + 3]]
    for i, rec in enumerate(ranked[:3]):
        breakdown = rec.get("score_breakdown") or {}
        try:
            rec["explanation"] = await llm_service.generate_explanation(
                rec["name"],
                breakdown,
                rejected_names,
            )
        except Exception:
            if breakdown:
                top_key = max(breakdown, key=breakdown.get)
                rec["explanation"] = (
                    f"{rec['name']} is recommended primarily because of strong {top_key}. "
                    f"It fits within your ₹{req.budget:.0f} budget and matches your preferences."
                )
            else:
                rec["explanation"] = (
                    f"{rec['name']} is a great match for your budget and preferences."
                )

    # ── 5. Update history cache ──────────────────────────────────────────
    _update_history(current_user.id, [r["sub_category"] for r in ranked])

    diversity_note = diversity_service.get_diversity_injection_note(
        history, ranked[0]["sub_category"] if ranked else ""
    )

    return [{"diversity_note": diversity_note, **r} for r in ranked]


@router.get("/all")
def list_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recs = db.query(Recommendation).all()
    return _recs_to_dicts(recs)
