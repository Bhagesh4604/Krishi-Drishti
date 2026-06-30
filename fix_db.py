"""
One-time DB schema sync script.
Run: python fix_db.py
"""
import warnings
warnings.filterwarnings('ignore')

from backend.database import engine, Base
import backend.models  # load all model definitions

# This creates missing tables and is safe to run multiple times
Base.metadata.create_all(bind=engine)
print("All tables synced via create_all")

import sqlite3
conn = sqlite3.connect('krishi_drishti.db')
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = sorted([r[0] for r in cur.fetchall()])
print("Tables in DB:", tables)

# Check for specific missing columns that SQLAlchemy create_all won't add
# (it only creates missing tables, not missing columns in existing tables)
migrations = [
    ("harvest_tokens", "crop_cycle_id", "INTEGER"),
    ("plots", "last_updated", "DATETIME"),
    ("carbon_projects", "available_credits", "REAL DEFAULT 0.0"),
    ("carbon_projects", "locked_credits", "REAL DEFAULT 0.0"),
]

for table, column, col_type in migrations:
    cur.execute(f"PRAGMA table_info({table})")
    existing_cols = [row[1] for row in cur.fetchall()]
    if column not in existing_cols:
        try:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            print(f"  Added {table}.{column}")
        except Exception as e:
            print(f"  Skip {table}.{column}: {e}")
    else:
        print(f"  OK {table}.{column}")

conn.commit()
conn.close()
print("\nDB migration complete!")
