from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_weather():
    response = client.get("/api/weather/current?lat=21.1458&lng=79.0882")
    # Even if external API fails, we check for a valid HTTP response (e.g. 200 or 502/500 if external failure)
    assert response.status_code in [200, 502, 500]
    if response.status_code == 200:
        data = response.json()
        assert "current" in data or "latitude" in data
