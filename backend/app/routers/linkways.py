from fastapi import APIRouter, Query
from app.services.spatial import get_linkways_in_view

router = APIRouter()


@router.get("/linkways")
async def get_linkways(
    min_lat: float = Query(..., description="Minimum latitude of bounding box"),
    min_lng: float = Query(..., description="Minimum longitude of bounding box"),
    max_lat: float = Query(..., description="Maximum latitude of bounding box"),
    max_lng: float = Query(..., description="Maximum longitude of bounding box"),
):
    """
    Returns all covered linkways within the given bounding box as GeoJSON.
    Used to render linkway overlays on the route map.
    """
    return get_linkways_in_view(min_lat, min_lng, max_lat, max_lng)
