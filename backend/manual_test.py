import boto3
from botocore.exceptions import ClientError

# 1. Setup - Use the same region as your SES Identity
REGION = "ap-southeast-1" 
SENDER = "alerts@runready.xyz"  # Must be your PENDING/VERIFIED identity
RECIPIENT = "keefechan@yahoo.com.sg" # If in Sandbox, this must also be verified

client = boto3.client('ses', region_name=REGION)

print(f"--- Attempting to send test email from {SENDER} ---")

try:
    response = client.send_email(
        Destination={'ToAddresses': [RECIPIENT]},
        Message={
            'Body': {
                'Text': {'Data': "Test email from EC2 using Boto3."}
            },
            'Subject': {'Data': "AWS SES Manual Test"},
        },
        Source=SENDER,
    )
except ClientError as e:
    print("\n❌ TEST FAILED!")
    print(f"Error Message: {e.response['Error']['Message']}")
    print(f"Error Code: {e.response['Error']['Code']}")
else:
    print("\n✅ TEST SUCCESS!")
    print(f"Message ID: {response['MessageId']}")
