from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    district = Column(String, nullable=True)
    land_size = Column(Float, default=0.0)
    category = Column(String, default="General") # General, OBC, SC, ST
    farming_type = Column(String, default="Mixed") # Organic, Conventional, Mixed
    language = Column(String, default="en")
    trust_score = Column(Integer, default=500)
    created_at = Column(DateTime, default=datetime.utcnow)
    crops = Column(String, default="") # Comma-separated or JSON string

    listings = relationship("Listing", back_populates="seller")
    chats = relationship("ChatMessage", back_populates="user")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"))
    crop_name = Column(String, index=True)
    quantity = Column(String) # e.g. "500kg"
    price = Column(String)    # e.g. "120/kg"
    location = Column(String)
    description = Column(String)
    is_organic = Column(Boolean, default=False)
    grade = Column(String, default="A")
    image_url = Column(String, nullable=True)
    verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="listings")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String) # user, model, system
    text = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chats")


class StressReport(Base):
    __tablename__ = "stress_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    location_lat = Column(Float)
    location_lng = Column(Float)
    crop_type = Column(String)
    ndvi_score = Column(Float) # Simulated NDVI
    stress_level = Column(String) # Low, Medium, High
    recommendation = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="stress_reports")

# Add backref to User
User.stress_reports = relationship("StressReport", back_populates="user")


class SchemeApplication(Base):
    __tablename__ = "scheme_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scheme_id = Column(String)
    scheme_name = Column(String)
    status = Column(String, default="In Review") # In Review, Approved, Rejected
    submitted_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    remarks = Column(String, nullable=True)

    user = relationship("User", back_populates="applications")

User.applications = relationship("SchemeApplication", back_populates="user")


class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    tag = Column(String) # 'NEW' | 'EXPIRING' | 'URGENT'
    deadline = Column(String, nullable=True)
    link = Column(String, nullable=True)
    benefits = Column(String, nullable=True)
    eligibility = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    image_url = Column(String, nullable=True)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="posts")
    comments = relationship("CommunityComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("CommunityLike", back_populates="post", cascade="all, delete-orphan")


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    text = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("CommunityPost", back_populates="comments")
    user = relationship("User")


class CommunityLike(Base):
    __tablename__ = "community_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    post = relationship("CommunityPost", back_populates="likes")
    user = relationship("User")

# Add relationships to User
User.posts = relationship("CommunityPost", back_populates="user")

class Plot(Base):
    __tablename__ = "plots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    
    # Storing coordinates as a JSON string for simplicity in SQLite 
    # Format: [{"lat": 21.1, "lng": 79.1}, ...]
    coordinates = Column(String) 
    
    area = Column(Float, default=0.0) # In acres
    crop_type = Column(String, nullable=True)
    health_score = Column(Float, default=0.85) # 0.0 to 1.0 (Simulated for now)
    moisture = Column(Float, default=30.0) # Percentage
    organic_score = Column(Float, default=0.0) # 0.0 to 100.0
    carbon_credits = Column(Float, default=0.0) # Number of tokens
    last_scan_date = Column(DateTime, nullable=True)
    polygon_id = Column(String, nullable=True) # AgroMonitoring Polygon ID
    image_url = Column(String, nullable=True) # Cached Satellite Image URL
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="plots")
    carbon_projects = relationship("CarbonProject", back_populates="plot")
    history = relationship("PlotHistory", back_populates="plot", cascade="all, delete-orphan")

class PlotHistory(Base):
    __tablename__ = "plot_history"

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"))
    date = Column(DateTime, default=datetime.utcnow)
    ndvi = Column(Float, nullable=True)
    evi = Column(Float, nullable=True)
    msavi = Column(Float, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    plot = relationship("Plot", back_populates="history")


class CarbonProject(Base):
    __tablename__ = "carbon_projects"

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"))
    user_id = Column(Integer, ForeignKey("users.id")) # Denormalized for easy access
    
    methodology = Column(String) # "No-Till", "Cover-Crop", "Agroforestry"
    status = Column(String, default="Potential") # Potential, Enrolled, Evidence_Pending, Verified, Issued
    start_date = Column(DateTime, default=datetime.utcnow)
    
    # MRV Data
    baseline_emission = Column(Float, default=0.0) # Historical baseline
    projected_sequestration = Column(Float, default=0.0)
    verified_credits = Column(Float, default=0.0)
    
    # Realistic Constraints (Industry Standards)
    verification_cost_usd = Column(Float, default=3000.0) # Physical soil sampling + lab test
    buffer_pool_percentage = Column(Float, default=15.0) # 10-20% locked as insurance
    vesting_end_date = Column(DateTime, nullable=True) # 5 years from start
    requires_soil_sample = Column(Boolean, default=True) # Hybrid verification required
    additionality_score = Column(Float, default=0.0) # 0-1, rejection if practice is common (>0.5 = common)
    available_credits = Column(Float, default=0.0) # After buffer pool deduction
    locked_credits = Column(Float, default=0.0) # Buffer pool amount

    # Admin Decision Tracking
    rejection_reason = Column(String, nullable=True)      # Filled when ops team rejects
    admin_reviewed_at = Column(DateTime, nullable=True)   # When ops team took action
    admin_notes = Column(String, nullable=True)           # Optional ops team notes

    @property
    def aggregator_name(self) -> str:
        return "Krishi Drishti Aggregator"

    @property
    def government_scheme(self) -> str:
        return "CCTS"

    @property
    def platform_fee_percentage(self) -> float:
        return 20.0

    @property
    def farmer_share_percentage(self) -> float:
        return round(100.0 - self.platform_fee_percentage, 1)

    plot = relationship("Plot", back_populates="carbon_projects")
    evidence = relationship("CarbonEvidence", back_populates="project")

class CarbonEvidence(Base):
    __tablename__ = "carbon_evidence"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("carbon_projects.id"))
    image_url = Column(String)
    description = Column(String)
    geo_lat = Column(Float)
    geo_lng = Column(Float)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("CarbonProject", back_populates="evidence")


class CarbonTransaction(Base):
    __tablename__ = "carbon_transactions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("carbon_projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount_credits = Column(Float, default=0.0)
    amount_inr = Column(Float, default=0.0)
    aggregator_fee_inr = Column(Float, default=0.0)
    farmer_payout_inr = Column(Float, default=0.0)
    status = Column(String, default="Completed")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("CarbonProject")
    user = relationship("User")

class CarbonCreditToken(Base):
    __tablename__ = "carbon_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String, unique=True, index=True) # e.g. KD-C-2026-00001
    project_id = Column(Integer, ForeignKey("carbon_projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    token_hash = Column(String) # SHA-256 for immutability
    sequence_number = Column(Integer)
    status = Column(String, default="Minted") # Minted, Transferred, Retired
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("CarbonProject")
    user = relationship("User")


User.plots = relationship("Plot", back_populates="user")


class FarmerOperationLog(Base):
    """
    Immutable audit log of every meaningful farmer action.
    Used by the admin/ops team to monitor field activity and verify carbon credit claims.
    """
    __tablename__ = "farmer_operation_logs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), index=True)
    plot_id    = Column(Integer, ForeignKey("plots.id"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("carbon_projects.id"), nullable=True, index=True)

    # Operation type — one of a controlled vocabulary:
    # "plot_created", "plot_scan", "disease_alert_triggered",
    # "project_enrolled", "evidence_upload", "verification_run",
    # "credit_issued", "credit_claimed", "credit_rejected"
    operation  = Column(String, index=True)
    detail     = Column(String, nullable=True)   # JSON blob with operation-specific data
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user    = relationship("User")
    plot    = relationship("Plot")


class AdminCreditDecision(Base):
    """
    Immutable record of every approve/reject action taken by the ops team.
    Forms the audit trail for CCTS/BEE submission.
    """
    __tablename__ = "admin_credit_decisions"

    id               = Column(Integer, primary_key=True, index=True)
    project_id       = Column(Integer, ForeignKey("carbon_projects.id"), index=True)
    action           = Column(String)             # "approved" | "rejected"
    credits_issued   = Column(Float, default=0.0)
    rejection_reason = Column(String, nullable=True)
    admin_note       = Column(String, nullable=True)
    decided_at       = Column(DateTime, default=datetime.utcnow)

    project = relationship("CarbonProject")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null if open offer
    buyer_name = Column(String) # e.g., "ITC Agribusiness"
    crop_type = Column(String)
    quantity = Column(Float) # in tons
    price_per_qt = Column(Float)
    delivery_date = Column(DateTime)
    status = Column(String, default="Open") # Open, Signed, Fulfilled
    terms = Column(String) # "Grade A only, Moisture < 10%"
    digital_signature = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    farmer = relationship("User", back_populates="contracts")

User.contracts = relationship("Contract", back_populates="farmer")


class WeatherHistory(Base):
    __tablename__ = "weather_history"

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), nullable=True) # Granular per plot
    region = Column(String, nullable=True) # Or general region
    date = Column(DateTime, default=datetime.utcnow)
    temperature_avg = Column(Float)
    humidity_avg = Column(Float)
    precipitation = Column(Float)
    
class DiseaseRiskAlert(Base):
    __tablename__ = "disease_risk_alerts"

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    disease_name = Column(String)
    risk_level = Column(String) # High, Medium, Low
    trigger_date = Column(DateTime, default=datetime.utcnow)
    recommendation = Column(String)
    is_active = Column(Boolean, default=True)

    plot = relationship("Plot")
    user = relationship("User")


class CropCycle(Base):
    """
    Tracks a crop from planting to harvest.
    Provides the container for geo-tagged timeline events.
    """
    __tablename__ = "crop_cycles"

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    crop_type = Column(String)
    variety = Column(String, nullable=True)
    status = Column(String, default="Active") # Active, Harvested, Abandoned
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    plot = relationship("Plot")
    user = relationship("User")
    events = relationship("CropCycleEvent", back_populates="cycle", cascade="all, delete-orphan")
    harvest_tokens = relationship("HarvestToken", back_populates="crop_cycle")


class CropCycleEvent(Base):
    """
    An immutable event logged during the crop cycle (e.g., Sowing, Fertilizing, Inspection).
    Must include geotag and media for proof.
    """
    __tablename__ = "crop_cycle_events"

    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(Integer, ForeignKey("crop_cycles.id"), index=True)
    event_type = Column(String) # Sowing, Fertilizing, Weeding, Inspection, Harvest
    event_date = Column(DateTime, default=datetime.utcnow)
    
    # Geofenced proof
    geo_lat = Column(Float, nullable=True)
    geo_lng = Column(Float, nullable=True)
    media_url = Column(String, nullable=True) # Photo/Video proof URL
    notes = Column(String, nullable=True)

    # Cryptographic link
    event_hash = Column(String, nullable=True) # Hash of this event's data + media URL

    cycle = relationship("CropCycle", back_populates="events")


class HarvestToken(Base):
    """
    Tokenized representation of a harvested crop batch.
    Forms an immutable, cryptographically-linked provenance record
    for supply chain traceability (CBAM, CCTS compliance).
    Each token hashes all its fields + the previous token hash, creating
    a mini-blockchain ledger without requiring a live chain node.
    """
    __tablename__ = "harvest_tokens"

    id = Column(Integer, primary_key=True, index=True)

    # Identity
    token_id = Column(String, unique=True, index=True)  # e.g. KD-HTK-2025-00042
    plot_id = Column(Integer, ForeignKey("plots.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    carbon_project_id = Column(Integer, ForeignKey("carbon_projects.id"), nullable=True)
    crop_cycle_id = Column(Integer, ForeignKey("crop_cycles.id"), nullable=True, index=True)

    # Crop provenance
    crop_type = Column(String)
    variety = Column(String, nullable=True)          # e.g. "Sharbati Wheat"
    harvest_date = Column(DateTime)
    yield_kg = Column(Float, default=0.0)            # Total harvested weight
    area_harvested_acres = Column(Float, default=0.0)
    geo_lat = Column(Float, nullable=True)
    geo_lng = Column(Float, nullable=True)

    # Carbon & environment
    carbon_footprint_kg_co2e = Column(Float, default=0.0)  # kg CO2e per kg yield
    carbon_credits_linked = Column(Float, default=0.0)     # Verified credits from project
    farming_methodology = Column(String, nullable=True)    # From carbon project
    ndvi_at_harvest = Column(Float, nullable=True)         # Satellite NDVI

    # Chemical inputs — JSON: [{"name": str, "quantity": str, "unit": str, "applied_date": str}]
    chemical_inputs = Column(Text, default="[]")

    # Blockchain fields
    status = Column(String, default="Draft")         # Draft, Minted, Transferred
    previous_hash = Column(String, nullable=True)    # Hash of the previous token in chain
    token_hash = Column(String, unique=True, nullable=True)  # sha256 of all fields
    sequence_number = Column(Integer, default=0)     # Global monotonic sequence

    # Public verification
    qr_url = Column(String, nullable=True)           # Public verify URL
    minted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Transfer
    buyer_name = Column(String, nullable=True)
    buyer_entity = Column(String, nullable=True)     # Company / exporter
    transferred_at = Column(DateTime, nullable=True)
    transfer_signature = Column(String, nullable=True)  # Buyer acknowledgement hash

    # Relationships
    plot = relationship("Plot")
    user = relationship("User")
    carbon_project = relationship("CarbonProject")
    crop_cycle = relationship("CropCycle", back_populates="harvest_tokens")
    transfer_logs = relationship("TokenTransferLog", back_populates="token", cascade="all, delete-orphan")


class TokenTransferLog(Base):
    """
    Immutable record of every custody transfer of a HarvestToken.
    Creates a full provenance chain for auditors and regulators.
    """
    __tablename__ = "token_transfer_logs"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String, ForeignKey("harvest_tokens.token_id"), index=True)
    from_entity = Column(String)     # Farmer name / KD Platform
    to_entity = Column(String)       # Buyer / Processor
    transfer_date = Column(DateTime, default=datetime.utcnow)
    transfer_hash = Column(String)   # sha256 of transfer details
    notes = Column(String, nullable=True)

    token = relationship("HarvestToken", back_populates="transfer_logs")


class MerkleAnchor(Base):
    """
    Upgrade C: Daily Merkle Root Anchor.
    Each row represents one day's cryptographic commitment over all crop cycle events.
    The merkle_root field is the mathematical proof that event records for anchor_date
    have not been tampered with. In production, the l2_tx_hash field holds a transaction
    hash from a public Layer-2 blockchain (e.g., Base, Polygon) for external verifiability.
    """
    __tablename__ = "merkle_anchors"

    id = Column(Integer, primary_key=True, index=True)
    anchor_date = Column(DateTime, unique=True, index=True)   # Midnight UTC of the anchored day
    merkle_root = Column(String, nullable=False)              # 64-char SHA-256 Merkle root
    event_count = Column(Integer, default=0)                  # Number of events included
    chain_id = Column(String, default="internal-postgres-v1") # e.g. "base-mainnet", "polygon"
    l2_tx_hash = Column(String, nullable=True)                # Public blockchain tx hash (future)
    created_at = Column(DateTime, default=datetime.utcnow)

