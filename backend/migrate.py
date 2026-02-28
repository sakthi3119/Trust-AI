"""Incremental migrations for TRUSTAI DB (SQLite)."""
import sqlite3

conn = sqlite3.connect("trustai.db")
cur = conn.cursor()

cur.execute("PRAGMA table_info(users)")
existing_cols = {row[1] for row in cur.fetchall()}
print("Existing user columns:", sorted(existing_cols))

# ── users table additions ─────────────────────────────────────────────────────
for col, definition in [
    ("college_name", "TEXT DEFAULT ''"),
    ("city",         "TEXT DEFAULT ''"),
    ("avatar",       "TEXT DEFAULT ''"),
]:
    if col not in existing_cols:
        cur.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
        print(f"+ Added users.{col}")
    else:
        print(f"  users.{col} already exists")

# ── campus_maps table ─────────────────────────────────────────────────────────
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='campus_maps'")
if not cur.fetchone():
    cur.execute("""
        CREATE TABLE campus_maps (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL UNIQUE,
            filename    TEXT NOT NULL DEFAULT 'campus_map',
            knowledge_graph TEXT,
            raw_description TEXT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    print("+ Created campus_maps table")
else:
    print("  campus_maps already exists")

conn.commit()
cur.execute("PRAGMA table_info(users)")
print("\nFinal user columns:", [row[1] for row in cur.fetchall()])
conn.close()
print("\nMigration complete.")
