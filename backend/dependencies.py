from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .auth_utils import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    phone = verify_token(token)
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        # If user holds a valid signed JWT but DB was reset/reseeded (e.g. Render ephemeral disk),
        # auto-provision the user record so their active session continues seamlessly.
        user = User(
            phone=phone,
            name="Farmer",
            district="Nagpur",
            farming_type="Conventional",
            crops="Wheat,Cotton",
            category="General",
            language="en",
            trust_score=500
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    phone = verify_token(token)
    if not phone:
        return None
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(
            phone=phone,
            name="Farmer",
            district="Nagpur",
            farming_type="Conventional",
            crops="Wheat,Cotton",
            category="General",
            language="en",
            trust_score=500
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
