import time
from unittest.mock import patch

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.routing import APIRoute
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import require_authenticated_user
from app.config import settings
from app.routers import auth as auth_router
from app.routers import decision

with patch("app.database.init_db"), patch("app.database.close_db"):
    from app.main import app


class DummySigningKey:
    def __init__(self, key):
        self.key = key


class DummyJWKClient:
    def __init__(self, key):
        self.key = key

    def get_signing_key_from_jwt(self, token: str):
        return DummySigningKey(self.key)


@pytest.fixture
def rsa_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


@pytest.fixture(autouse=True)
def restore_auth_settings():
    original = {
        "AUTH_ENABLED": settings.AUTH_ENABLED,
        "AUTH_PROVIDER_NAME": settings.AUTH_PROVIDER_NAME,
        "AUTH_ISSUER": settings.AUTH_ISSUER,
        "AUTH_JWKS_URL": settings.AUTH_JWKS_URL,
        "AUTH_AUTHORIZED_PARTIES": settings.AUTH_AUTHORIZED_PARTIES,
    }
    yield
    for key, value in original.items():
        setattr(settings, key, value)


def configure_auth():
    settings.AUTH_ENABLED = True
    settings.AUTH_PROVIDER_NAME = "Clerk"
    settings.AUTH_ISSUER = "https://issuer.example.com"
    settings.AUTH_JWKS_URL = "https://issuer.example.com/.well-known/jwks.json"
    settings.AUTH_AUTHORIZED_PARTIES = ["http://localhost:5173"]


def make_clerk_style_token(private_key, **overrides):
    payload = {
        "sub": "user_123",
        "email": "runner@example.com",
        "name": "Run Ready Tester",
        "iss": "https://issuer.example.com",
        "azp": "http://localhost:5173",
        "sid": "sess_123",
        "exp": int(time.time()) + 300,
    }
    payload.update(overrides)
    return jwt.encode(payload, private_key, algorithm="RS256")


def get_route(path: str, method: str = "GET") -> APIRoute:
    for route in app.routes:
        if isinstance(route, APIRoute) and route.path == path and method in route.methods:
            return route
    raise AssertionError(f"Route {method} {path} was not registered.")


def test_check_run_stays_public_when_auth_is_enabled():
    configure_auth()

    weather_payload = {
        "area_name": "Bishan",
        "forecast": "Fair",
        "temperature": "29.5",
        "wbgt": "28.2",
        "warnings": [],
    }

    with patch("app.routers.decision.get_localized_weather", return_value=weather_payload):
        response = decision.check_run(lat=1.35, lng=103.82)

    assert response["status"] == "SAFE"


def test_missing_bearer_token_is_rejected_when_auth_is_enabled():
    configure_auth()

    with pytest.raises(HTTPException) as exc:
        require_authenticated_user(None)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Authentication required."


def test_valid_bearer_token_returns_authenticated_user(rsa_keypair):
    configure_auth()
    private_key, public_key = rsa_keypair
    token = make_clerk_style_token(private_key)

    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token,
    )

    with patch("app.auth._get_jwks_client", return_value=DummyJWKClient(public_key)):
        user = require_authenticated_user(credentials)

    assert user is not None
    assert user.subject == "user_123"
    assert user.email == "runner@example.com"


def test_auth_me_returns_authenticated_user_profile(rsa_keypair):
    configure_auth()
    private_key, public_key = rsa_keypair
    token = make_clerk_style_token(private_key, preferred_username="runner")
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token,
    )

    with patch("app.auth._get_jwks_client", return_value=DummyJWKClient(public_key)):
        user = require_authenticated_user(credentials)

    response = auth_router.get_auth_session(user=user)

    assert response["authenticated"] is True
    assert response["provider"] == "Clerk"
    assert response["user"]["email"] == "runner@example.com"
    assert response["user"]["name"] == "Run Ready Tester"


def test_locked_feature_routes_register_the_auth_dependency():
    protected_paths = {
        "/api/find-shelter",
        "/api/best-times",
        "/api/plan-route",
    }

    for path in protected_paths:
        route = get_route(path)
        dependency_calls = {dependency.call for dependency in route.dependant.dependencies}
        assert require_authenticated_user in dependency_calls

    check_run_route = get_route("/api/check-run")
    public_dependency_calls = {
        dependency.call for dependency in check_run_route.dependant.dependencies
    }
    assert require_authenticated_user not in public_dependency_calls
