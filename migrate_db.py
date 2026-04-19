"""
One-time migration: adds new columns to krishi_drishti.db
"""

import sqlite3
import os

# Find the actual database file
db_path = "krishi_drishti.db"
if not os.path.exists(db_path):
    db_path = "backend/krishi_drishti.db"

print(f"Using database: {os.path.abspath(db_path)}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Show all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]
print("Tables:", tables)

# ─── Migrate carbon_projects ────────────────────────────────────────────────
cursor.execute("PRAGMA table_info(carbon_projects)")
cols = [row[1] for row in cursor.fetchall()]
print("\ncarbon_projects columns:", cols)

new_cols = [
    ("available_credits", "REAL DEFAULT 0.0"),
    ("locked_credits",    "REAL DEFAULT 0.0"),
    ("rejection_reason",  "VARCHAR"),
    ("admin_reviewed_at", "DATETIME"),
    ("admin_notes",       "VARCHAR"),
]
for col_name, col_def in new_cols:
    if col_name not in cols:
        cursor.execute(f"ALTER TABLE carbon_projects ADD COLUMN {col_name} {col_def}")
        print(f"  OK Added: carbon_projects.{col_name}")
    else:
        print(f"  - Exists: carbon_projects.{col_name}")

# ─── Create farmer_operation_logs ──────────────────────────────────────────
cursor.execute("""
CREATE TABLE IF NOT EXISTS farmer_operation_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    plot_id    INTEGER REFERENCES plots(id),
    project_id INTEGER REFERENCES carbon_projects(id),
    operation  VARCHAR,
    detail     VARCHAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")
print("\n[OK] farmer_operation_logs: ready")

# ─── Create admin_credit_decisions ─────────────────────────────────────────
cursor.execute("""
CREATE TABLE IF NOT EXISTS admin_credit_decisions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER REFERENCES carbon_projects(id),
    action           VARCHAR,
    credits_issued   REAL DEFAULT 0.0,
    rejection_reason VARCHAR,
    admin_note       VARCHAR,
    decided_at       DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")
print("[OK] admin_credit_decisions: ready")

conn.commit()
conn.close()
print("\nMigration complete. Restart the backend.")
