import requests
import json

try:
    response = requests.get("http://127.0.0.1:8000/api/weather/")
    data = response.json()
    with open('weather_response.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("Saved to weather_response.json")
except Exception as e:
    print(f"Error: {e}")
