"""Onboarding questionnaire — saves answers and runs LLM behavioral analysis."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserProfile
from schemas import OnboardingAnswers, UserProfileResponse, ProfileUpdateRequest
from auth_utils import get_current_user
from services import llm_service

router = APIRouter()


def _build_profile_from_llm(profile_data: dict, answers: dict, profile: UserProfile, user: User):
    """Apply LLM analysis result to a UserProfile and User record."""
    profile.onboarding_answers = answers
    profile.spending_style = profile_data.get("spending_style", "balanced")
    profile.activity_persona = profile_data.get("activity_persona", "explorer")
    profile.social_preference = profile_data.get("social_preference", "mixed")
    profile.exploration_level = int(profile_data.get("exploration_level", 3))
    profile.energy_level = profile_data.get("energy_level", "moderate")
    profile.top_categories = profile_data.get("top_categories", answers.get("favorite_activities", [])[:3])
    profile.personalization_summary = profile_data.get("personalization_summary", "")
    profile.optimization_weights = profile_data.get("optimization_weights", {})


@router.post("/submit", response_model=UserProfileResponse)
async def submit_onboarding(
    answers: OnboardingAnswers,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze answers with LLM, store behavioral profile, mark user as onboarded."""
    answers_dict = answers.model_dump()

    # LLM analyzes the onboarding answers
    profile_data = await llm_service.analyze_onboarding_behavior(answers_dict)

    # Update user preferences, budget, college/city from answers
    current_user.preferences = answers.favorite_activities
    current_user.daily_budget = answers.daily_budget
    current_user.college_name = answers.college_name or current_user.college_name
    current_user.city = answers.city or current_user.city
    current_user.is_onboarded = True

    # Upsert UserProfile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    _build_profile_from_llm(profile_data, answers_dict, profile, current_user)

    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    # Build response — merge user fields into the profile response
    return {
        "college_name": current_user.college_name,
        "city": current_user.city,
        "daily_budget": current_user.daily_budget,
        "monthly_budget": current_user.monthly_budget,
        "avatar": current_user.avatar or "",
        "spending_style": profile.spending_style,
        "activity_persona": profile.activity_persona,
        "social_preference": profile.social_preference,
        "exploration_level": profile.exploration_level,
        "energy_level": profile.energy_level,
        "top_categories": profile.top_categories or [],
        "personalization_summary": profile.personalization_summary or "",
        "optimization_weights": profile.optimization_weights or {},
        "onboarding_answers": profile.onboarding_answers or {},
    }


@router.get("/profile", response_model=UserProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found. Complete onboarding first.")
    return {
        "college_name": current_user.college_name or "",
        "city": current_user.city or "",
        "daily_budget": current_user.daily_budget,
        "monthly_budget": current_user.monthly_budget,
        "avatar": current_user.avatar or "",
        "spending_style": profile.spending_style,
        "activity_persona": profile.activity_persona,
        "social_preference": profile.social_preference,
        "exploration_level": profile.exploration_level,
        "energy_level": profile.energy_level,
        "top_categories": profile.top_categories or [],
        "personalization_summary": profile.personalization_summary or "",
        "optimization_weights": profile.optimization_weights or {},
        "onboarding_answers": profile.onboarding_answers or {},
    }


@router.patch("/update", response_model=UserProfileResponse)
async def update_profile(
    update: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mid-usage profile update. Applies any provided fields.
    If behavior fields change, re-runs LLM analysis to update
    personalization weights and persona automatically.
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Complete onboarding first.")

    # Update user-level fields
    if update.college_name is not None:
        current_user.college_name = update.college_name
    if update.city is not None:
        current_user.city = update.city
    if update.daily_budget is not None:
        current_user.daily_budget = update.daily_budget
    if update.monthly_budget is not None:
        current_user.monthly_budget = update.monthly_budget

    # Detect if any behavior-related field is being changed → re-run LLM
    BEHAVIOR_FIELDS = {"favorite_activities", "active_time", "social_style", "motivation", "exploration_score", "campus_areas"}
    provided = {k for k, v in update.model_dump(exclude_none=True).items() if k in BEHAVIOR_FIELDS}

    if provided:
        # Merge current answers with the new values
        current_answers = dict(profile.onboarding_answers or {})
        for field in provided:
            current_answers[field] = getattr(update, field)
        # Always inject current college/city into the answers for LLM context
        current_answers["college_name"] = current_user.college_name or ""
        current_answers["city"] = current_user.city or ""
        # Update activity preferences on user too
        if update.favorite_activities is not None:
            current_user.preferences = update.favorite_activities

        # Re-run LLM analysis
        profile_data = await llm_service.analyze_onboarding_behavior(current_answers)
        _build_profile_from_llm(profile_data, current_answers, profile, current_user)
    else:
        # Only non-behavior fields changed (college/city/budget) — update answers record too
        current_answers = dict(profile.onboarding_answers or {})
        current_answers["college_name"] = current_user.college_name or ""
        current_answers["city"] = current_user.city or ""
        profile.onboarding_answers = current_answers

    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    return {
        "college_name": current_user.college_name or "",
        "city": current_user.city or "",
        "daily_budget": current_user.daily_budget,
        "monthly_budget": current_user.monthly_budget,
        "avatar": current_user.avatar or "",
        "spending_style": profile.spending_style,
        "activity_persona": profile.activity_persona,
        "social_preference": profile.social_preference,
        "exploration_level": profile.exploration_level,
        "energy_level": profile.energy_level,
        "top_categories": profile.top_categories or [],
        "personalization_summary": profile.personalization_summary or "",
        "optimization_weights": profile.optimization_weights or {},
        "onboarding_answers": profile.onboarding_answers or {},
    }
