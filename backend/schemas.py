from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    name: str = "Student"

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    name: str
    is_onboarded: bool
    avatar: str = ""


# ── User ─────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    name: str = "Student"
    college_name: str = ""
    city: str = ""
    daily_budget: float = 500.0
    monthly_budget: float = 10000.0
    preferences: List[str] = []
    location: str = "Main Campus"

class UserCreate(UserBase):
    pass

class UserUpdate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    username: str
    email: str
    is_onboarded: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── User Profile (behavioral) ─────────────────────────────────────────────────
class OnboardingAnswers(BaseModel):
    college_name: str = ""                  # institution name
    city: str = ""                          # city / location
    favorite_activities: List[str]          # ["sports", "music", "tech events", ...]
    daily_budget: float                     # rupees
    active_time: str                        # "morning" | "afternoon" | "evening"
    social_style: str                       # "solo" | "small_group" | "large_group"
    motivation: str                         # "relaxation" | "learning" | "fitness" | ...
    exploration_score: int                  # 1-5
    campus_areas: List[str]                 # ["library", "sports complex", ...]

class ProfileUpdateRequest(BaseModel):
    """Partial update — any field can be omitted; behavior fields trigger LLM re-analysis."""
    college_name: Optional[str] = None
    city: Optional[str] = None
    daily_budget: Optional[float] = None
    monthly_budget: Optional[float] = None
    favorite_activities: Optional[List[str]] = None
    active_time: Optional[str] = None
    social_style: Optional[str] = None
    motivation: Optional[str] = None
    exploration_score: Optional[int] = None
    campus_areas: Optional[List[str]] = None

class UserProfileResponse(BaseModel):
    college_name: Optional[str] = ""
    city: Optional[str] = ""
    daily_budget: Optional[float] = 500.0
    monthly_budget: Optional[float] = 10000.0
    avatar: Optional[str] = ""
    monthly_budget: Optional[float] = 10000.0
    spending_style: str
    activity_persona: str
    social_preference: str
    exploration_level: int
    energy_level: str
    top_categories: List[str]
    personalization_summary: str
    optimization_weights: Dict[str, float]
    onboarding_answers: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True


# ── Transaction ──────────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    amount: float
    category: str
    description: str
    date: Optional[str] = None

class TransactionResponse(TransactionCreate):
    id: int
    user_id: int
    timestamp: datetime
    class Config:
        from_attributes = True


# ── Recommendation ───────────────────────────────────────────────────────────
class RecommendationResponse(BaseModel):
    id: int
    name: str
    category: str
    sub_category: str
    description: str
    location: str
    cost: float
    duration_minutes: int
    rating: float
    tags: List[str]
    available_times: List[str]
    # Scoring (injected by optimizer)
    score: Optional[float] = None
    score_breakdown: Optional[Dict[str, float]] = None
    explanation: Optional[str] = None
    class Config:
        from_attributes = True


# ── Chat ─────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None
    user_context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    reply: str
    intent: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    session_id: Optional[int] = None


# ── Recommendations request ───────────────────────────────────────────────────
class RecommendationRequest(BaseModel):
    budget: float
    free_time_minutes: int
    preferences: List[str]
    location: str
    time_of_day: str = "afternoon"   # morning | afternoon | evening
    categories: Optional[List[str]] = None
    top_k: int = 5


# ── Day Planner ───────────────────────────────────────────────────────────────
class PlannerRequest(BaseModel):
    budget: float
    free_time_start: str    # "14:00"
    free_time_end: str      # "20:00"
    preferences: List[str]
    location: str
    date: Optional[str] = None

class PlannerResponse(BaseModel):
    items: List[Dict[str, Any]]
    total_cost: float
    total_duration: int
    explanation: str
    timeline: List[Dict[str, str]]


# ── Content Generator ─────────────────────────────────────────────────────────
class BrandIdentity(BaseModel):
    """Reusable club brand info to inject into any generation."""
    club_name: Optional[str] = ""
    tagline: Optional[str] = ""
    tone: Optional[str] = "energetic"
    signature_hashtags: Optional[str] = ""   # "#TechClub #VIT"
    emoji_style: Optional[str] = "fun"       # "fun" | "minimal" | "professional"

class ContentRequest(BaseModel):
    event_type: str     # "tech fest", "cultural night", "sports meet"
    tone: str           # "fun", "professional", "energetic"
    date: Optional[str] = None
    venue: Optional[str] = None
    extra_details: Optional[str] = None
    brand: Optional[BrandIdentity] = None

class ContentResponse(BaseModel):
    instagram_caption: str
    whatsapp_announcement: str
    poster_text: str


# ── Campaign Planner ──────────────────────────────────────────────────────────
class CampaignRequest(BaseModel):
    event_type: str
    event_date: str                          # "March 15"
    venue: Optional[str] = ""
    extra_details: Optional[str] = ""
    brand: Optional[BrandIdentity] = None

class CampaignPhase(BaseModel):
    phase: str                               # "Teaser", "Hype Drop", etc.
    post_timing: str                         # "7 days before"
    instagram: str
    whatsapp: str
    poster_line: str

class CampaignResponse(BaseModel):
    phases: List[CampaignPhase]


# ── Caption Variants ──────────────────────────────────────────────────────────
class CaptionVariantsRequest(BaseModel):
    event_type: str
    date: Optional[str] = ""
    venue: Optional[str] = ""
    extra_details: Optional[str] = ""
    brand: Optional[BrandIdentity] = None

class CaptionVariant(BaseModel):
    style: str          # "hype", "minimal", "storytelling", "witty", "professional"
    label: str          # "🔥 Hype Mode"
    caption: str

class CaptionVariantsResponse(BaseModel):
    variants: List[CaptionVariant]


# ── Engagement Kit ────────────────────────────────────────────────────────────
class EngagementKitRequest(BaseModel):
    event_type: str
    date: Optional[str] = ""
    extra_details: Optional[str] = ""
    brand: Optional[BrandIdentity] = None

class PollQuestion(BaseModel):
    question: str
    options: List[str]

class QuizPost(BaseModel):
    question: str
    options: List[str]
    answer: str
    fun_fact: str

class EngagementKitResponse(BaseModel):
    polls: List[PollQuestion]
    story_prompts: List[str]
    quiz: QuizPost
    countdown_hook: str   # "3 days to go" teaser line


# ── Campus Map ───────────────────────────────────────────────────────────────
class CampusMapResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    knowledge_graph: Dict[str, Any]
    raw_description: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ── Budget status ─────────────────────────────────────────────────────────────
class BudgetStatus(BaseModel):
    daily_budget: float
    spent_today: float
    remaining_today: float
    monthly_budget: float
    spent_month: float
    remaining_month: float
    warning: Optional[str] = None
    transactions_today: List[TransactionResponse] = []
