import sqlite3

db_path = 'krishi_drishti.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# --- management_practice_logs ---
cur.execute('PRAGMA table_info(management_practice_logs)')
existing = {row[1] for row in cur.fetchall()}
print('Existing practice_log cols:', existing)

new_practice_cols = [
    ('local_photo_path', 'TEXT'),
    ('quantity', 'REAL'),
    ('unit', 'TEXT'),
    ('fertilizer_type', 'TEXT'),
    ('fertilizer_name', 'TEXT'),
    ('irrigation_method', 'TEXT'),
    ('yield_tonnes_ha', 'REAL'),
    ('residue_management', 'TEXT'),
]
for col, dtype in new_practice_cols:
    if col not in existing:
        cur.execute(f'ALTER TABLE management_practice_logs ADD COLUMN {col} {dtype}')
        print(f'Added to practice_logs: {col}')

# --- soil_sample_records ---
cur.execute('PRAGMA table_info(soil_sample_records)')
existing_soil = {row[1] for row in cur.fetchall()}
print('Existing soil_sample cols:', existing_soil)

new_soil_cols = [
    ('lab_name', 'TEXT'),
    ('lab_accreditation_no', 'TEXT'),
    ('collection_method', 'TEXT'),
    ('lab_certificate_local', 'TEXT'),
    ('status', 'TEXT'),
    ('verified_by', 'TEXT'),
    ('admin_soc_percent', 'REAL'),
    ('admin_bulk_density', 'REAL'),
    ('admin_ph', 'REAL'),
    ('admin_nitrogen_percent', 'REAL'),
    ('admin_notes', 'TEXT'),
    ('rejection_reason', 'TEXT'),
]
for col, dtype in new_soil_cols:
    if col not in existing_soil:
        cur.execute(f'ALTER TABLE soil_sample_records ADD COLUMN {col} {dtype}')
        print(f'Added to soil_samples: {col}')

# Set default status for existing records
cur.execute("UPDATE soil_sample_records SET status = 'pending_upload' WHERE status IS NULL")

conn.commit()
conn.close()
print('Migration done.')
