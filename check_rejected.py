import sqlite3
con = sqlite3.connect(r'c:\Users\bhage\Desktop\Krishi-Drishti\krishi_drishti.db')
cur = con.cursor()
cur.execute("SELECT id, review_status, ai_status, ai_rejection_reason, ai_analysis FROM carbon_evidence WHERE review_status='l1_rejected' ORDER BY id DESC LIMIT 10")
for r in cur.fetchall():
    print(f'Evidence #{r[0]}: ai_status={r[2]} | reason={r[3]}')
    print(f'  analysis: {r[4]}')
