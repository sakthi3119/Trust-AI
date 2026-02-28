from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, default="Student")
    college_name = Column(String, default="")
    city = Column(String, default="")
    daily_budget = Column(Float, default=500.0)
    monthly_budget = Column(Float, default=10000.0)
    preferences = Column(JSON, default=list)        # auto-populated from onboarding
    location = Column(String, default="Main Campus")
    is_onboarded = Column(Boolean, default=False)   # True after completing questionnaire
    avatar = Column(Text, default="")               # base64 encoded avatar image
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    day_plans = relationship("DayPlan", back_populates="user")
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    campus_map = relationship("CampusMap", back_populates="user", uselist=False)


class UserProfile(Base):
    """Stores LLM-analyzed behavioral profile from onboarding questionnaire."""
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)

    # Raw onboarding answers (JSON)
    onboarding_answers = Column(JSON, default=dict)

    # LLM-analyzed traits
    spending_style = Column(String, default="balanced")         # budget_conscious | balanced | free_spender
    activity_persona = Column(String, default="explorer")       # homebody | explorer | social_butterfly | achiever
    social_preference = Column(String, default="mixed")         # solo | small_group | large_group | mixed
    exploration_level = Column(Integer, default=3)              # 1-5: 1=stick to fav, 5=love new things
    energy_level = Column(String, default="moderate")           # low | moderate | high
    top_categories = Column(JSON, default=list)                 # ["cafe","sports","music"]
    personalization_summary = Column(Text, default="")         # plain-text persona description for system prompt
    optimization_weights = Column(JSON, default=dict)           # overrides scoring weights
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=1)
    amount = Column(Float)
    category = Column(String)       # food, event, activity, transport
    description = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    date = Column(String)           # "2025-02-24"

    user = relationship("User", back_populates="transactions")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String)       # food, event, activity
    sub_category = Column(String)   # cafe, sports, music, cultural
    description = Column(Text)
    location = Column(String)
    cost = Column(Float)
    duration_minutes = Column(Integer, default=60)
    rating = Column(Float, default=4.0)
    tags = Column(JSON, default=list)
    available_times = Column(JSON, default=list)   # ["morning","afternoon","evening"]
    embedding_index = Column(Integer, nullable=True)  # FAISS index


class CampusMap(Base):
    """Stores user-uploaded campus site map and LLM-extracted knowledge graph."""
    __tablename__ = "campus_maps"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    filename = Column(String, default="")
    knowledge_graph = Column(JSON, default=dict)   # {areas, facilities, food_spots, shortcuts}
    raw_description = Column(Text, default="")     # plain-text description from LLM vision
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="campus_map")


class ChatSession(Base):
    """A named conversation thread — like ChatGPT's sidebar entries."""
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=1)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=True)
    role = Column(String)           # "user" | "assistant"
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    context_data = Column(JSON, nullable=True)

    user = relationship("User", back_populates="chat_messages")
    session = relationship("ChatSession", back_populates="messages")


class DayPlan(Base):
    __tablename__ = "day_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=1)
    plan_date = Column(String)
    total_cost = Column(Float)
    total_duration = Column(Integer)
    items = Column(JSON)            # list of recommendation ids with time slots
    explanation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="day_plans")
