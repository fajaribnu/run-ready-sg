import os
from dotenv import load_dotenv

load_dotenv()


def _env_bool(name: str, default: bool = False) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    # DB_HOST: str = os.getenv("DB_HOST", "runready-db.c3q46oykql8z.ap-southeast-1.rds.amazonaws.com")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "runready")
    DB_USER: str = os.getenv("DB_USER", "runready_user")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "RunReady2026Sg")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    )

    # --- API KEYS ---
    DATA_GOV_API_KEY: str = os.getenv("DATA_GOV_API_KEY", "")
    
    # This is the line that was missing!
    ONEMAP_TOKEN: str = os.getenv("ONEMAP_TOKEN", "")

    # --- AWS SETTINGS ---
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-southeast-1")
    SES_SENDER_EMAIL: str = os.getenv("SES_SENDER_EMAIL", "")

    # --- ONEMAP AUTH (CREDENTIALS) ---
    ONEMAP_EMAIL: str = os.getenv("ONEMAP_EMAIL", "")
    ONEMAP_PASSWORD: str = os.getenv("ONEMAP_PASSWORD", "")

    # --- CORS SETTINGS ---
    CORS_ORIGINS: list = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,https://dfiucv08q17cd.cloudfront.net",
    ).split(",")

    # --- AUTH SETTINGS ---
    AUTH_ENABLED: bool = _env_bool("AUTH_ENABLED", False)
    AUTH_PROVIDER_NAME: str = os.getenv("AUTH_PROVIDER_NAME", "Clerk")
    AUTH_ISSUER: str = os.getenv("AUTH_ISSUER", "")
    AUTH_JWKS_URL: str = os.getenv("AUTH_JWKS_URL", "")
    AUTH_AUTHORIZED_PARTIES: list[str] = [
        value.strip()
        for value in os.getenv("AUTH_AUTHORIZED_PARTIES", "").split(",")
        if value.strip()
    ]

    # --- NEA API ENDPOINTS ---
    NEA_V1_BASE = "https://api.data.gov.sg/v1/environment"
    NEA_V2_BASE = "https://api-open.data.gov.sg/v2/real-time/api"

    @property
    def nea_headers(self) -> dict:
        return {
            "User-Agent": "RunReady-SG/1.0",
            "x-api-key": self.DATA_GOV_API_KEY,
        }

settings = Settings()
