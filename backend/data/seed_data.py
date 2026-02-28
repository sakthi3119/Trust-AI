"""
Seed script – populates the database with dummy data and builds the FAISS index.
Run: python data/seed_data.py   (from the backend/ directory)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
import models
from services import faiss_service

models.Base.metadata.create_all(bind=engine)

# ── Sample Recommendations ────────────────────────────────────────────────────
RECOMMENDATIONS = [
    # ── Food ─────────────────────────────────────────────────────────────────
    {
        "name": "Campus Café Sunrise",
        "category": "food",
        "sub_category": "cafe",
        "description": "Cozy café with great filter coffee, sandwiches and quiet study corners.",
        "location": "Library Block",
        "cost": 80.0,
        "duration_minutes": 30,
        "rating": 4.5,
        "tags": ["cafe", "coffee", "study", "snacks", "quiet"],
        "available_times": ["morning", "afternoon", "evening"],
    },
    {
        "name": "Noodle Hub",
        "category": "food",
        "sub_category": "fast_food",
        "description": "Quick noodles and momos stall near the main gate. Popular post-class spot.",
        "location": "Main Campus",
        "cost": 60.0,
        "duration_minutes": 20,
        "rating": 4.2,
        "tags": ["noodles", "momo", "quick", "budget", "spicy"],
        "available_times": ["afternoon", "evening"],
    },
    {
        "name": "The Green Plate",
        "category": "food",
        "sub_category": "healthy",
        "description": "Healthy salad bowls, fresh juices, and protein wraps. Great for fitness-conscious students.",
        "location": "Sports Complex",
        "cost": 120.0,
        "duration_minutes": 25,
        "rating": 4.3,
        "tags": ["healthy", "salad", "juice", "fitness", "protein"],
        "available_times": ["morning", "afternoon"],
    },
    {
        "name": "Biryani Corner",
        "category": "food",
        "sub_category": "restaurant",
        "description": "Authentic Hyderabadi biryani and kebabs. Best lunch spot on campus.",
        "location": "Canteen",
        "cost": 150.0,
        "duration_minutes": 40,
        "rating": 4.7,
        "tags": ["biryani", "lunch", "spicy", "filling", "value"],
        "available_times": ["afternoon"],
    },
    {
        "name": "Chai Tapri",
        "category": "food",
        "sub_category": "cafe",
        "description": "Famous cutting chai and bun maska. Go-to for an evening break with friends.",
        "location": "Hostel",
        "cost": 30.0,
        "duration_minutes": 20,
        "rating": 4.6,
        "tags": ["chai", "tea", "snacks", "cheap", "social"],
        "available_times": ["morning", "evening"],
    },
    {
        "name": "Pizza Stop",
        "category": "food",
        "sub_category": "fast_food",
        "description": "Mini pizza slices and garlic bread. Perfect for quick energy between classes.",
        "location": "Main Campus",
        "cost": 90.0,
        "duration_minutes": 15,
        "rating": 4.1,
        "tags": ["pizza", "fast_food", "cheese", "quick", "snacks"],
        "available_times": ["afternoon", "evening"],
    },
    # ── Activities ───────────────────────────────────────────────────────────
    {
        "name": "Basketball Practice",
        "category": "activity",
        "sub_category": "sports",
        "description": "Open court basketball sessions. Bring your own water bottle. All skill levels welcome.",
        "location": "Sports Complex",
        "cost": 0.0,
        "duration_minutes": 60,
        "rating": 4.4,
        "tags": ["basketball", "sports", "fitness", "team", "free"],
        "available_times": ["morning", "evening"],
    },
    {
        "name": "Campus Library Study Session",
        "category": "activity",
        "sub_category": "academic",
        "description": "Quiet study environment with fast Wi-Fi, free printing (5 pages/day), and reference books.",
        "location": "Library Block",
        "cost": 0.0,
        "duration_minutes": 120,
        "rating": 4.5,
        "tags": ["study", "library", "quiet", "academic", "free"],
        "available_times": ["morning", "afternoon", "evening"],
    },
    {
        "name": "Yoga & Mindfulness",
        "category": "activity",
        "sub_category": "wellness",
        "description": "Guided yoga sessions on the campus lawn. Reduces stress, improves focus.",
        "location": "Main Campus",
        "cost": 50.0,
        "duration_minutes": 45,
        "rating": 4.6,
        "tags": ["yoga", "wellness", "mindfulness", "health", "relaxation"],
        "available_times": ["morning"],
    },
    {
        "name": "Hackathon Prep Workshop",
        "category": "activity",
        "sub_category": "academic",
        "description": "Weekly coding sprint and resume/portfolio workshop organized by the CS club.",
        "location": "Main Campus",
        "cost": 0.0,
        "duration_minutes": 90,
        "rating": 4.4,
        "tags": ["coding", "hackathon", "tech", "academic", "club", "free"],
        "available_times": ["afternoon", "evening"],
    },
    {
        "name": "Photography Walk",
        "category": "activity",
        "sub_category": "creative",
        "description": "Campus photography club's guided walk. Learn composition and editing tricks.",
        "location": "Main Campus",
        "cost": 20.0,
        "duration_minutes": 75,
        "rating": 4.3,
        "tags": ["photography", "creative", "art", "walk", "club"],
        "available_times": ["morning", "afternoon"],
    },
    {
        "name": "Swimming Pool Session",
        "category": "activity",
        "sub_category": "sports",
        "description": "Campus pool access. Lanes available for lap swimming and recreational use.",
        "location": "Sports Complex",
        "cost": 40.0,
        "duration_minutes": 60,
        "rating": 4.5,
        "tags": ["swimming", "sports", "fitness", "water", "cool"],
        "available_times": ["morning", "afternoon"],
    },
    {
        "name": "Board Games Club",
        "category": "activity",
        "sub_category": "social",
        "description": "Chess, Catan, Uno and more. Great way to de-stress and make new friends.",
        "location": "Hostel",
        "cost": 0.0,
        "duration_minutes": 60,
        "rating": 4.2,
        "tags": ["games", "social", "chess", "fun", "indoor", "free"],
        "available_times": ["afternoon", "evening"],
    },
    # ── Events ───────────────────────────────────────────────────────────────
    {
        "name": "Tech Fest 2025",
        "category": "event",
        "sub_category": "tech",
        "description": "Annual technology fest with hackathons, robotics showcase, and industry talks. Registration required.",
        "location": "Auditorium",
        "cost": 100.0,
        "duration_minutes": 240,
        "rating": 4.8,
        "tags": ["tech", "hackathon", "robotics", "networking", "annual"],
        "available_times": ["morning", "afternoon"],
    },
    {
        "name": "Cultural Night",
        "category": "event",
        "sub_category": "cultural",
        "description": "Annual cultural celebration with music, dance, drama, and food stalls from across India.",
        "location": "Auditorium",
        "cost": 80.0,
        "duration_minutes": 180,
        "rating": 4.7,
        "tags": ["music", "dance", "drama", "cultural", "festival"],
        "available_times": ["evening"],
    },
    {
        "name": "Open Mic Night",
        "category": "event",
        "sub_category": "music",
        "description": "Student-performed stand-up comedy, poetry, and live music. Free entry.",
        "location": "Auditorium",
        "cost": 0.0,
        "duration_minutes": 120,
        "rating": 4.5,
        "tags": ["music", "comedy", "poetry", "open_mic", "social", "free"],
        "available_times": ["evening"],
    },
    {
        "name": "Inter-College Sports Meet",
        "category": "event",
        "sub_category": "sports",
        "description": "Thrilling inter-college competitions in cricket, football, and athletics.",
        "location": "Sports Complex",
        "cost": 50.0,
        "duration_minutes": 300,
        "rating": 4.6,
        "tags": ["sports", "cricket", "football", "competition", "inter-college"],
        "available_times": ["morning", "afternoon"],
    },
    {
        "name": "Startup Pitch Competition",
        "category": "event",
        "sub_category": "tech",
        "description": "Present your startup idea to a panel of VCs and alumni. Cash prizes for top 3.",
        "location": "Auditorium",
        "cost": 0.0,
        "duration_minutes": 180,
        "rating": 4.7,
        "tags": ["startup", "entrepreneurship", "pitch", "prize", "networking"],
        "available_times": ["afternoon"],
    },
    {
        "name": "Art Exhibition",
        "category": "event",
        "sub_category": "creative",
        "description": "Student artworks across painting, sculpture, and digital art. Free entry.",
        "location": "Library Block",
        "cost": 0.0,
        "duration_minutes": 90,
        "rating": 4.3,
        "tags": ["art", "painting", "creative", "exhibition", "culture", "free"],
        "available_times": ["morning", "afternoon", "evening"],
    },
    {
        "name": "Guest Lecture: AI in Healthcare",
        "category": "event",
        "sub_category": "academic",
        "description": "Industry expert talk on AI applications in modern healthcare. Q&A session included.",
        "location": "Auditorium",
        "cost": 0.0,
        "duration_minutes": 90,
        "rating": 4.5,
        "tags": ["AI", "healthcare", "lecture", "tech", "academic", "free"],
        "available_times": ["afternoon"],
    },
]

# ── Sample Transactions ────────────────────────────────────────────────────────
SAMPLE_TRANSACTIONS = [
    {"amount": 80.0,  "category": "food",      "description": "Campus Café Sunrise – coffee"},
    {"amount": 60.0,  "category": "food",      "description": "Noodle Hub – lunch"},
    {"amount": 50.0,  "category": "activity",  "description": "Yoga session"},
    {"amount": 100.0, "category": "event",     "description": "Tech Fest registration"},
]


def seed():
    db = SessionLocal()
    try:
        # ── Recommendations ───────────────────────────────────────────────────
        existing = db.query(models.Recommendation).count()
        if existing == 0:
            rec_objects = []
            for i, r in enumerate(RECOMMENDATIONS):
                obj = models.Recommendation(
                    name=r["name"],
                    category=r["category"],
                    sub_category=r["sub_category"],
                    description=r["description"],
                    location=r["location"],
                    cost=r["cost"],
                    duration_minutes=r["duration_minutes"],
                    rating=r["rating"],
                    tags=r["tags"],
                    available_times=r["available_times"],
                    embedding_index=i,
                )
                db.add(obj)
                rec_objects.append(obj)
            db.commit()
            for obj in rec_objects:
                db.refresh(obj)
            print(f"[OK] {len(rec_objects)} recommendations created")

            # ── Build FAISS index ─────────────────────────────────────────────
            rec_dicts = [
                {
                    "id": obj.id,
                    "name": obj.name,
                    "category": obj.category,
                    "sub_category": obj.sub_category,
                    "description": obj.description,
                    "location": obj.location,
                    "cost": obj.cost,
                    "duration_minutes": obj.duration_minutes,
                    "rating": obj.rating,
                    "tags": obj.tags or [],
                    "available_times": obj.available_times or [],
                }
                for obj in rec_objects
            ]
            faiss_service.build_index(rec_dicts)
            print("[OK] FAISS index built")
        else:
            print(f"[INFO] {existing} recommendations already in DB -- skipped")

        print("\nSeed complete! No default users -- each user registers individually.")
        print("   Run: uvicorn main:app --reload --port 8000")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
