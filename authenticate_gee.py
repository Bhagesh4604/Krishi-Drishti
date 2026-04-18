import ee
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(Path(__file__).resolve().parent / ".env")

# Try to get project from env
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
DEAD_PROXY_VALUES = {"http://127.0.0.1:9", "https://127.0.0.1:9"}


def clear_dead_proxy_env():
    cleared = False
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "GIT_HTTP_PROXY", "GIT_HTTPS_PROXY"):
        value = (os.getenv(key) or "").strip().lower()
        if value in DEAD_PROXY_VALUES:
            os.environ.pop(key, None)
            cleared = True
    if cleared:
        print("Cleared dead proxy environment variables before Earth Engine auth.")

def authenticate_gee():
    clear_dead_proxy_env()
    try:
        if PROJECT_ID:
            print(f"Initializing with project: {PROJECT_ID}")
            ee.Initialize(project=PROJECT_ID)
        else:
            ee.Initialize()
        print("Google Earth Engine is successfully authenticated and initialized!")
    except Exception as e:
        print(f"Initialization failed: {e}")
        print("\n--- ACTION REQUIRED ---")
        print("1. You need a Google Cloud Project enabled for Earth Engine.")
        print("2. Visit: https://code.earthengine.google.com/register")
        print("3. Create/Select a project.")
        print("4. Add the Project ID to your .env file as: GOOGLE_CLOUD_PROJECT=your-project-id")
        
        try:
            print("\nAttempting to force fresh authentication...")
            # Force re-auth to overwrite stale credentials
            ee.Authenticate(force=True)
            
            # Initialize again
            if PROJECT_ID:
                ee.Initialize(project=PROJECT_ID)
            else:
                ee.Initialize()
                
            print("\nSUCCESS! Google Earth Engine is ready.")
            
        except Exception as auth_error:
            print(f"\nAuthentication Error: {auth_error}")
            err_str = str(auth_error).lower()
            
            if "permission" in err_str or "serviceusage" in err_str:
                print("\n--- PERMISSION ISSUE DETECTED ---")
                print(f"1. API ENABLED? Validation: The screenshot confirmed this is done.")
                print(f"2. IAM ROLE? You must be 'Owner' or 'Editor' of the project.")
                print(f"   Check your role here: https://console.cloud.google.com/iam-admin/iam?project={PROJECT_ID}")
                print("   Ensure your email is listed with 'Owner' role.")
                print("\n3. If you just enabled the API, please WAIT 2-3 MINUTES and try again.")
            else:
                 print("\n--- UNEXPECTED ERROR ---")
                 print("Try deleting the credentials file manually at: %UserProfile%\\.config\\earthengine\\credentials")

if __name__ == "__main__":
    authenticate_gee()
