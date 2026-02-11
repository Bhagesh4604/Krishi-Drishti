
import sqlite3

DB_FILE = "krishi_drishti.db"

def add_column(cursor, table, column_def):
    try:
        print(f"Adding column: {column_def} to {table}")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
        print("Success.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print(f"Column already exists: {e}")
        else:
            print(f"Error adding column: {e}")

try:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Add missing columns
    add_column(cursor, "users", "crops TEXT DEFAULT ''")
    add_column(cursor, "users", "land_size REAL DEFAULT 0.0")
    add_column(cursor, "users", "category TEXT DEFAULT 'General'")
    add_column(cursor, "users", "farming_type TEXT DEFAULT 'Mixed'")
    add_column(cursor, "users", "trust_score INTEGER DEFAULT 500")

    conn.commit()
    conn.close()
    print("Schema update completed.")
except Exception as e:
    print(f"Database error: {e}")
