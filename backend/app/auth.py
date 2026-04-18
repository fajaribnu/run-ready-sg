from __future__ import annotations

from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings


bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    subject: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None
    claims: dict[str, Any]


def _auth_not_configured_error() -> RuntimeError:
    return RuntimeError(
        "Authentication is enabled but AUTH_ISSUER, AUTH_JWKS_URL, and "
        "AUTH_AUTHORIZED_PARTIES must be configured."
    )


def _resolve_issuer() -> str:
    issuer = settings.AUTH_ISSUER.strip()
    if not issuer:
        raise _auth_not_configured_error()
    return issuer


def _resolve_jwks_url() -> str:
    jwks_url = settings.AUTH_JWKS_URL.strip()
    if not jwks_url:
        raise _auth_not_configured_error()
    return jwks_url


@lru_cache(maxsize=4)
def _build_jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(jwks_url)


def _get_jwks_client() -> jwt.PyJWKClient:
    return _build_jwks_client(_resolve_jwks_url())


def _validate_client_claims(payload: dict[str, Any]) -> None:
    expected_authorized_parties = settings.AUTH_AUTHORIZED_PARTIES

    if not expected_authorized_parties:
        raise _auth_not_configured_error()

    if expected_authorized_parties:
        authorized_party = str(payload.get("azp", "")).strip()
        if not authorized_party or authorized_party not in expected_authorized_parties:
            raise jwt.InvalidAudienceError(
                "Token authorized party does not match the configured frontend origin."
            )


def _decode_token(token: str) -> dict[str, Any]:
    if not settings.AUTH_ENABLED:
        return {}

    issuer = _resolve_issuer()
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=issuer,
        options={"verify_aud": False},
    )
    _validate_client_claims(payload)
    return payload


def _to_authenticated_user(payload: dict[str, Any]) -> AuthenticatedUser:
    subject = str(payload.get("sub", "")).strip()
    if not subject:
        raise jwt.InvalidTokenError("Token is missing the subject claim.")

    return AuthenticatedUser(
        subject=subject,
        email=payload.get("email"),
        name=payload.get("name")
        or payload.get("preferred_username")
        or payload.get("cognito:username"),
        picture=payload.get("picture"),
        claims=payload,
    )


def _verify_token_or_raise(token: str) -> AuthenticatedUser:
    try:
        payload = _decode_token(token)
        return _to_authenticated_user(payload)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


def get_optional_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser | None:
    if not settings.AUTH_ENABLED:
        return None
    if credentials is None:
        return None
    return _verify_token_or_raise(credentials.credentials)


def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser | None:
    if not settings.AUTH_ENABLED:
        return None
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _verify_token_or_raise(credentials.credentials)
