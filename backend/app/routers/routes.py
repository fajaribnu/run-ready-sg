import math
import random
import requests
import polyline
import logging
from fastapi import APIRouter, HTTPException
from app.config import settings 

router = APIRouter()
logging.basicConfig(level=logging.INFO)

EARTH_RADIUS_KM = 6371.0

# --- HELPER FUNCTIONS ---

def get_point_at_distance(lat, lng, distance_km, bearing_degrees):
    lat1, lng1 = math.radians(lat), math.radians(lng)
    brng = math.radians(bearing_degrees)
    d_r = distance_km / EARTH_RADIUS_KM
    
    lat2 = math.asin(math.sin(lat1) * math.cos(d_r) + 
                     math.cos(lat1) * math.sin(d_r) * math.cos(brng))
    lng2 = lng1 + math.atan2(math.sin(brng) * math.sin(d_r) * math.cos(lat1),
                             math.cos(d_r) - math.sin(lat1) * math.sin(lat2))
    return math.degrees(lat2), math.degrees(lng2)

def snap_to_nearest_road(lat, lng, token):
    url = "https://www.onemap.gov.sg/api/public/revgeocodexy"
    headers = {"Authorization": token}
    params = {"location": f"{lat},{lng}", "buffer": 100, "addressType": "All"}
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get("GeocodeInfo"):
                best_match = data["GeocodeInfo"][0]
                return float(best_match["LATITUDE"]), float(best_match["LONGITUDE"])
    except Exception as e:
        logging.error(f"Snapping failed: {e}")
    return lat, lng

def fetch_onemap_raw(s_lat, s_lng, e_lat, e_lng, token):
    url = "https://www.onemap.gov.sg/api/public/routingsvc/route"
    headers = {"Authorization": token, "Accept": "application/json"}
    params = {"start": f"{s_lat},{s_lng}", "end": f"{e_lat},{e_lng}", "routeType": "walk"}
    
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "route_geometry" in data and data["route_geometry"]:
                raw_geom = data["route_geometry"]
                coords = polyline.decode(raw_geom) if isinstance(raw_geom, str) else raw_geom
                dist = data["route_summary"]["total_distance"] / 1000
                return coords, dist
    except Exception as e:
        logging.error(f"OneMap call failed: {e}")
    return None, 0

# --- MAIN ENDPOINT ---

@router.get("/plan-route")
async def plan_route(
    lat: float,
    lng: float,
    distance_km: float = 3.0,
    loop: bool = False,
    dest_lat: float = None,
    dest_lng: float = None,
):
    from app.services.spatial import calculate_route_coverage, count_shelters_along_route

    token = settings.ONEMAP_TOKEN.strip().replace("'", "").replace('"', "").replace("\n", "").replace("\r", "")
    token = token.replace("Bearer ", "").replace("bearer ", "")

    s_lat, s_lng = snap_to_nearest_road(lat, lng, token)

    routes = []

    def build_route(route_id, coords, dist):
        """Convert raw coords to the frontend contract format."""
        geojson = {"type": "LineString", "coordinates": [[p[1], p[0]] for p in coords]}
        return {
            "id": route_id,
            "distance_km": round(dist, 2),
            "coverage_pct": calculate_route_coverage(geojson),
            "polyline": polyline.encode(coords),
            "shelters_along_route": count_shelters_along_route(geojson),
        }

    # --- Point-to-point: user picked a specific destination ---
    if dest_lat is not None and dest_lng is not None:
        coords, dist = fetch_onemap_raw(s_lat, s_lng, dest_lat, dest_lng, token)
        if coords:
            routes.append(build_route(1, coords, dist))
    else:
        # --- Distance-based: generate 3 random routes ---
        for i in range(3):
            if loop:
                base_bearing = random.uniform(0, 360)
                leg_dist = (distance_km / 3) * 0.7
                b_lat, b_lng = get_point_at_distance(s_lat, s_lng, leg_dist, base_bearing)
                c_lat, c_lng = get_point_at_distance(b_lat, b_lng, leg_dist, (base_bearing + 100) % 360)

                res1 = fetch_onemap_raw(s_lat, s_lng, b_lat, b_lng, token)
                res2 = fetch_onemap_raw(b_lat, b_lng, c_lat, c_lng, token)
                res3 = fetch_onemap_raw(c_lat, c_lng, s_lat, s_lng, token)

                if res1[0] and res2[0] and res3[0]:
                    full_coords = res1[0] + res2[0][1:] + res3[0][1:]
                    total_dist = res1[1] + res2[1] + res3[1]
                    routes.append(build_route(i + 1, full_coords, total_dist))
            else:
                target_dist = distance_km * 0.75
                d_lat, d_lng = get_point_at_distance(s_lat, s_lng, target_dist, random.uniform(0, 360))
                coords, dist = fetch_onemap_raw(s_lat, s_lng, d_lat, d_lng, token)
                if coords:
                    routes.append(build_route(i + 1, coords, dist))

    if not routes:
        raise HTTPException(status_code=500, detail="OneMap failed to return route geometry.")

    return {"routes": routes}
