"""
F2: Find Shelter Now
One-tap nearest shelter finder with walking route via OneMap.
"""

from fastapi import APIRouter, Depends, Query

from app.auth import require_authenticated_user
from app.services.spatial import find_nearest_shelters

router = APIRouter()


@router.get("/find-shelter")
def find_shelter(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    limit: int = Query(3, description="Number of shelters to return"),
    _user=Depends(require_authenticated_user),
):
    """
    Returns the nearest shelters to the user's location.
    Each shelter includes name, type, coordinates, and walking distance.
    """
    try:
        shelters = find_nearest_shelters(lat, lng, limit=limit)

        # TODO: For each shelter, call OneMap routing API to get
        # actual walking route (encoded polyline) and estimated time.
        # For now, return straight-line distance.

        return {
            "user_location": {"lat": lat, "lng": lng},
            "shelters": [
                {
                    "name": s["name"],
                    "type": s["shelter_type"],
                    "lat": s["lat"],
                    "lng": s["lng"],
                    "distance_m": round(s["distance_m"]),
                    "walk_time_min": round(s["distance_m"] / 80),  # ~80m/min walking
                    "route_polyline": None,  # TODO: OneMap integration
                }
                for s in shelters
            ],
        }

    except Exception as e:
        return {"error": "Shelter lookup failed", "details": str(e)}
