import requests
import sys

BASE_URL = "http://127.0.0.1:8000"
OUTPUT_FILE = "debug_output.txt"

def test_endpoint(file, path, method="GET"):
    url = f"{BASE_URL}{path}"
    try:
        file.write(f"Testing {method} {path}...\n")
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url)
        
        file.write(f"  Status: {response.status_code}\n")
        file.write(f"  Content-Type: {response.headers.get('Content-Type')}\n")
        if response.status_code != 404:
            file.write(f"  Response: {response.text[:200]}\n")
        else:
            file.write("  !! 404 Not Found !!\n")
        file.write("-" * 20 + "\n")
            
    except requests.exceptions.ConnectionError:
        file.write(f"Testing {method} {path}: Connection Refused (Backend might not be running)\n")
    except Exception as e:
        file.write(f"Testing {method} {path}: Error {e}\n")

if __name__ == "__main__":
    with open(OUTPUT_FILE, "w") as f:
        f.write(f"Checking backend at {BASE_URL}...\n")
        test_endpoint(f, "/")
        test_endpoint(f, "/health")
        test_endpoint(f, "/api/market/")
        test_endpoint(f, "/api/auth/docs") 
        test_endpoint(f, "/docs")
