from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import json
import random

from ..database import get_db
from ..models import CarbonProject, CarbonEvidence, Plot, User
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/carbon", tags=["carbon"])

# --- Pydantic Models ---
class ProjectCreate(BaseModel):
    plot_id: int
    methodology: str # "Cover-Crop", "No-Till"

class EvidenceCreate(BaseModel):
    description: str
    geo_lat: float
    geo_lng: float

class ProjectResponse(BaseModel):
    id: int
    plot_id: int
    plot_name: str
    methodology: str
    status: str
    projected_credits: float
    verified_credits: float
    available_credits: float
    locked_credits: float
    start_date: datetime
    vesting_end_date: Optional[datetime]
    verification_cost_usd: float
    buffer_pool_percentage: float
    additionality_score: float
    requires_soil_sample: bool
    evidence_count: int

    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/projects", response_model=List[ProjectResponse])
async def get_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(CarbonProject).filter(CarbonProject.user_id == current_user.id).all()
    
    results = []
    for p in projects:
        results.append(ProjectResponse(
            id=p.id,
            plot_id=p.plot_id,
            plot_name=p.plot.name,
            methodology=p.methodology,
            status=p.status,
            projected_credits=p.projected_sequestration,
            verified_credits=p.verified_credits,
            available_credits=p.available_credits,
            locked_credits=p.locked_credits,
            start_date=p.start_date,
            vesting_end_date=p.vesting_end_date,
            verification_cost_usd=p.verification_cost_usd,
            buffer_pool_percentage=p.buffer_pool_percentage,
            additionality_score=p.additionality_score,
            requires_soil_sample=p.requires_soil_sample,
            evidence_count=len(p.evidence)
        ))
    return results

@router.post("/enroll", response_model=ProjectResponse)
async def enroll_plot(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify Plot Ownership
    plot = db.query(Plot).filter(Plot.id == project.plot_id, Plot.user_id == current_user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
        
    # 2. Check if already enrolled
    existing = db.query(CarbonProject).filter(CarbonProject.plot_id == plot.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plot already enrolled in a carbon project")
        
    # 3. Calculate Potential (Simulated Digital MRV Baseline)
    # in real life, this calls Earth Engine for 3-year history
    base_potential_per_acre = 0.0
    if project.methodology == "Cover-Crop":
        base_potential_per_acre = 0.8 # tons/acre
    elif project.methodology == "No-Till":
        base_potential_per_acre = 1.2
    elif project.methodology == "Agroforestry":
        base_potential_per_acre = 2.5
        
    total_potential = plot.area * base_potential_per_acre

    # Set vesting period (5 years from enrollment)
    from datetime import timedelta
    vesting_date = datetime.utcnow() + timedelta(days=5*365)
    
    # Simulate additionality pre-check (in production, this queries district data)
    initial_additionality = random.uniform(0.1, 0.6) # Mock: will be verified later

    new_project = CarbonProject(
        plot_id=plot.id,
        user_id=current_user.id,
        methodology=project.methodology,
        status="Enrolled", # Starts as Enrolled, needs Evidence next
        baseline_emission=0.5 * plot.area, # Dummy baseline
        projected_sequestration=total_potential,
        verified_credits=0.0,
        vesting_end_date=vesting_date,
        additionality_score=initial_additionality,
        buffer_pool_percentage=15.0,
        verification_cost_usd=3000.0
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return ProjectResponse(
        id=new_project.id,
        plot_id=new_project.plot_id,
        plot_name=plot.name,
        methodology=new_project.methodology,
        status=new_project.status,
        projected_credits=new_project.projected_sequestration,
        verified_credits=new_project.verified_credits,
        available_credits=new_project.available_credits,
        locked_credits=new_project.locked_credits,
        start_date=new_project.start_date,
        vesting_end_date=new_project.vesting_end_date,
        verification_cost_usd=new_project.verification_cost_usd,
        buffer_pool_percentage=new_project.buffer_pool_percentage,
        additionality_score=new_project.additionality_score,
        requires_soil_sample=new_project.requires_soil_sample,
        evidence_count=0
    )

@router.post("/{project_id}/evidence")
async def upload_evidence(
    project_id: int,
    description: str,
    geo_lat: float,
    geo_lng: float,
    # file: UploadFile = File(...) # Simplified for demo, acting as metadata upload
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id, CarbonProject.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Create Evidence Record
    new_evidence = CarbonEvidence(
        project_id=project.id,
        description=description,
        geo_lat=geo_lat,
        geo_lng=geo_lng,
        image_url="https://via.placeholder.com/300?text=Farm+Evidence", # Mock
        verified=False
    )
    
    db.add(new_evidence)
    
    # Auto-update status to "Verification Pending" if it was Enrolled
    if project.status == "Enrolled":
        project.status = "Evidence_Pending"
        
    db.commit()
    
    return {"message": "Evidence uploaded successfully", "status": project.status}

@router.post("/{project_id}/verify")
async def trigger_verification(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(CarbonProject).filter(CarbonProject.id == project_id, CarbonProject.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.status != "Evidence_Pending":
        raise HTTPException(status_code=400, detail="Project not ready for verification (Upload evidence first)")
        
    # REALISTIC CONSTRAINT 1: Additionality Check (Reject Common Practices)
    # Simulate check: Is this practice >50% common in the region?
    # In production, this queries a registry database
    regional_adoption_rate = random.uniform(0.2, 0.7) # Mock data
    project.additionality_score = regional_adoption_rate
    
    if regional_adoption_rate > 0.5:
        project.status = "Audit_Failed"
        db.commit()
        return {
            "status": "REJECTED",
            "verified_credits": 0.0,
            "message": f"Additionality Check Failed: {project.methodology} is already common practice in your district ({int(regional_adoption_rate*100)}% adoption). Only novel practices qualify for credits."
        }
    
    # REALISTIC CONSTRAINT 2: Soil Sample Requirement
    if project.requires_soil_sample and len(project.evidence) < 2:
        raise HTTPException(
            status_code=400, 
            detail="Insufficient Evidence: Soil-based methodologies require at least 2 physical soil sample reports. Upload lab test results."
        )
    
    # Simulate Algorithmic Verification (Satellite + Evidence Match)
    success = random.choice([True, True, True, False]) # 75% success
    
    if success:
        project.status = "Verified"
        raw_credits = project.projected_sequestration
        
        # REALISTIC CONSTRAINT 3: Buffer Pool Deduction (15%)
        buffer_deduction = raw_credits * (project.buffer_pool_percentage / 100.0)
        project.locked_credits = buffer_deduction
        project.available_credits = raw_credits - buffer_deduction
        project.verified_credits = raw_credits # Total issued
        
        # REALISTIC CONSTRAINT 4: Vesting Period (5 years)
        from datetime import timedelta
        project.vesting_end_date = project.start_date + timedelta(days=5*365)
        
        # Update plot for backward compatibility
        project.plot.carbon_credits = project.available_credits
        project.plot.organic_score = 100.0
    else:
        project.status = "Audit_Failed"
        
    db.commit()
    
    return {
        "status": project.status,
        "total_credits_issued": project.verified_credits if success else 0.0,
        "buffer_pool_locked": project.locked_credits if success else 0.0,
        "available_for_sale": project.available_credits if success else 0.0,
        "vesting_end_date": project.vesting_end_date.isoformat() if success and project.vesting_end_date else None,
        "verification_cost_usd": project.verification_cost_usd,
        "message": f"Verification Complete - {int(project.buffer_pool_percentage)}% locked in buffer pool until {project.vesting_end_date.year if project.vesting_end_date else 'N/A'}" if success else "Verification Failed - Evidence unclear"
    }
