import sys
import os
sys.path.append(os.getcwd())

from backend.database import SessionLocal
from backend.models import User, Plot, CarbonProject

db = SessionLocal()
try:
    farmers = db.query(User).all()
    for farmer in farmers:
        plots = db.query(Plot).filter(Plot.user_id == farmer.id).all()
        projects = db.query(CarbonProject).filter(CarbonProject.user_id == farmer.id).all()
        total_credits = sum(p.verified_credits for p in projects)
        total_available = sum(p.available_credits for p in projects)
        print(f"Farmer {farmer.id} OK")
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
