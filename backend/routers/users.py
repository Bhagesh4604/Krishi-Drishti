from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models import User
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    district: Optional[str] = None
    land_size: Optional[float] = None
    category: Optional[str] = None
    farming_type: Optional[str] = None
    crops: Optional[List[str]] = None # Not directly mapped (needs separate Table or JSON field), skipping for MVP simplicity or assuming Logic handling
    
class UserProfileResponse(BaseModel):
    id: int
    phone: str
    name: Optional[str]
    district: Optional[str]
    land_size: float
    category: str
    farming_type: str
    trust_score: int

    class Config:
        from_attributes = True

@router.get("/me", response_model=UserProfileResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserProfileResponse)
async def update_user_me(
    profile: UserProfileUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile.name is not None: current_user.name = profile.name
    if profile.district is not None: current_user.district = profile.district
    if profile.land_size is not None: current_user.land_size = profile.land_size
    if profile.category is not None: current_user.category = profile.category
    if profile.farming_type is not None: current_user.farming_type = profile.farming_type
    
    db.commit()
    db.refresh(current_user)
    return current_user
