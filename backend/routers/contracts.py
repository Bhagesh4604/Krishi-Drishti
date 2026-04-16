from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import Contract, User
from ..dependencies import get_current_user
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/contracts", tags=["contracts"])

class ContractSign(BaseModel):
    contract_id: int
    signature_hash: str

class ContractResponse(BaseModel):
    id: int
    buyer_name: str
    crop_type: str
    quantity: float
    price_per_qt: float
    delivery_date: datetime
    status: str
    terms: str
    digital_signature: Optional[str]

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ContractResponse])
async def get_contracts(
    status: str = "Open",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If status is Open, show all open contracts
    # If status is Signed, show only MY signed contracts
    if status == "Open":
        contracts = db.query(Contract).filter(Contract.status == "Open").all()
        # If the central system hasn't posted any corporate contracts yet, seed initial institutional offers
        if not contracts:
            dummies = [
                Contract(buyer_name="ITC Agribusiness", crop_type="Wheat", quantity=100, price_per_qt=3200, delivery_date=datetime(2026, 6, 15), terms="Moisture < 12%, Max 2% Foreign Matter, Premium Grade", status="Open"),
                Contract(buyer_name="Pepsico India", crop_type="Potato", quantity=500, price_per_qt=1800, delivery_date=datetime(2026, 5, 1), terms="Grade A Processable, Size > 45mm, No Green Ends", status="Open"),
                Contract(buyer_name="Reliance Fresh", crop_type="Tomato", quantity=50, price_per_qt=1500, delivery_date=datetime(2026, 4, 30), terms="Firm Red, No bruises, Direct to local warehouse", status="Open"),
                Contract(buyer_name="Godrej Agrovet", crop_type="Soybean", quantity=200, price_per_qt=5200, delivery_date=datetime(2026, 9, 10), terms="Oil content > 18%, Moisture < 10%", status="Open")
            ]
            db.add_all(dummies)
            db.commit()
            contracts = db.query(Contract).filter(Contract.status == "Open").all()
        return contracts
    
    elif status == "Signed":
        return db.query(Contract).filter(Contract.farmer_id == current_user.id).all()
    
    return []

@router.post("/sign")
async def sign_contract(
    payload: ContractSign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contract = db.query(Contract).filter(Contract.id == payload.contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.status != "Open":
        raise HTTPException(status_code=400, detail="Contract already closed/taken")
        
    contract.status = "Signed"
    contract.farmer_id = current_user.id
    contract.digital_signature = payload.signature_hash
    
    db.commit()
    
    return {"message": "Contract Signed Successfully", "contract_id": contract.id}
