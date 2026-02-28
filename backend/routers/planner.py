from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from database import get_db
from schemas import PlannerRequest, PlannerResponse
from models import Recommendation, User, DayPlan, UserProfile
from services import optimization_service, diversity_service, faiss_service, llm_service
from auth_utils import get_current_user

router = APIRouter()

CATEGORIES_ORDER = ["food", "activity", "event"]


def _parse_time(t: str) -> datetime:
    """Parse HH:MM into a datetime for today."""
    h, m = map(int, t.split(":"))
    today = date.today()
    return datetime(today.year, today.month, today.day, h, m)


@router.post("/generate", response_model=PlannerResponse)
async def generate_plan(
    req: PlannerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_dt = _parse_time(req.free_time_start)
    end_dt   = _parse_time(req.free_time_end)
    total_minutes = int((end_dt - start_dt).total_seconds() / 60)
    budget_left = req.budget

    # Pull candidates per category
    all_recs = db.query(Recommendation).all()

    def to_dict(r: Recommendation) -> dict:
        return {
            "id": r.id, "name": r.name, "category": r.category,
            "sub_category": r.sub_category, "description": r.description,
            "location": r.location, "cost": r.cost,
            "duration_minutes": r.duration_minutes, "rating": r.rating,
            "tags": r.tags or [], "available_times": r.available_times or [],
        }

    recs_dict = [to_dict(r) for r in all_recs]

    # Determine time of day
    hour = start_dt.hour
    if hour < 12:
        time_of_day = "morning"
    elif hour < 17:
        time_of_day = "afternoon"
    else:
        time_of_day = "evening"

    div_scores = diversity_service.compute_diversity_scores(recs_dict, [])

    plan_items = []
    timeline   = []
    current_time = start_dt
    time_remaining = total_minutes

    for category in CATEGORIES_ORDER:
        if time_remaining <= 0 or budget_left <= 0:
            break

        cat_candidates = [
            r for r in recs_dict
            if r["category"] == category
            and r["cost"] <= budget_left
            and r["duration_minutes"] <= time_remaining
        ]

        if not cat_candidates:
            continue

        ranked = optimization_service.rank_recommendations(
            cat_candidates,
            budget=budget_left,
            free_time_minutes=time_remaining,
            user_preferences=req.preferences,
            user_location=req.location,
            time_of_day=time_of_day,
            diversity_scores={r["id"]: div_scores.get(r["id"], 0.5) for r in cat_candidates},
            top_k=1,
        )

        if ranked:
            best = ranked[0]
            slot_start = current_time.strftime("%H:%M")
            slot_end   = (current_time + timedelta(minutes=best["duration_minutes"])).strftime("%H:%M")

            plan_items.append({**best, "time_slot": f"{slot_start} - {slot_end}"})
            timeline.append({"time": slot_start, "activity": best["name"], "category": best["category"]})

            current_time += timedelta(minutes=best["duration_minutes"] + 15)  # 15-min buffer
            time_remaining -= best["duration_minutes"] + 15
            budget_left    -= best["cost"]

    total_cost     = sum(p["cost"] for p in plan_items)
    total_duration = sum(p["duration_minutes"] for p in plan_items)

    # Generate LLM explanation for the whole plan
    plan_summary = ", ".join([f"{p['name']} ({p['category']})" for p in plan_items])
    prompt_msg   = f"Explain this student day plan in 2 sentences: {plan_summary}. Budget used: ₹{total_cost:.0f}."
    try:
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        profile_dict = {"personalization_summary": getattr(profile, "personalization_summary", "")} if profile else {}
        explanation = await llm_service.general_chat([], prompt_msg, user_profile=profile_dict)
    except Exception:
        explanation = f"Your day plan includes {len(plan_items)} activities totalling ₹{total_cost:.0f} over {total_duration} minutes."

    # Persist plan
    plan_date = req.date or date.today().isoformat()
    db_plan = DayPlan(
        user_id=current_user.id, plan_date=plan_date,
        total_cost=total_cost, total_duration=total_duration,
        items=plan_items, explanation=explanation,
    )
    db.add(db_plan)
    db.commit()

    return PlannerResponse(
        items=plan_items,
        total_cost=total_cost,
        total_duration=total_duration,
        explanation=explanation,
        timeline=timeline,
    )


@router.get("/history")
def get_plan_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plans = db.query(DayPlan).filter(DayPlan.user_id == current_user.id).order_by(DayPlan.created_at.desc()).limit(10).all()
    return [
        {
            "id": p.id, "plan_date": p.plan_date,
            "total_cost": p.total_cost, "total_duration": p.total_duration,
            "items": p.items, "explanation": p.explanation,
        }
        for p in plans
    ]
