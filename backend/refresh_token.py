import requests
import os
import re

# Load credentials from current environment
from dotenv import load_dotenv
load_dotenv()

EMAIL = os.getenv("ONEMAP_EMAIL")
PASSWORD = os.getenv("ONEMAP_PASSWORD")
ENV_FILE = ".env"

def update_env_file(key, value):
    """Manually updates the .env file without adding quotes."""
    if not os.path.exists(ENV_FILE):
        with open(ENV_FILE, "w") as f:
            f.write(f"{key}={value}\n")
        return

    with open(ENV_FILE, "r") as f:
        lines = f.readlines()

    updated = False
    with open(ENV_FILE, "w") as f:
        for line in lines:
            # If the line starts with our key, replace it
            if line.startswith(f"{key}="):
                f.write(f"{key}={value}\n")
                updated = True
            else:
                f.write(line)
        
        # If the key wasn't there, add it
        if not updated:
            f.write(f"{key}={value}\n")

def refresh_onemap_token():
    url = "https://www.onemap.gov.sg/api/auth/post/getToken"
    payload = {"email": EMAIL, "password": PASSWORD}
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            # Get raw token and strip any existing quotes just in case
            raw_token = response.json().get("access_token")
            clean_token = raw_token.strip().replace('"', '').replace("'", "")
            
            # Use our manual writer to avoid auto-quoting
            update_env_file("ONEMAP_TOKEN", clean_token)
            
            print("✅ Successfully updated .env with a raw token (no quotes)!")
        else:
            print(f"❌ Error from OneMap: {response.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    refresh_onemap_token()
