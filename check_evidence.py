import sqlite3
con = sqlite3.connect(r'c:\Users\bhage\Desktop\Krishi-Drishti\krishi_drishti.db')
cur = con.cursor()
cur.execute("SELECT id, review_status, ai_status, ai_rejection_reason FROM carbon_evidence ORDER BY id DESC LIMIT 10")
for r in cur.fetchall():
    print(f'Evidence #{r[0]}: review={r[1]} | ai={r[2]} | reason={r[3]}')
