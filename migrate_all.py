import sqlite3
import sys
import os

sys.path.insert(0, os.path.abspath('.'))

from backend.database import engine, Base
import backend.models  # ensure all models are registered

print("1. Ensuring all tables exist in krishi_drishti.db...")
Base.metadata.create_all(bind=engine)

conn = sqlite3.connect('krishi_drishti.db')
cur = conn.cursor()

def get_sqlite_type(col_type):
    t = str(col_type).upper()
    if 'INT' in t or 'BOOL' in t:
        return 'INTEGER'
    elif 'FLOAT' in t or 'REAL' in t or 'NUMERIC' in t:
        return 'REAL'
    else:
        return 'TEXT'

print("2. Checking existing tables for missing columns...")
for table_name, table in Base.metadata.tables.items():
    cur.execute(f"PRAGMA table_info({table_name})")
    existing_cols = {row[1] for row in cur.fetchall()}
    for col_name, col in table.columns.items():
        if col_name not in existing_cols:
            col_type = get_sqlite_type(col.type)
            print(f"   -> Adding column '{col_name}' ({col_type}) to table '{table_name}'")
            try:
                cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"      Error adding {col_name} to {table_name}: {e}")

conn.commit()
conn.close()
print("Migration complete! All missing columns and tables have been added.")
