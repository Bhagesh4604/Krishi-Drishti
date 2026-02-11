import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_search():
    print("Testing Search...")
    try:
        resp = requests.get(f"{BASE_URL}/weather/search?query=Nagpur")
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Search Failed: {e}")

def test_create_plot():
    print("\nTesting Create Plot...")
    # adapting to whatever auth mechanism is needed, or just testing the handler if possible
    # For now, let's see if we can hit it. If it requires auth, we might get 401.
    # But usually locally we might be able to bypass if we have a token, 
    # OR we can assume the user is logged in on frontend.
    # If 401, we know the endpoint works but needs auth. 
    # If 500, functionality is broken.
    try:
        payload = {
            "name": "Test Plot API",
            "coordinates": [
                {"lat": 21.1, "lng": 79.1},
                {"lat": 21.2, "lng": 79.2},
                {"lat": 21.1, "lng": 79.2},
                {"lat": 21.1, "lng": 79.1}
            ],
            "area": 1.5,
            "crop_type": "Wheat"
        }
        # We need a token. Let's try to login first if this fails?
        # Or just check if the backend crashes.
        resp = requests.post(f"{BASE_URL}/plots/", json=payload)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Create Plot Error: {e}")

if __name__ == "__main__":
    test_search()
    test_create_plot()
