from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
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

User.plots = relationship("Plot", back_populates="user")

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

