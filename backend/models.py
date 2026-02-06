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
