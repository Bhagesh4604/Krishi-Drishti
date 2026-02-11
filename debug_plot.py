from fastapi.testclient import TestClient
from backend.main import app
from backend.dependencies import get_current_user
from backend.models import User

# Mock Authentication to bypass login
async def mock_get_current_user():
    return User(id=1, phone="1234567890", name="Test Farmer")

app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

def test_create_plot_debug():
    print("Attempting to create plot...")
    payload = {
        "name": "Debug Plot",
        "coordinates": [
            {"lat": 21.1, "lng": 79.1},
            {"lat": 21.2, "lng": 79.2},
            {"lat": 21.1, "lng": 79.2},
            {"lat": 21.1, "lng": 79.1}
        ],
        "area": 1.5,
        "crop_type": "Wheat"
    }
    
    try:
        response = client.post("/api/plots/", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
    except Exception as e:
        print(f"CRITICAL FASTAPI ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_create_plot_debug()
