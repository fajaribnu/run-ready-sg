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
async def plan_route(lat: float, lng: float, distance_km: float = 3.0, loop: bool = False):
    # Token Cleaning (Maintained from your working version)
    token = settings.ONEMAP_TOKEN.strip().replace("'", "").replace('"', "").replace("\n", "").replace("\r", "")
    token = token.replace("Bearer ", "").replace("bearer ", "")
    
    # 1. Snap starting point to road
    s_lat, s_lng = snap_to_nearest_road(lat, lng, token)
    
    features = []
    styles = [
        {"color": "#ff0000", "width": 10, "opacity": 0.4}, 
        {"color": "#0000ff", "width": 6,  "opacity": 0.6}, 
        {"color": "#00ff00", "width": 2,  "opacity": 1.0}
    ]

    for i in range(3):
        if loop:
            # Create a 'Triangle' loop to avoid walking back on the same road
            base_bearing = random.uniform(0, 360)
            # 3km / 3 legs = 1km per leg. We use 0.7km as search radius to account for road winding
            leg_dist = (distance_km / 3) * 0.7 
            
            # Point B (Target 1)
            b_lat, b_lng = get_point_at_distance(s_lat, s_lng, leg_dist, base_bearing)
            # Point C (Target 2 - offset by 100 degrees)
            c_lat, c_lng = get_point_at_distance(b_lat, b_lng, leg_dist, (base_bearing + 100) % 360)
            
            # Fetch the three legs
            res1 = fetch_onemap_raw(s_lat, s_lng, b_lat, b_lng, token)
            res2 = fetch_onemap_raw(b_lat, b_lng, c_lat, c_lng, token)
            res3 = fetch_onemap_raw(c_lat, c_lng, s_lat, s_lng, token)
            
            if res1[0] and res2[0] and res3[0]:
                # Combine all coordinates
                full_coords = res1[0] + res2[0][1:] + res3[0][1:]
                total_dist = res1[1] + res2[1] + res3[1]
                
                features.append({
                    "type": "Feature",
                    "properties": {
                        "route_id": i + 1,
                        "stroke": styles[i]["color"],
                        "stroke-width": styles[i]["width"],
                        "stroke-opacity": styles[i]["opacity"],
                        "distance_km": round(total_dist, 2)
                    },
                    "geometry": {"type": "LineString", "coordinates": [[p[1], p[0]] for p in full_coords]}
                })
        else:
            # Standard A-to-B Logic
            # For 3km walk, destination should be ~2.2km away in a straight line
            target_dist = distance_km * 0.75
            d_lat, d_lng = get_point_at_distance(s_lat, s_lng, target_dist, random.uniform(0, 360))
            
            coords, dist = fetch_onemap_raw(s_lat, s_lng, d_lat, d_lng, token)
            if coords:
                features.append({
                    "type": "Feature",
                    "properties": {
                        "route_id": i + 1,
                        "stroke": styles[i]["color"],
                        "stroke-width": styles[i]["width"],
                        "stroke-opacity": styles[i]["opacity"],
                        "distance_km": round(dist, 2)
                    },
                    "geometry": {"type": "LineString", "coordinates": [[p[1], p[0]] for p in coords]}
                })

    if not features:
        raise HTTPException(status_code=500, detail="OneMap failed to return route geometry.")

    return {"type": "FeatureCollection", "features": features}
