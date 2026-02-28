# TRUSTAI – Explainable AI Assistant for Smart Campus Life

> Hackathon Prototype | React + FastAPI + PostgreSQL + FAISS + Ollama

---

## Folder Structure

```
AMD/
├── backend/
│   ├── main.py                    # FastAPI app entry
│   ├── config.py                  # Settings (env vars)
│   ├── database.py                # SQLAlchemy engine + session
│   ├── models.py                  # DB models
│   ├── schemas.py                 # Pydantic schemas
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env                       # Environment variables
│   ├── routers/
│   │   ├── chat.py                # /api/chat
│   │   ├── budget.py              # /api/budget
│   │   ├── recommendations.py     # /api/recommendations
│   │   ├── planner.py             # /api/planner
│   │   └── content.py             # /api/content
│   ├── services/
│   │   ├── llm_service.py         # Ollama integration
│   │   ├── faiss_service.py       # FAISS vector search
│   │   ├── budget_service.py      # Budget Guardian logic
│   │   ├── optimization_service.py# Multi-constraint scoring
│   │   └── diversity_service.py   # Anti-filter bubble
│   └── data/
│       └── seed_data.py           # 20 dummy recommendations + transactions
├── frontend/
│   ├── src/
│   │   ├── api/client.js          # Axios API wrapper
│   │   ├── components/
│   │   │   ├── Layout.jsx         # Sidebar nav layout
│   │   │   ├── ChatInterface.jsx  # Conversational UI
│   │   │   ├── BudgetDashboard.jsx
│   │   │   ├── RecommendationCard.jsx
│   │   │   ├── ExplanationModal.jsx  # Score radar + breakdown
│   │   │   ├── DayPlanner.jsx
│   │   │   └── ContentGenerator.jsx
│   │   └── pages/
│   │       ├── Home.jsx           # Chat
│   │       ├── Budget.jsx
│   │       ├── Recommendations.jsx
│   │       ├── Planner.jsx
│   │       └── ContentGen.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── docker-compose.yml
```

---

## Quick Start (Local – Recommended for Hackathon)

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | python.org |
| Node.js | 20+ | nodejs.org |
| PostgreSQL | 16+ | postgresql.org |
| Ollama | latest | ollama.ai |

---

### Step 1 – Start Ollama

```bash
# Pull a model (llama3.2 is small and fast)
ollama pull llama3.2

# Start Ollama server (usually runs automatically)
ollama serve
```

---

### Step 2 – Set up PostgreSQL

```bash
# Create DB and user (run in psql)
CREATE USER trustai WITH PASSWORD 'trustai123';
CREATE DATABASE trustai_db OWNER trustai;
GRANT ALL PRIVILEGES ON DATABASE trustai_db TO trustai;
```

---

### Step 3 – Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Seed the database + build FAISS index
python data/seed_data.py

# Start the API server
uvicorn main:app --reload --port 8000
```

API docs → http://localhost:8000/docs

---

### Step 4 – Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Open → http://localhost:5173

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Send message, get AI reply |
| GET | /api/chat/history | Fetch chat history |
| GET | /api/budget/status | Get budget overview |
| POST | /api/budget/transaction | Add a transaction |
| GET | /api/budget/check?amount=X | Pre-flight budget check |
| PUT | /api/budget/settings | Update daily/monthly budget |
| POST | /api/recommendations | Get ranked recommendations |
| GET | /api/recommendations/all | List all items |
| POST | /api/planner/generate | Generate a day plan |
| GET | /api/planner/history | Saved plans |
| POST | /api/content/generate | Generate club content |

---

## Core Features Explained

### Budget Guardian
- Stores daily transactions in PostgreSQL
- `is_within_budget()` checks remaining balance before suggesting items
- Warning banners at 85% daily spend and 90% monthly spend

### Multi-Constraint Optimization Engine
Scores every recommendation with weighted criteria:

| Criterion | Weight | How it's computed |
|-----------|--------|-------------------|
| Budget Fit | 30% | Cost/budget ratio sweet-spot curve |
| Preference Match | 25% | Jaccard overlap: item tags ∩ user prefs |
| Time Feasibility | 20% | Duration vs free window + time-of-day fit |
| Proximity | 15% | Campus location distance graph |
| Diversity Score | 10% | Injected by Anti-Filter Bubble service |

### Anti-Filter Bubble
- Tracks the last 10 sub-categories recommended
- If any category > 50% of recent history → marked repetitive
- Diversity score penalises over-recommended categories
- `ensure_category_diversity()` guarantees ≥2 distinct categories in results

### Explanation Layer
For every recommendation, the UI provides:
- **Contribution percentages** (score breakdown bars)
- **Radar chart** of all five scoring dimensions
- **Natural language explanation** generated by the local LLM
- **Why alternatives were rejected** (passed to LLM prompt)

### Mini Day Planner
- Greedy algorithm: picks the best food → activity → event
- Respects remaining budget and time window
- Adds 15-min buffer between activities
- Generates LLM summary of the whole plan

### Club Content Generator
- Sends event details to Ollama
- Returns Instagram caption (with hashtags), WhatsApp announcement, and poster text
- One-click copy for each output

---

## Docker Compose (Alternative)

```bash
docker compose up --build
```

> Note: Ollama must run on the host machine; the backend reaches it via `host.docker.internal:11434`.

---

## Changing the LLM Model

Edit `backend/.env`:

```env
OLLAMA_MODEL=llama3.2       # default (fast, ~2GB)
# OLLAMA_MODEL=mistral      # better quality, ~4GB
# OLLAMA_MODEL=gemma2:2b    # very fast, ~1.4GB
```

Then restart the backend.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `[LLM Error] Could not reach Ollama` | Run `ollama serve` in a terminal |
| `FAISS index empty` | Run `python data/seed_data.py` |
| `connection refused` on PostgreSQL | Check DB is running, credentials match `.env` |
| Frontend shows no data | Verify backend is on port 8000 and CORS allows 5173 |

---

## Tech Stack Summary

```
Frontend   React 18 + Vite + Tailwind CSS + Recharts + Framer Motion
Backend    FastAPI + SQLAlchemy + Pydantic
Database   PostgreSQL 16
Vector DB  FAISS (faiss-cpu) + sentence-transformers (all-MiniLM-L6-v2)
LLM        Ollama (local) – llama3.2 by default
```
