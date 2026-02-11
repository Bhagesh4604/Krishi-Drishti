from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Scheme, SchemeApplication, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/schemes", tags=["schemes"])

class SchemeBase(BaseModel):
    title: str
    description: str
    tag: str # 'NEW' | 'EXPIRING' | 'URGENT'
    deadline: Optional[str] = None
    link: Optional[str] = None
    benefits: Optional[str] = None
    eligibility: Optional[str] = None

class SchemeCreate(SchemeBase):
    pass

class SchemeResponse(SchemeBase):
    id: int
    
    class Config:
        from_attributes = True

class ApplicationRequest(BaseModel):
    scheme_id: str # Keep string to match frontend loose typing if needed, but DB is int usually. Let's keep ID as int in model but maybe string in request if frontend sends string.
    scheme_name: str

@router.get("/", response_model=List[SchemeResponse])
async def get_schemes(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    # In future: Filter by user profile (district, land size)
    schemes = db.query(Scheme).all()
    return schemes

@router.post("/", response_model=SchemeResponse, status_code=status.HTTP_201_CREATED)
async def create_scheme(
    scheme: SchemeCreate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user) # In real app, check admin
):
    db_scheme = Scheme(**scheme.dict())
    db.add(db_scheme)
    db.commit()
    db.refresh(db_scheme)
    return db_scheme

@router.post("/apply")
async def apply_scheme(
    application: ApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits a new scheme application for the current user.
    """
    try:
        new_application = SchemeApplication(
            user_id=current_user.id,
            scheme_id=str(application.scheme_id),
            scheme_name=application.scheme_name,
            status="In Review"
        )
        db.add(new_application)
        db.commit()
        db.refresh(new_application)
        return {"message": "Application submitted successfully", "application_id": new_application.id, "status": new_application.status}
    except Exception as e:
        print(f"Error submitting application: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit application")
