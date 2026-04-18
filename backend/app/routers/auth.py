from fastapi import APIRouter, Depends

from app.auth import AuthenticatedUser, get_optional_authenticated_user
from app.config import settings


router = APIRouter()


@router.get("/auth/me")
def get_auth_session(
    user: AuthenticatedUser | None = Depends(get_optional_authenticated_user),
):
    if user is None:
        return {
            "authenticated": False,
            "auth_enabled": settings.AUTH_ENABLED,
            "provider": settings.AUTH_PROVIDER_NAME,
            "user": None,
        }

    return {
        "authenticated": True,
        "auth_enabled": True,
        "provider": settings.AUTH_PROVIDER_NAME,
        "user": {
            "sub": user.subject,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
        },
    }
