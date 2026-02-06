from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..auth_utils import create_access_token
from datetime import timedelta
from ..auth_utils import ACCESS_TOKEN_EXPIRE_MINUTES
import random

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    phone: str

class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str

# In-memory store for OTPs (Use Redis in production)
otp_store = {}

@router.post("/send-otp")
async def send_otp(request: LoginRequest):
    # 1. Generate OTP (Hardcoded for Demo/Testing)
    otp = "1234" # str(random.randint(1000, 9999))
    
    # 2. Store OTP
    otp_store[request.phone] = otp
    
    # 3. Send OTP (Simulated)
    # in REAL world, call Twilio/Msg91 API here
    print(f"------------ OTP for {request.phone}: {otp} ------------")
    
    return {"message": "OTP sent successfully. Check console for code."}

@router.post("/verify-otp")
async def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    # 1. Verify OTP
    stored_otp = otp_store.get(request.phone)
    if not stored_otp or stored_otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # 2. Clear OTP
    del otp_store[request.phone]
    
    # 3. Check if User exists, if not create
    user = db.query(User).filter(User.phone == request.phone).first()
    if not user:
        user = User(phone=request.phone)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # 4. Generate Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.phone}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}
