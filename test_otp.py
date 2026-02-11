
import requests

url = "http://127.0.0.1:8000/api/auth/verify-otp"
data = {"phone": "9999999999", "otp": "0000"}

try:
    print(f"Sending request to {url} with data: {data}")
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
