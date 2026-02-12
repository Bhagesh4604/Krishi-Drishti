from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/insurance", tags=["insurance"])

class InsuranceScheme(BaseModel):
    id: int
    name: str
    provider: str
    type: str # Yield Protection, Weather, Specific Crop
    coverage: str
    premium: str
    description: str
    link: str
    crops: List[str]

# Mock Database of Insurance Schemes
INSURANCE_DB = [
    {
        "id": 1,
        "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "provider": "Govt. of India",
        "type": "Yield Protection",
        "coverage": "₹50,000 / ha",
        "premium": "₹850 / ha",
        "description": "Comprehensive crop insurance scheme providing financial support to farmers suffering crop loss/damage arising out of unforeseen events.",
        "link": "https://pmfby.gov.in/",
        "crops": ["Rice", "Wheat", "Cotton", "Sugarcane", "Corn", "Soybean"]
    },
    {
        "id": 2,
        "name": "Weather Based Crop Insurance Scheme (WBCIS)",
        "provider": "Agri-Insure Ltd",
        "type": "Weather Parametric",
        "coverage": "₹35,000 / ha",
        "premium": "₹600 / ha",
        "description": "Provides insurance protection to the cultivator against adverse weather incidence, such as deficit and excess rainfall, high or low temperature, humidity etc.",
        "link": "https://pmfby.gov.in/",
        "crops": ["Grapes", "Orange", "Mango", "Banana", "Chilli"]
    },
    {
        "id": 3,
        "name": "Coconut Palm Insurance Scheme (CPIS)",
        "provider": "Coconut Development Board",
        "type": "Specific Crop",
        "coverage": "₹2,000 / tree",
        "premium": "₹15 / tree",
        "description": "Insurance mechanism for coconut palm growers to assist in repairing damages caused by natural calamities and pests.",
        "link": "https://www.coconutboard.gov.in/",
        "crops": ["Coconut"]
    },
    {
        "id": 4,
        "name": "Livestock Insurance Scheme",
        "provider": "Dept of Animal Husbandry",
        "type": "Livestock",
        "coverage": "₹40,000 / animal",
        "premium": "₹450 / animal",
        "description": "Protection mechanism to the farmers and cattle rearers against any eventual loss of their animals due to death.",
        "link": "https://dahd.nic.in/",
        "crops": ["Cattle", "Buffalo", "Goat"]
    },
    {
        "id": 5,
        "name": "Unified Package Insurance Scheme (UPIS)",
        "provider": "General Insurance Corp",
        "type": "Comprehensive",
        "coverage": "Variable",
        "premium": "Variable",
        "description": "Covers crop insurance along with Personal Accident, Life, Student Safety, House-hold content, Agriculture implements (Tractors, Pump sets etc).",
        "link": "https://financialservices.gov.in/",
        "crops": ["All"]
    },
    {
        "id": 6,
        "name": "Restructured Weather Based Crop Insurance Scheme (RWBCIS)",
        "provider": "AIC of India",
        "type": "Weather Parametric",
        "coverage": "₹40,000 / ha",
        "premium": "₹700 / ha",
        "description": "Aims to mitigate the hardship of the insured farmers against the likelihood of financial loss on account of anticipated crop loss resulting from adverse weather conditions.",
        "link": "https://www.aicofindia.com/",
        "crops": ["Horticulture", "Commercial Crops"]
    }
]

@router.get("/search", response_model=List[InsuranceScheme])
async def search_insurance(query: str = Query(None, min_length=0)):
    """
    Search for insurance schemes by name, type, or crop.
    """
    if not query:
        return INSURANCE_DB

    q = query.lower()
    results = [
        scheme for scheme in INSURANCE_DB
        if q in scheme["name"].lower() 
        or q in scheme["type"].lower()
        or q in scheme["provider"].lower()
        or any(q in crop.lower() for crop in scheme["crops"])
    ]
    
    # Mark enrolled schemes
    for scheme in results:
        scheme["is_enrolled"] = scheme["id"] in ENROLLED_SCHEMES
        
    return results

# In-memory storage for demo persistence
ENROLLED_SCHEMES = set()

class EnrollmentRequest(BaseModel):
    scheme_id: int
    farmer_name: str
    aadhar_number: str
    survey_number: str
    land_area: float
    crop: str

@router.post("/enroll")
async def enroll_scheme(request: EnrollmentRequest):
    """
    Process insurance enrollment.
    """
    scheme = next((s for s in INSURANCE_DB if s["id"] == request.scheme_id), None)
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Mock logic: Verify Aadhar (just length check for demo)
    if len(request.aadhar_number) != 12:
         raise HTTPException(status_code=400, detail="Invalid Aadhar Number")

    # Save to "Database"
    ENROLLED_SCHEMES.add(request.scheme_id)
    
    return {
        "status": "success", 
        "message": f"Application submitted for {scheme['name']}", 
        "enrollment_id": f"INS-{request.scheme_id}-{request.aadhar_number[-4:]}",
        "details": request
    }
