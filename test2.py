import sys
import os
sys.path.append(os.getcwd())

from backend.database import SessionLocal
from backend.models import User, Plot, CarbonProject, CarbonEvidence, PlotHistory

db = SessionLocal()
try:
    projects = db.query(CarbonProject).all()
    for p in projects:
        farmer = db.query(User).filter(User.id == p.user_id).first()
        plot = db.query(Plot).filter(Plot.id == p.plot_id).first()
        evidence = db.query(CarbonEvidence).filter(CarbonEvidence.project_id == p.id).all()
        ndvi_history = (
            db.query(PlotHistory)
            .filter(PlotHistory.plot_id == p.plot_id)
            .order_by(PlotHistory.date.asc())
            .all()
        )
        print(f"Project {p.id}: projected_sequestration={p.projected_sequestration}")
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
