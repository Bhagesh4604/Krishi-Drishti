import sys
import os

# Add root directory to path so we can import backend modules
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.models import Scheme, CommunityPost, Listing, User, CommunityComment

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def seed_data():
    db: Session = SessionLocal()
    
    print("Seeding Schemes...")
    if db.query(Scheme).count() == 0:
        schemes = [
            Scheme(
                title="Pradhan Mantri Fasal Bima Yojana (PMFBY)",
                description="Provides insurance coverage and financial support to the farmers in the event of failure of any of the notified crop as a result of natural calamities, pests & diseases.",
                tag="NEW",
                deadline="Aug 30",
                benefits="Comprehensive insurance cover against crop failure.",
                eligibility="Land holding certificate required.",
                link="https://pmfby.gov.in/"
            ),
            Scheme(
                title="Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
                description="Aims to expand cultivable area under assured irrigation, improve on-farm water use efficiency into reduce wastage of water.",
                tag="EXPIRING",
                deadline="July 15",
                benefits="Subsidy up to 45% for Drip & Sprinkler irrigation.",
                eligibility="Soil test report mandatory.",
                link="https://pmksy.gov.in/"
            ),
            Scheme(
                title="Paramparagat Krishi Vikas Yojana (PKVY)",
                description="Promotes organic farming through a cluster-based approach and PGS certification.",
                tag="URGENT",
                deadline=None,
                benefits="Financial assistance of ₹50,000 per hectare for 3 years.",
                eligibility="Cluster of farmers required.",
                link="https://pgsindia-ncof.gov.in/"
            )
        ]
        db.add_all(schemes)
        db.commit()
    else:
        print("Schemes already exist.")

    print("Seeding Users and Community Posts...")
    # Ensure we have a few users
    user_names = ["Ramesh Patil", "Sita Devi", "Amit Singh"]
    users = []
    for name in user_names:
        u = db.query(User).filter(User.phone == f"987654321{user_names.index(name)}").first()
        if not u:
            u = User(
                phone=f"987654321{user_names.index(name)}", 
                name=name, 
                district="Nagpur", 
                land_size=2.5 + user_names.index(name),
                category="General"
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        users.append(u)

    if db.query(CommunityPost).count() == 0:
        posts = [
            CommunityPost(
                user_id=users[0].id,
                content="Great harvest this season! My organic mushrooms are ready for market.",
                image_url="https://picsum.photos/seed/farm1/800/800",
                likes_count=24
            ),
            CommunityPost(
                user_id=users[1].id,
                content="Quick tip on how to maintain soil moisture during high heat. Mulching is key!",
                image_url="https://picsum.photos/seed/farm2/800/800",
                likes_count=156
            ),
            CommunityPost(
                user_id=users[2].id,
                content="Checking out the new drip irrigation system. Looking promising!",
                image_url="https://picsum.photos/seed/farm3/800/800",
                likes_count=89
            )
        ]
        db.add_all(posts)
        db.commit()
    else:
        print("Community posts already exist.")

    print("Seeding Market Listings...")
    if db.query(Listing).count() == 0:
        listings = [
            Listing(
                seller_id=users[0].id,
                crop_name="Premium Organic Wheat",
                quantity="500kg",
                price="₹3200/quintal",
                location="Nagpur Mandi",
                description="High quality Sharbati wheat, chemical free.",
                is_organic=True,
                grade="A"
            ),
            Listing(
                seller_id=users[1].id,
                crop_name="Red Onions",
                quantity="2000kg",
                price="₹15/kg",
                location="Nashik",
                description="Fresh harvest, dry and large size.",
                is_organic=False,
                grade="B"
            ),
            Listing(
                seller_id=users[2].id,
                crop_name="Soybean",
                quantity="1000kg",
                price="₹4800/quintal",
                location="Amravati",
                description="Cleaned and graded soybean.",
                is_organic=False,
                grade="A"
            )
        ]
        db.add_all(listings)
        db.commit()
    else:
        print("Listings already exist.")

    print("Seeding Plots...")
    if db.query(Plot).count() == 0:
        plots = [
            Plot(
                user_id=users[0].id,
                name="North Field - Cotton",
                coordinates='[{"lat": 21.146, "lng": 79.089}, {"lat": 21.147, "lng": 79.089}, {"lat": 21.147, "lng": 79.090}, {"lat": 21.146, "lng": 79.090}]',
                area=2.5,
                crop_type="Cotton",
                health_score=0.92,
                moisture=35.0
            ),
            Plot(
                user_id=users[0].id,
                name="South Orchard - Orange",
                coordinates='[{"lat": 21.144, "lng": 79.088}, {"lat": 21.145, "lng": 79.088}, {"lat": 21.145, "lng": 79.089}, {"lat": 21.144, "lng": 79.089}]',
                area=4.0,
                crop_type="Orange",
                health_score=0.78,
                moisture=28.0
            )
        ]
        db.add_all(plots)
        db.commit()
    else:
        print("Plots already exist.")

    db.close()
    print("Seeding Complete!")

if __name__ == "__main__":
    seed_data()
