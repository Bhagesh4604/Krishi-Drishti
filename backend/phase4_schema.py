"""
Phase 4: Fraud-Resistant Soil Chain-of-Custody + Razorpay Marketplace
Adds to models.py:
  - SoilQRBag       (platform-issued tamper-evident bag codes)
  - CreditListing   (farmer lists credits for sale)
  - CreditPurchase  (payment record per buyer transaction)
Adds to SoilSampleRecord:
  - qr_bag_id, video_url, geo_distance_from_plot_m, fraud_flags, bag_seal_status
"""
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Text
from datetime import datetime

# ── Fraud-Prevention: QR Bag Codes ───────────────────────────────────────────
SOIL_QR_BAG_DDL = """
CREATE TABLE IF NOT EXISTS soil_qr_bags (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    bag_code         VARCHAR UNIQUE NOT NULL,
    plot_id          INTEGER NOT NULL REFERENCES plots(id),
    project_id       INTEGER REFERENCES carbon_projects(id),
    user_id          INTEGER NOT NULL REFERENCES users(id),
    issued_at        DATETIME DEFAULT (datetime('now')),
    used_at          DATETIME,
    status           VARCHAR DEFAULT 'unused',
    sample_record_id INTEGER REFERENCES soil_sample_records(id)
);
"""

# ── Marketplace: Credit Listings ─────────────────────────────────────────────
CREDIT_LISTING_DDL = """
CREATE TABLE IF NOT EXISTS credit_listings (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    project_id          INTEGER NOT NULL REFERENCES carbon_projects(id),
    token_id            VARCHAR REFERENCES carbon_tokens(token_id),
    quantity_tco2e      FLOAT NOT NULL,
    price_per_tco2e_inr FLOAT NOT NULL,
    total_inr           FLOAT NOT NULL,
    status              VARCHAR DEFAULT 'active',
    methodology         VARCHAR,
    vintage_year        INTEGER,
    expires_at          DATETIME,
    created_at          DATETIME DEFAULT (datetime('now'))
);
"""

# ── Marketplace: Credit Purchases ─────────────────────────────────────────────
CREDIT_PURCHASE_DDL = """
CREATE TABLE IF NOT EXISTS credit_purchases (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id            INTEGER NOT NULL REFERENCES credit_listings(id),
    buyer_name            VARCHAR NOT NULL,
    buyer_email           VARCHAR NOT NULL,
    buyer_entity          VARCHAR,
    buyer_gstin           VARCHAR,
    quantity_tco2e        FLOAT NOT NULL,
    price_per_tco2e_inr   FLOAT NOT NULL,
    total_inr             FLOAT NOT NULL,
    platform_fee_inr      FLOAT DEFAULT 0.0,
    farmer_payout_inr     FLOAT DEFAULT 0.0,
    razorpay_order_id     VARCHAR,
    razorpay_payment_id   VARCHAR,
    razorpay_signature    VARCHAR,
    payment_status        VARCHAR DEFAULT 'pending',
    certificate_id        VARCHAR UNIQUE,
    certificate_hash      VARCHAR,
    created_at            DATETIME DEFAULT (datetime('now')),
    paid_at               DATETIME,
    UNIQUE(razorpay_payment_id)
);
"""

# ── Fraud check columns on soil_sample_records ────────────────────────────────
SOIL_FRAUD_MIGRATIONS = [
    "ALTER TABLE soil_sample_records ADD COLUMN qr_bag_id INTEGER REFERENCES soil_qr_bags(id)",
    "ALTER TABLE soil_sample_records ADD COLUMN video_url VARCHAR",
    "ALTER TABLE soil_sample_records ADD COLUMN video_local_path VARCHAR",
    "ALTER TABLE soil_sample_records ADD COLUMN geo_distance_from_plot_m FLOAT",
    "ALTER TABLE soil_sample_records ADD COLUMN fraud_flags TEXT DEFAULT '[]'",
    "ALTER TABLE soil_sample_records ADD COLUMN bag_seal_status VARCHAR DEFAULT 'unknown'",
    "ALTER TABLE soil_sample_records ADD COLUMN satellite_soc_estimate FLOAT",
    "ALTER TABLE soil_sample_records ADD COLUMN soc_discrepancy_flag BOOLEAN DEFAULT 0",
]

# Also add: NDVI gate for enrollment
NDVI_GATE_MIGRATIONS = [
    "ALTER TABLE carbon_projects ADD COLUMN enrollment_ndvi FLOAT",
    "ALTER TABLE carbon_projects ADD COLUMN enrollment_ndvi_rejected BOOLEAN DEFAULT 0",
    "ALTER TABLE carbon_projects ADD COLUMN enrollment_ndvi_reason VARCHAR",
]

ALL_MIGRATIONS = SOIL_FRAUD_MIGRATIONS + NDVI_GATE_MIGRATIONS
ALL_DDL = [SOIL_QR_BAG_DDL, CREDIT_LISTING_DDL, CREDIT_PURCHASE_DDL]
