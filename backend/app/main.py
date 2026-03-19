from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db, close_db
from app.routers import decision, shelter, routes, alerts, timeslots


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register feature routers
app.include_router(decision.router, prefix="/api", tags=["Decision Engine"])
app.include_router(shelter.router, prefix="/api", tags=["Shelter Finder"])
app.include_router(routes.router, prefix="/api", tags=["Route Planner"])
app.include_router(alerts.router, prefix="/api", tags=["Weather Alerts"])
app.include_router(timeslots.router, prefix="/api", tags=["Time Slot Finder"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "runready-sg"}
