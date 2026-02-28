# TrustAI – Smart Campus Life Assistant

This is our hackathon project. It's an AI-powered assistant built specifically for college students that helps with budgeting, activity recommendations, day planning, and club content generation – all running locally with no paid APIs.

The idea came from a pretty common problem: students don't really know how to manage their time and money on campus. Most existing apps are either too generic or just show ads. We wanted something that actually understands a student's context – their budget, free time, preferences, and campus location – and gives useful suggestions with proper reasoning behind it.

---

## What it does

**Chat interface** – Talk to the AI like you'd chat with a friend. Ask things like "I have ₹150 and 2 hours free, what should I do?" and it gives a proper answer based on your profile.

**Budget Guardian** – Tracks your daily and monthly spending. Before suggesting anything, it checks if you can actually afford it. Shows warnings when you're close to your limit.

**Smart Recommendations** – Doesn't just show random stuff. Each recommendation is scored based on 5 things: how affordable it is, how much it matches your interests, whether you have time for it, how close it is on campus, and a diversity score so it doesn't keep recommending the same category over and over.

**Day Planner** – Generates a full plan for your free window (food → activity → event) that fits within your remaining budget and time.

**Content Generator** – Useful for club secretaries. Give it your event details and it generates an Instagram caption, WhatsApp announcement, and poster text. Saves a lot of time honestly.

**Explanation Layer** – Every recommendation shows a score breakdown and a radar chart so you can see *why* it was suggested. The LLM also writes a short natural language explanation for each one.

---

## Tech stack

- Frontend: React 18 + Vite + Tailwind CSS
- Backend: FastAPI + SQLAlchemy + Pydantic
- Database: SQLite (switched from PostgreSQL to keep setup simple)
- Vector search: FAISS + sentence-transformers (all-MiniLM-L6-v2)
- LLM: Ollama – running llama3.2 locally (no API key, no cost)
- Auth: JWT tokens with bcrypt

---

## How to run it locally

You need Python 3.11+, Node.js 20+, and Ollama installed first.

### 1. Get Ollama running

```bash
ollama pull llama3.2
ollama serve
```

llama3.2 is about 2GB. If you want better responses and have RAM to spare, you can use mistral instead – just change `OLLAMA_MODEL=mistral` in the `.env` file.

### 2. Backend

```bash
cd backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt

# this seeds the database and builds the FAISS index
python data/seed_data.py

uvicorn main:app --reload --port 8000
```

Swagger docs will be at http://localhost:8000/docs if you want to test the APIs directly.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

That's it. Register an account, go through the onboarding (it asks about your preferences, budget, campus areas), and start using it.

---

## Project structure

```
AMD/
├── backend/
│   ├── main.py              # app entry, auto-migration runs here
│   ├── models.py            # all SQLAlchemy models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth.py          # register, login
│   │   ├── chat.py          # chat + session management
│   │   ├── budget.py        # transactions, budget check
│   │   ├── recommendations.py
│   │   ├── planner.py
│   │   └── content.py
│   ├── services/
│   │   ├── llm_service.py        # Ollama calls
│   │   ├── faiss_service.py      # vector similarity search
│   │   ├── budget_service.py     # budget guardian logic
│   │   ├── optimization_service.py  # 5-criteria scoring
│   │   └── diversity_service.py  # anti-filter bubble
│   └── data/
│       └── seed_data.py     # sample activities + transactions
├── frontend/
│   └── src/
│       ├── api/client.js         # Axios wrapper
│       ├── components/
│       │   ├── Layout.jsx        # sidebar + navigation
│       │   ├── ChatInterface.jsx # chat UI with session history
│       │   ├── TrustAILogo.jsx   # brand logo component
│       │   └── ...
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Budget.jsx
│       │   ├── Recommendations.jsx
│       │   ├── Planner.jsx
│       │   ├── ContentGen.jsx
│       │   └── Profile.jsx
│       └── context/
│           └── AuthContext.jsx   # global auth state
└── docker-compose.yml
```

---

## API endpoints (quick reference)

```
POST   /api/auth/register
POST   /api/auth/login

POST   /api/chat                    send message
GET    /api/chat/sessions           list chat sessions
POST   /api/chat/sessions           create session
PATCH  /api/chat/sessions/:id       rename / pin
DELETE /api/chat/sessions/:id       delete session

GET    /api/budget/status
POST   /api/budget/transaction
GET    /api/budget/check?amount=X

POST   /api/recommendations
GET    /api/recommendations/all

POST   /api/planner/generate
GET    /api/planner/history

POST   /api/content/generate

GET    /api/profile
PUT    /api/profile
POST   /api/profile/avatar
```

---

## How the scoring works

Every recommendation gets a score out of 1.0 based on:

- **Budget fit (30%)** – how well the cost fits your remaining budget. Not just "can you afford it" but also avoids suggesting things that use up too much at once.
- **Preference match (25%)** – Jaccard similarity between the item's tags and your stated interests from onboarding.
- **Time feasibility (20%)** – checks if the activity duration fits in your free window and if it matches your preferred time of day.
- **Proximity (15%)** – based on which campus areas you frequent. Items in your regular spots score higher.
- **Diversity (10%)** – we track your last 10 recommendations. If a category is showing up more than 50% of the time, new items from that category get penalised. This is the anti-filter-bubble part.

---

## Common issues

**"Could not reach Ollama"** – Just run `ollama serve` in a terminal. Sometimes it stops after a while.

**FAISS index is empty / no recommendations showing** – Run `python data/seed_data.py` again. This rebuilds both the database seed data and the FAISS index.

**Frontend showing blank / API errors** – Make sure the backend is running on port 8000. Check that there's no CORS issue (backend allows localhost:5173 by default).

**Avatar not showing after upload** – Clear browser localStorage once. There was an old cached user object without the avatar field, logging out and back in fixes it.

---

## Running with Docker (alternative)

```bash
docker compose up --build
```

Note: Ollama needs to run on your host machine. The backend talks to it via `host.docker.internal:11434`.

---

## Team HackRats

**Sivavashini S** – III CSBS  
**Angupranisa U** – III CSBS  
**Sakthivel M** – III AIDS  

Sri Eshwar College of Engineering, Coimbatore