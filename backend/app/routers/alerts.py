import os
import boto3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from botocore.exceptions import ClientError

# --- CONFIG & SETUP ---
# Pulling from your .env file
AWS_REGION = "ap-southeast-1" 
SES_SENDER = os.getenv("SES_SENDER_EMAIL", "alerts@runready.xyz")

router = APIRouter(prefix="/alerts", tags=["F3: Weather Alerts"])

# --- INTERNAL EMAIL HELPER ---
class EmailService:
    def __init__(self):
        self.ses = boto3.client(
            'ses',
            region_name=AWS_REGION,
            # AWS_ACCESS_KEY_ID and SECRET are pulled automatically from .env
        )

    def send_lightning_alert(self, to_email: str, location: str):
        try:
            self.ses.send_email(
                Source=SES_SENDER,
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Subject': {'Data': f"⚠️ RunReady: Lightning Alert ({location})"},
                    'Body': {
                        'Text': {
                            'Data': f"Safety Warning: Lightning detected near {location}. Please seek cover in the nearest shelter."
                        }
                    }
                }
            )
            return True
        except ClientError as e:
            print(f"SES Error: {e.response['Error']['Message']}")
            return False

mailer = EmailService()

# --- MODELS ---
class AlertSubscription(BaseModel):
    email: str
    lat: float
    lng: float
    label: Optional[str] = "Saved Location"

# --- ENDPOINTS ---

@router.post("/subscribe")
async def subscribe_alert(sub: AlertSubscription):
    """
    F3: Save user subscription to DB.
    Matches Track A schema: alert_subscriptions (email, lat, lng, label)
    """
    # TODO: db.execute("INSERT INTO alert_subscriptions...")
    return {
        "status": "success",
        "message": f"Alerts activated for {sub.email}",
        "data": sub.model_dump()
    }

@router.get("/check")
async def check_alerts():
    """
    The Brain: Called by ingestion pipeline to evaluate thresholds.
    """
    # 1. Fetch active subscriptions from DB
    # 2. Get latest lightning data from weather_snapshots table
    
    # --- TEST LOGIC ---
    # Replace with your own email for the Sandbox test
    test_email = "your-verified-email@gmail.com" 
    
    # Simulating a breach (e.g., NEA returns 'Thundery Showers')
    is_dangerous = True 

    if is_dangerous:
        success = mailer.send_lightning_alert(test_email, "Bishan Park")
        if success:
            return {"status": "success", "info": f"Alert sent to {test_email}"}
        else:
            raise HTTPException(status_code=500, detail="SES failed. Check AWS Region/Identity.")

    return {"status": "clear", "message": "No lightning detected."}
