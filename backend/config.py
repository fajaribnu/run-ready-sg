import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # ... existing DB settings ...
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "runready")
    DB_USER: str = os.getenv("DB_USER", "runready_user")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "changeme")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    )

    # --- ADD THIS LINE HERE ---
    ONEMAP_TOKEN: str = os.getenv("ONEMAP_TOKEN", "")

    DATA_GOV_API_KEY: str = os.getenv("DATA_GOV_API_KEY", "")
    
    # ... rest of your settings ...
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-southeast-1")
    SES_SENDER_EMAIL: str = os.getenv("SES_SENDER_EMAIL", "")

    ONEMAP_EMAIL: str = os.getenv("ONEMAP_EMAIL", "")
    ONEMAP_PASSWORD: str = os.getenv("ONEMAP_PASSWORD", "")

    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    
    # NEA API endpoints
    NEA_V1_BASE = "https://api.data.gov.sg/v1/environment"
    NEA_V2_BASE = "https://api-open.data.gov.sg/v2/real-time/api"

    @property
    def nea_headers(self) -> dict:
        return {
            "User-Agent": "RunReady-SG/1.0",
            "x-api-key": self.DATA_GOV_API_KEY,
        }

settings = Settings()
