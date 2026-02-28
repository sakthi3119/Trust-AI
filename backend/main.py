from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models, sqlite3, os

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

# ── Auto-migrate: add columns that may be missing from an older DB ─────────────
def _auto_migrate():
    db_path = os.path.join(os.path.dirname(__file__), "trustai.db")
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # users table columns
    cur.execute("PRAGMA table_info(users)")
    cols = {row[1] for row in cur.fetchall()}
    for col, defn in [("college_name", "TEXT DEFAULT ''"),
                      ("city",         "TEXT DEFAULT ''"),
                      ("avatar",       "TEXT DEFAULT ''")]:
        if col not in cols:
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} {defn}")
    # campus_maps table
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='campus_maps'")
    if not cur.fetchone():
        cur.execute("""CREATE TABLE campus_maps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            filename TEXT NOT NULL DEFAULT 'campus_map',
            knowledge_graph TEXT,
            raw_description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id))""")
    # chat_sessions table
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'")
    if not cur.fetchone():
        cur.execute("""CREATE TABLE chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT 'New Chat',
            is_pinned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id))""")
    # session_id column on chat_messages
    cur.execute("PRAGMA table_info(chat_messages)")
    msg_cols = {row[1] for row in cur.fetchall()}
    if "session_id" not in msg_cols:
        cur.execute("ALTER TABLE chat_messages ADD COLUMN session_id INTEGER REFERENCES chat_sessions(id)")
    conn.commit()
    conn.close()

_auto_migrate()

from routers import chat, budget, recommendations, planner, content, auth, onboarding, campus

app = FastAPI(
    title="TRUSTAI API",
    description="Explainable AI Assistant for Smart Campus Life",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,            prefix="/api/auth",            tags=["Auth"])
app.include_router(onboarding.router,      prefix="/api/onboarding",      tags=["Onboarding"])
app.include_router(chat.router,            prefix="/api/chat",            tags=["Chat"])
app.include_router(budget.router,          prefix="/api/budget",          tags=["Budget"])
app.include_router(recommendations.router, prefix="/api/recommendations",  tags=["Recommendations"])
app.include_router(planner.router,         prefix="/api/planner",          tags=["Planner"])
app.include_router(content.router,         prefix="/api/content",          tags=["Content"])
app.include_router(campus.router,           prefix="/api/campus",           tags=["Campus"])

@app.get("/")
def root():
    return {"message": "TRUSTAI API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
