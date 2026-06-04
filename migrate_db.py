"""
Database migration script.
Adds missing columns to existing tables without dropping data.
Run once: python migrate_db.py
"""
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "krishi_drishti.db")

print(f"Running migration on: {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

def column_exists(table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())

def add_column(table, column, col_type, default=None):
    if column_exists(table, column):
        print(f"  [SKIP]  {table}.{column} already exists")
        return
    sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
    if default is not None:
        sql += f" DEFAULT {default}"
    cursor.execute(sql)
    print(f"  [ADD]   {table}.{column} ({col_type})")

print("\n-- carbon_projects --")
add_column("carbon_projects", "verification_cost_usd",  "REAL",    3000.0)
add_column("carbon_projects", "buffer_pool_percentage", "REAL",    15.0)
add_column("carbon_projects", "vesting_end_date",       "TEXT",    "NULL")
add_column("carbon_projects", "requires_soil_sample",   "INTEGER", 1)
add_column("carbon_projects", "additionality_score",    "REAL",    0.0)
add_column("carbon_projects", "available_credits",      "REAL",    0.0)
add_column("carbon_projects", "locked_credits",         "REAL",    0.0)
add_column("carbon_projects", "rejection_reason",       "TEXT",    "NULL")
add_column("carbon_projects", "admin_reviewed_at",      "TEXT",    "NULL")
add_column("carbon_projects", "admin_notes",            "TEXT",    "NULL")
add_column("carbon_projects", "baseline_emission",      "REAL",    0.0)
add_column("carbon_projects", "projected_sequestration","REAL",    0.0)
add_column("carbon_projects", "verified_credits",       "REAL",    0.0)

print("\n-- plots --")
add_column("plots", "organic_score",  "REAL", 0.0)
add_column("plots", "carbon_credits", "REAL", 0.0)
add_column("plots", "polygon_id",     "TEXT", "NULL")
add_column("plots", "image_url",      "TEXT", "NULL")
add_column("plots", "last_scan_date", "TEXT", "NULL")

print("\n-- farmer_operation_logs --")
add_column("farmer_operation_logs", "project_id", "INTEGER", "NULL")

conn.commit()
conn.close()
print("\nMigration complete! Restart the backend.")
