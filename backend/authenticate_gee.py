import ee

try:
    print("Initiating Google Earth Engine Authentication...")
    print("This will open a browser window for you to log in to your Google Account.")
    ee.Authenticate()
    print("Authentication successful! Now initializing...")
    ee.Initialize()
    print("Google Earth Engine is now connected and real satellite data is enabled!")
except Exception as e:
    print(f"Error: {e}")
