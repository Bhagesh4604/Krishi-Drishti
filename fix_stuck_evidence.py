import sqlite3, json

db_path = r'c:\Users\bhage\Desktop\Krishi-Drishti\krishi_drishti.db'
con = sqlite3.connect(db_path)
cur = con.cursor()

cur.execute("SELECT id, review_status, ai_status, project_id FROM carbon_evidence")
rows = cur.fetchall()
print("All evidence records:")
for r in rows:
    print(f"  id={r[0]}  review_status={r[1]}  ai_status={r[2]}  project_id={r[3]}")

note = json.dumps({"note": "Migrated from awaiting_ai — queued for manual review"})
cur.execute(
    "UPDATE carbon_evidence SET review_status='pending_l1', ai_status='flagged', ai_analysis=? WHERE review_status='awaiting_ai'",
    (note,)
)
print(f"\nFixed {cur.rowcount} stuck evidence item(s)")
con.commit()
con.close()
print("Done.")
