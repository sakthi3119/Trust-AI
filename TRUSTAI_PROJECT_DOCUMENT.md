# TRUSTAI — Complete Project Document
### For Teammates | PPT Design Reference

---

## 1. What Is TRUSTAI?

TRUSTAI is a **full-stack, AI-powered smart campus assistant** built for college students to help them:
- Manage daily/monthly budgets on campus
- Get personalized activity/food/event recommendations
- Plan their free time intelligently
- Generate social media content for college clubs/events
- Chat with an AI that knows who they are (based on their behavioral profile)

The system is **explainable** — it always tells the user *why* it is recommending something, not just what.

Theme: **AMD Hackathon** — Real-time AI inference at the edge using Ollama (local LLM, no cloud required).

---

## 2. The Problem We Are Solving

| Problem | Our Solution |
|---|---|
| Students don't know where to spend their free time | AI-powered personalized recommendations |
| Budget gets exhausted without tracking | Smart Budget Guardian with daily/monthly tracking |
| Generic recommendations that don't match personal style | 7-step behavioral onboarding → LLM-analyzed persona |
| College club promoters struggle with social media content | AI Content Generator with brand kit |
| No awareness of campus layout for recommendations | Campus Blueprint upload → LLM Vision knowledge graph |
| Rigid AI that doesn't adapt | Optimization weights that evolve with the user |

---

## 3. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| API Framework | **FastAPI** (Python) |
| Database | **SQLite** via SQLAlchemy ORM |
| LLM (AI Brain) | **Ollama** – local inference, model: `llama3.2` |
| Vision LLM | **Ollama** – `llava` model for campus map vision analysis |
| Vector Search | **FAISS** + `sentence-transformers` (`all-MiniLM-L6-v2`) |
| Authentication | **JWT** (python-jose) + **bcrypt** password hashing |
| HTTP Client | **httpx** (async calls to Ollama) |

### Frontend
| Layer | Technology |
|---|---|
| Framework | **React 18** (Vite) |
| Routing | **React Router v6** |
| Styling | **Tailwind CSS** + custom Bauhaus design system |
| Icons | **Lucide React** |
| HTTP | **Axios** with JWT interceptor |
| Notifications | **react-hot-toast** |

### DevOps
- **Docker** + `docker-compose.yml` for containerized deployment
- Vite proxy: frontend `/api` → `localhost:8000`

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER (React SPA)                        │
│  Login → Register → Onboarding → [Home, Budget, Recs,          │
│           Planner, ContentGen, Profile]                         │
└────────────────────────┬────────────────────────────────────────┘
                         │  Axios + JWT (Bearer token)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend  :8000                        │
│  /api/auth      /api/onboarding    /api/chat                    │
│  /api/budget    /api/recommendations  /api/planner              │
│  /api/content   /api/campus                                     │
└────┬───────────────────┬───────────────────────────────────────┘
     │                   │
     ▼                   ▼
┌──────────┐      ┌──────────────────────────────────────────┐
│ SQLite   │      │  Services Layer                          │
│ Database │      │  ├── llm_service.py  ──► Ollama:11434   │
│          │      │  ├── faiss_service.py  (vector search)  │
│ users    │      │  ├── optimization_service.py             │
│ profiles │      │  ├── diversity_service.py                │
│ recs     │      │  └── budget_service.py                   │
│ campus_  │      └──────────────────────────────────────────┘
│  maps    │
│ txns     │
│ chats    │
│ dayplans │
└──────────┘
```

---

## 5. Database Schema (8 Tables)

### `users`
| Column | Type | Description |
|---|---|---|
| id | INT PK | Auto-increment |
| username | STRING | Unique login handle |
| email | STRING | Unique email |
| password_hash | STRING | bcrypt hashed |
| name | STRING | Display name |
| college_name | STRING | e.g. "VIT Vellore" |
| city | STRING | e.g. "Vellore" |
| daily_budget | FLOAT | ₹ per day limit |
| monthly_budget | FLOAT | ₹ per month limit |
| preferences | JSON | e.g. ["sports","cafe"] |
| is_onboarded | BOOL | Completed questionnaire? |
| avatar | TEXT | Base64 encoded profile photo |

### `user_profiles`
Stores LLM-analyzed behavioral data after onboarding.
| Column | Description |
|---|---|
| spending_style | `budget_conscious` / `balanced` / `free_spender` |
| activity_persona | `homebody` / `explorer` / `social_butterfly` / `achiever` |
| social_preference | `solo` / `small_group` / `large_group` / `mixed` |
| exploration_level | 1–5 integer |
| energy_level | `low` / `moderate` / `high` |
| top_categories | JSON list e.g. `["cafe","coding","sports"]` |
| personalization_summary | Plain text summary injected into every LLM system prompt |
| optimization_weights | JSON — per-user scoring weights for recommendations |

### `recommendations`
Master catalog of campus activities, food spots, events.
- Fields: name, category, sub_category, description, location, cost, duration_minutes, rating, tags, available_times, embedding_index

### `campus_maps`
Stores uploaded campus site map analysis.
- Fields: user_id, filename, knowledge_graph (JSON), raw_description

### `transactions`
Every spend logged by the user (food, event, activity, transport).

### `chat_messages`
Full chat history per user (role: user/assistant).

### `day_plans`
Saved day plans generated by the AI Planner.

---

## 6. Authentication System

- **Register** → POST `/api/auth/register` → returns JWT token
- **Login** → POST `/api/auth/login` → returns JWT token
- **Token** stored in `localStorage` under `trustai_token`
- All protected routes require `Authorization: Bearer <token>` header
- Token expiry: **7 days**
- Passwords hashed with **bcrypt** (salt rounds auto-generated)
- Frontend `AuthContext` provides `user`, `login()`, `register()`, `logout()`, `markOnboarded()` to the whole app

### Route Guard Logic
```
/ (any protected page)  →  is logged in? → is onboarded? → show page
                           no              → /login
                                           no → /onboarding
```

---

## 7. 7-Step Behavioral Onboarding

After registration the user completes a questionnaire:

| Step | Question | Type |
|---|---|---|
| 1 | College / Institution name | Text input with auto-city detection |
| 2 | City (auto-filled from college) | Text |
| 3 | Daily Budget (₹) | Slider + quick-pick buttons |
| 4 | Favourite Activities | Multi-select chips |
| 5 | Most Active Time | Single-select (Morning/Afternoon/Evening) |
| 6 | Social Style | Single-select (Solo/Small group/Large/Mixed) |
| 7 | Adventure Level | Slider 1–5 |

**After submission:**
- Answers sent to LLM (`llama3.2`) for behavioral analysis
- LLM returns: `spending_style`, `activity_persona`, `social_preference`, `energy_level`, `top_categories`, `personalization_summary`, `optimization_weights`
- All stored in `user_profiles` table
- `users.is_onboarded` set to `true`
- Redirect to Home dashboard

---

## 8. AI Chat (Home Page)

**What it does:** Conversational AI assistant that knows the user's behavioral profile.

**Flow:**
1. User sends message (e.g. "I have ₹200 and 2 hours free, suggest something")
2. `extract_intent_and_data()` — LLM extracts structured data (intent, budget, location, time_of_day, preferences)
3. `general_chat()` — LLM generates reply with user's `personalization_summary` injected into system prompt
4. Reply is cleaned of markdown artifacts (`_clean_text()`)
5. Conversation persisted in `chat_messages` table
6. Sent back to frontend with: `reply`, `intent`, `extracted_data`

**Features:**
- Full chat history (last 10 messages included as context)
- Per-user conversation (isolated by `user_id`)
- Clear history button
- AI knows: college, city, spending style, favorite activities, energy level

---

## 9. AI Recommendations Engine

**Endpoint:** POST `/api/recommendations`

**Pipeline (5-step):**

```
Step 1: FAISS Semantic Search
   ↓  Query = "preferences + location + time_of_day"
   ↓  Returns top-20 semantically similar recommendations
   
Step 2: Budget Filter
   ↓  Remove all items where cost > user's budget
   ↓  Graceful fallback: if 0 match, return top-10 anyway
   
Step 3: Location Validation  ← NEW FEATURE
   ↓  _location_matches() checks campus area relevance
   ↓  Uses: substring match, campus_areas from blueprint, word overlap
   ↓  Only applies if ≥ 3 results survive (no over-filtering)
   
Step 4: Anti-Filter-Bubble Diversity Scoring
   ↓  diversity_service penalizes items in same category as recent history
   ↓  Ensures variety across sessions
   
Step 5: Optimization Scoring
   ↓  optimization_service scores each item:
      - budget_weight: how well it fits the budget
      - preference_weight: matches user's top_categories
      - time_weight: available at requested time_of_day
      - proximity_weight: near requested location
      - diversity_weight: different from recent history
   ↓  Custom weights per user (from optimization_weights in profile)
   ↓  LLM generates explanation for top pick
```

**FAISS Vector Search:**
- `sentence-transformers/all-MiniLM-L6-v2` embeds all recommendations into 384-dim vectors
- FAISS Inner Product (cosine similarity after normalization)
- Falls back to char-level BoW if sentence-transformers unavailable

**Output per recommendation:**
```json
{
  "name": "...",
  "category": "food|activity|event",
  "cost": 150.0,
  "location": "Canteen Block A",
  "duration_minutes": 45,
  "score_breakdown": {"budget_weight": 85, "preference": 72, ...},
  "explanation": "Recommended because you prefer cafés and have ₹200..."
}
```

---

## 10. AI Day Planner

**Endpoint:** POST `/api/planner/generate`

User inputs: free time window (e.g. 3 PM – 8 PM), budget (e.g. ₹400)

**Algorithm:**
1. Determines time-of-day from start hour
2. Iterates through categories in order: Food → Activity → Event
3. For each category: selects best-scoring item that fits remaining budget AND remaining time
4. Builds timeline with start/end times per item
5. LLM generates a natural language narrative for the plan
6. Plan saved to `day_plans` table

**Output:**
- Ordered list of items with exact times (e.g. "3:00 PM – 3:45 PM: Café lunch")
- Total cost, total duration
- AI-generated narrative explanation
- History of past plans

---

## 11. Budget Guardian

**Endpoints:** `/api/budget/status`, `/api/budget/transaction`, `/api/budget/check`

**Features:**
- Tracks all transactions with category (food/event/activity/transport)
- Daily budget tracking: today's spend vs. daily limit
- Monthly budget tracking: this month's spend vs. monthly limit
- Budget check: before adding a transaction, `is_within_budget()` returns whether it fits
- Real-time status: remaining daily budget, remaining monthly budget, percentage used
- Visual dashboard with:
  - Progress bars for daily and monthly usage
  - Recent transaction list
  - Category breakdown
  - Quick-add transaction form

---

## 12. AI Content Generator (for Club Promoters)

**Endpoint:** POST `/api/content/generate` (and 3 more)

**4 Generation Modes:**

| Mode | What it does | Endpoint |
|---|---|---|
| **Post Generator** | Full social media post (Instagram/WhatsApp) with caption, hashtags, emojis | `/content/generate` |
| **Campaign Planner** | 5-phase promotional campaign (teaser→launch→countdown→day-of→recap) | `/content/campaign` |
| **Caption Variants** | 5 different caption styles for same event (hype/informational/FOMO/fun/formal) | `/content/caption-variants` |
| **Engagement Kit** | Polls, story Q&A prompts, quiz questions, countdown hooks | `/content/engagement-kit` |

**Brand Kit (per user, localStorage):**
- Club name, primary color, secondary color, tagline, font style
- Injected into every generation prompt for consistent branding
- **Scoped per user**: stored as `trustai_brand_kit_{userId}` — different users get different brand kits

**Inputs:** Event type, tone (Hype/Professional/Fun/Formal/Emotional), date, venue, extra details

---

## 13. Profile Page

**Features:**
- **Two-column responsive layout** (`max-w-6xl`, `lg:grid-cols-3`)
- **Left column:**
  - Profile photo upload (stores as base64 on user record, max 2 MB)
  - AI Persona card (shows personalization_summary + behavioral tags)
  - Campus Blueprint upload (site map → LLM vision knowledge graph)
  - AI Optimization Weights visualization (bar charts per weight)
- **Right column:**
  - Institution & Location editor (college name + city)
  - Budget sliders (daily + monthly) with quick-pick buttons
  - Behaviour & Preferences editor (same chips as onboarding)
  - Campus Areas chips (augmented with blueprint-detected areas)
- **Live change detection:** Any unsaved change highlighted per section
- **Behaviour-change detection:** Changing a behavior field triggers LLM re-analysis on save
- **Floating save bar** appears at bottom when unsaved changes exist
- **Auto-city detection** from college name

---

## 14. Campus Blueprint Feature

**What it is:** Users can upload an image of their college site map / campus blueprint. The AI extracts a structured knowledge graph from it.

**Upload Flow:**
1. User uploads JPEG/PNG/WebP image (max 10 MB) via Profile page
2. Backend converts to Base64
3. LLM Vision called — tries `llava` first (multimodal), falls back to `llama3.2` text analysis
4. LLM extracts knowledge graph:
```json
{
  "areas": ["Main Gate", "Library Block", "Sports Complex", "Canteen", ...],
  "food_spots": ["Canteen A", "Coffee Kiosk"],
  "academic_blocks": ["Block A", "Block B"],
  "sports_facilities": ["Football Ground", "Gym"],
  "hostels": ["Men's Hostel", "Ladies Hostel"],
  "entry_points": ["Main Gate", "North Gate"],
  "description": "A sprawling campus with..."
}
```
5. Stored in `campus_maps` table
6. Areas shown as chips on Profile page (with count preview)
7. **Used actively in Recommendations**: `_location_matches()` cross-references recommendation locations against blueprint areas
8. **Used in Behaviour editor**: Campus areas chips are pre-populated from blueprint

---

## 15. Frontend Pages Summary

| Page | Route | Description |
|---|---|---|
| **Login** | `/login` | Bauhaus split-screen, username + password |
| **Register** | `/register` | Full name, username, email, password |
| **Onboarding** | `/onboarding` | 7-step questionnaire, progress bar |
| **Home** | `/` | AI Chat interface, full conversation history |
| **Budget** | `/budget` | Dashboard, transactions, progress bars |
| **Recommendations** | `/recommendations` | Filters → FAISS search → scored cards with explanations |
| **Planner** | `/planner` | Free-time window + budget → AI-generated day plan |
| **Content Gen** | `/content` | 4-mode generator, brand kit manager |
| **Profile** | `/profile` | 2-col layout, avatar, campus map, behavior editors |

---

## 16. Design System

All pages use a consistent **Bauhaus-inspired design system**:

| Element | Style |
|---|---|
| Primary Red | `#D02020` — CTA buttons, accents |
| Primary Blue | `#1040C0` — info cards, links |
| Yellow | `#F0C020` — warnings, highlights |
| Background | `#F0F0F0` — off-white |
| Black | `#121212` — borders, shadows |
| Shadows | Hard offset `n px n px 0 0 #121212` (no blur) |
| Borders | `border-4 border-black` everywhere |
| Typography | `font-black`, `uppercase`, `tracking-tighter` |
| Inputs | `.input` class: 2px black border, no border-radius |
| Buttons | `.btn-primary` (red), `.btn-blue` (blue) — hard shadows |
| Cards | White + 4px black border + 8px 8px hard shadow |

---

## 17. API Reference (Quick)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register → JWT |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/onboarding/submit` | Submit questionnaire → LLM analysis |
| GET | `/api/onboarding/profile` | Get full behavioral profile |
| PATCH | `/api/onboarding/update` | Update profile fields |
| POST | `/api/chat` | Send message → AI reply |
| GET | `/api/chat/history` | Conversation history |
| POST | `/api/recommendations` | Get personalized recommendations |
| GET | `/api/recommendations/all` | Raw recommendation catalog |
| GET | `/api/budget/status` | Budget usage |
| POST | `/api/budget/transaction` | Log a spend |
| GET | `/api/budget/check?amount=X` | Can I afford X? |
| POST | `/api/planner/generate` | Generate day plan |
| GET | `/api/planner/history` | Past day plans |
| POST | `/api/content/generate` | Social media post |
| POST | `/api/content/campaign` | 5-phase campaign |
| POST | `/api/content/caption-variants` | 5 caption styles |
| POST | `/api/content/engagement-kit` | Polls, Q&A, quiz |
| POST | `/api/campus/upload` | Upload campus site map |
| GET | `/api/campus/map` | Get campus knowledge graph |
| DELETE | `/api/campus/map` | Remove campus map |
| POST | `/api/campus/avatar` | Upload profile photo |
| GET | `/api/campus/avatar` | Get profile photo |

---

## 18. Key AI / ML Components

| Component | Technology | Purpose |
|---|---|---|
| **Behavioral Analysis** | Ollama `llama3.2` | Analyzes 7-step onboarding → builds persona |
| **Personalized Chat** | Ollama `llama3.2` | System prompt injected with persona summary |
| **Intent Extraction** | Ollama `llama3.2` | Extracts intent/budget/preferences from free text |
| **Rec Explanation** | Ollama `llama3.2` | Generates "why I recommended this" for each pick |
| **Semantic Search** | FAISS + `all-MiniLM-L6-v2` | Nearest-neighbor search in recommendations |
| **Diversity Scoring** | Custom algorithm | Penalizes same-category repeats (anti-bubble) |
| **Optimization Scoring** | Weighted multi-factor | Per-user weights × 5 factors → ranked list |
| **Vision Analysis** | Ollama `llava` | Parses campus map image → knowledge graph |
| **Content Generation** | Ollama `llama3.2` | Social posts, campaigns, captions, engagement kits |
| **Plan Narration** | Ollama `llama3.2` | Converts day plan list → natural language description |

---

## 19. What Makes It "Explainable AI"

- Every recommendation comes with a **score breakdown** (5 factors, each as a percentage) and a **natural language explanation**
- The AI chat always explains the reasoning behind suggestions
- The Profile page shows **optimization weights** as visual bar charts so users can see exactly how the AI is weighing their preferences
- Behavior changes on Profile trigger a **visible re-analysis notification** before saving
- The system never just says "here's a result" — it says "here's why"

---

## 20. Features Completed (Full Status)

✅ User Authentication (register, login, JWT, bcrypt)  
✅ 7-Step Behavioral Onboarding + LLM Analysis  
✅ Personalized AI Chat with full history  
✅ FAISS Semantic Recommendations  
✅ Budget Filter in Recommendations  
✅ Location validation using campus blueprint areas  
✅ Anti-filter-bubble diversity scoring  
✅ Per-user optimization weights  
✅ LLM Explanation per recommendation  
✅ AI Day Planner (time-boxed, budget-aware)  
✅ Budget Guardian (daily + monthly tracking)  
✅ AI Content Generator (4 modes)  
✅ Brand Kit (per-user, localStorage)  
✅ Campus Blueprint Upload + LLM Vision Knowledge Graph  
✅ Profile Photo Upload (base64 storage)  
✅ Profile Page — 2-column layout, behavior editors  
✅ Auto-city detection from college name  
✅ Behavior re-analysis on profile update  
✅ Bauhaus design system across all pages  
✅ Docker support  
✅ Auto-migration on startup (DB schema evolves safely)

---

## 21. Project File Structure

```
AMD/
├── backend/
│   ├── main.py              # FastAPI app, router registration, auto-migrate
│   ├── models.py            # SQLAlchemy ORM models (8 tables)
│   ├── schemas.py           # Pydantic request/response models
│   ├── database.py          # SQLite connection, get_db()
│   ├── auth_utils.py        # JWT, bcrypt, get_current_user()
│   ├── config.py            # Settings (Ollama URL, model name)
│   ├── migrate.py           # DB migration utility
│   ├── routers/
│   │   ├── auth.py          # Register, login, /me
│   │   ├── onboarding.py    # 7-step submit, profile GET/PATCH
│   │   ├── chat.py          # AI chat with history
│   │   ├── budget.py        # Transactions, status, check
│   │   ├── recommendations.py  # FAISS → filter → score → explain
│   │   ├── planner.py       # Day plan generation
│   │   ├── content.py       # 4-mode content generator
│   │   └── campus.py        # Avatar upload, campus map upload/get/delete
│   ├── services/
│   │   ├── llm_service.py   # All Ollama calls (chat, analyze, generate, vision)
│   │   ├── faiss_service.py # FAISS build/search + sentence-transformer embedding
│   │   ├── optimization_service.py  # Multi-factor scoring algorithm
│   │   ├── diversity_service.py     # Anti-bubble diversity scoring
│   │   └── budget_service.py        # Budget calculation logic
│   └── data/
│       └── seed_data.py     # Seeder for recommendations catalog
│
├── frontend/src/
│   ├── App.jsx              # Routes + auth guards
│   ├── context/
│   │   └── AuthContext.jsx  # Global auth state (user, token, login, logout)
│   ├── api/
│   │   └── client.js        # Axios instance + all API call exports
│   ├── pages/
│   │   ├── Login.jsx        # Login page
│   │   ├── Register.jsx     # Registration page
│   │   ├── Onboarding.jsx   # 7-step onboarding flow
│   │   ├── Home.jsx         # AI Chat interface
│   │   ├── Budget.jsx       # Budget dashboard
│   │   ├── Recommendations.jsx  # Recommendations with filters
│   │   ├── Planner.jsx      # Day planner
│   │   ├── ContentGen.jsx   # Content generator + brand kit
│   │   └── Profile.jsx      # User profile + campus map
│   └── components/
│       ├── Layout.jsx       # Sidebar navigation
│       ├── ProtectedRoute.jsx
│       ├── ChatInterface.jsx
│       ├── RecommendationCard.jsx
│       ├── BudgetDashboard.jsx
│       ├── DayPlanner.jsx
│       ├── ContentGenerator.jsx
│       └── ExplanationModal.jsx
│
├── docker-compose.yml       # Full stack containerized deployment
└── README.md
```

---

## 22. How to Run (for teammates)

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) installed and running: `ollama serve`
- Models pulled: `ollama pull llama3.2` and `ollama pull llava`

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python migrate.py              # Set up DB schema
python data/seed_data.py       # Seed recommendations catalog
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

---

*Document auto-generated from codebase — February 2026*
