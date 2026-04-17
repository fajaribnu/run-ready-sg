from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db, close_db
from app.routers import decision, shelter, routes, alerts, timeslots, linkways


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown
    close_db()


app = FastAPI(
    title="RunReady SG Engine",
    description="Weather-safe running & PE decision support API",
    version="1.0.0",
    lifespan=lifespan,
)

if isinstance(settings.CORS_ORIGINS, str):
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
else:
    origins = settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(decision.router, prefix="/api", tags=["Decision Engine"])
app.include_router(shelter.router, prefix="/api", tags=["Shelter"])
app.include_router(routes.router, prefix="/api", tags=["Routes"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(timeslots.router, prefix="/api", tags=["Timeslots"])
app.include_router(linkways.router, prefix="/api", tags=["Spatial"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "runready-sg"}
