import math
import random
import requests
import polyline
import logging
from fastapi import APIRouter, HTTPException, Query
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
    dest_lat: float = Query(None),
    dest_lng: float = Query(None),
):
    from app.services.spatial import calculate_route_coverage, count_shelters_along_route

    token = settings.ONEMAP_TOKEN.strip().replace("'", "").replace('"', "").replace("\n", "").replace("\r", "")
    token = token.replace("Bearer ", "").replace("bearer ", "")

    # Snap starting point
    s_lat, s_lng = snap_to_nearest_road(lat, lng, token)
    routes = []

    def build_route(route_id, coords, dist):
        geojson = {"type": "LineString", "coordinates": [[p[1], p[0]] for p in coords]}
        return {
            "id": route_id,
            "distance_km": round(dist, 2),
            "coverage_pct": calculate_route_coverage(geojson),
            "polyline": polyline.encode(coords),
            "shelters_along_route": count_shelters_along_route(geojson),
        }

    for i in range(3):
        coords_to_use = None
        final_dist = 0

        # --- SCENARIO C: POINT-TO-POINT ---
        if dest_lat is not None and dest_lng is not None:
            d_lat, d_lng = snap_to_nearest_road(dest_lat, dest_lng, token)
            
            # Using 0.6 factor to allow for detour without overshooting
            detour_angle = (i * 60) + random.uniform(0, 30)
            mid_lat, mid_lng = get_point_at_distance(s_lat, s_lng, (distance_km * 0.6) / 2, detour_angle)
            
            res1 = fetch_onemap_raw(s_lat, s_lng, mid_lat, mid_lng, token)
            res2 = fetch_onemap_raw(mid_lat, mid_lng, d_lat, d_lng, token)
            
            if res1[0] and res2[0]:
                coords_to_use = res1[0] + res2[0][1:]
                coords_to_use[-1] = (d_lat, d_lng) # Force destination closure
                final_dist = res1[1] + res2[1]

        # --- SCENARIO B: LOOP ---
        elif loop:
            # Using 0.55 factor because 3 segments accumulate significantly more road-winding
            leg_dist = (distance_km * 0.55) / 3
            base_bearing = (i * 120) + random.uniform(0, 20)
            
            b_lat, b_lng = get_point_at_distance(s_lat, s_lng, leg_dist, base_bearing)
            c_lat, c_lng = get_point_at_distance(b_lat, b_lng, leg_dist, (base_bearing + 120) % 360)

            res1 = fetch_onemap_raw(s_lat, s_lng, b_lat, b_lng, token)
            res2 = fetch_onemap_raw(b_lat, b_lng, c_lat, c_lng, token)
            res3 = fetch_onemap_raw(c_lat, c_lng, s_lat, s_lng, token)

            all_segments = []
            accumulated_dist = 0
            for res in [res1, res2, res3]:
                if res[0]:
                    if not all_segments:
                        all_segments.extend(res[0])
                    else:
                        all_segments.extend(res[0][1:])
                    accumulated_dist += res[1]

            if all_segments:
                all_segments[-1] = (s_lat, s_lng) # Force loop closure
                coords_to_use = all_segments
                final_dist = accumulated_dist
        
        # --- SCENARIO A: RANDOM DIRECTION ---
        else:
            # Using 0.9 factor because simple one-way paths are more direct
            target_pt_dist = distance_km * 0.9
            e_lat, e_lng = get_point_at_distance(s_lat, s_lng, target_pt_dist, random.uniform(0, 360))
            coords_to_use, final_dist = fetch_onemap_raw(s_lat, s_lng, e_lat, e_lng, token)

        if coords_to_use:
            routes.append(build_route(i + 1, coords_to_use, final_dist))

    if not routes:
        raise HTTPException(status_code=500, detail="Route generation failed. Check coordinates or API token.")

    return {"routes": routes}
