from fastapi import APIRouter, Depends
from schemas import (
    ContentRequest, ContentResponse,
    CampaignRequest, CampaignResponse,
    CaptionVariantsRequest, CaptionVariantsResponse,
    EngagementKitRequest, EngagementKitResponse,
)
from services import llm_service
from models import User
from auth_utils import get_current_user

router = APIRouter()


@router.post("/generate", response_model=ContentResponse)
async def generate_content(
    req: ContentRequest,
    current_user: User = Depends(get_current_user),
):
    result = await llm_service.generate_club_content(
        event_type=req.event_type,
        tone=req.tone,
        date=req.date or "",
        venue=req.venue or "",
        extra=req.extra_details or "",
        brand=req.brand.model_dump() if req.brand else None,
    )
    return ContentResponse(**result)


@router.post("/campaign", response_model=CampaignResponse)
async def plan_campaign(
    req: CampaignRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a 5-phase promotional campaign for an event."""
    result = await llm_service.generate_campaign(
        event_type=req.event_type,
        event_date=req.event_date,
        venue=req.venue or "",
        extra=req.extra_details or "",
        brand=req.brand.model_dump() if req.brand else None,
    )
    return CampaignResponse(**result)


@router.post("/caption-variants", response_model=CaptionVariantsResponse)
async def caption_variants(
    req: CaptionVariantsRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate 5 caption style variants for the same event."""
    result = await llm_service.generate_caption_variants(
        event_type=req.event_type,
        date=req.date or "",
        venue=req.venue or "",
        extra=req.extra_details or "",
        brand=req.brand.model_dump() if req.brand else None,
    )
    return CaptionVariantsResponse(**result)


@router.post("/engagement-kit", response_model=EngagementKitResponse)
async def engagement_kit(
    req: EngagementKitRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate polls, story Q&A prompts, quiz and countdown hook."""
    result = await llm_service.generate_engagement_kit(
        event_type=req.event_type,
        date=req.date or "",
        extra=req.extra_details or "",
        brand=req.brand.model_dump() if req.brand else None,
    )
    return EngagementKitResponse(**result)


@router.get("/demo")
async def demo_content():
    result = await llm_service.generate_club_content(
        event_type="Annual Tech Fest",
        tone="energetic",
        date="March 15, 2025",
        venue="Main Auditorium",
        extra="Coding hackathon, robotics showcase, UI/UX challenge",
    )
    return result

