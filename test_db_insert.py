
from backend.database import SessionLocal, engine, Base
from backend.models import User
from datetime import datetime
import traceback

# Bind metadata
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    print("Attempting to insert user...")
    user = User(phone="8888888888", created_at=datetime.utcnow())
    db.add(user)
    db.commit()
    print("User inserted successfully!")
except Exception:
    with open("error.log", "w") as f:
        f.write(traceback.format_exc())
    print("Error occurred. Check error.log")
finally:
    db.close()
