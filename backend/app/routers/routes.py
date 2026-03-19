"""
F4: Route Coverage Scorer
Generates routes and calculates shelter/linkway coverage percentage.
"""

from fastapi import APIRouter, Query
from app.services.spatial import calculate_route_coverage

router = APIRouter()


@router.get("/plan-route")
def plan_route(
    lat: float = Query(..., description="Start latitude"),
    lng: float = Query(..., description="Start longitude"),
    distance_km: float = Query(5.0, description="Desired run distance in km"),
    loop: bool = Query(True, description="Return to start point?"),
):
    """
    Generates 2-3 route options via OneMap and scores each by
    covered linkway percentage. Returns routes ranked by coverage.

    Sprint 2-3 feature — depends on Track A (PostGIS linkway data) completing first.
    """
    try:
        # TODO Sprint 2: Generate candidate routes via OneMap API
        # 1. If loop=True, generate waypoints in a rough circle at distance_km/2 radius
        # 2. Call OneMap routing for each candidate
        # 3. Decode the returned polyline into a GeoJSON LineString
        # 4. Pass to calculate_route_coverage() for linkway overlay
        # 5. Return routes ranked by coverage %

        return {
            "status": "not_implemented",
            "message": "Route generation requires OneMap integration + PostGIS linkway data. Target: Sprint 2.",
            "params_received": {
                "start": {"lat": lat, "lng": lng},
                "distance_km": distance_km,
                "loop": loop,
            },
        }

    except Exception as e:
        return {"error": "Route planning failed", "details": str(e)}
