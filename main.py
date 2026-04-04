from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import requests

app = FastAPI(title="RunReady SG Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Example placeholder config:
DB_CONFIG = {
    "host": "localhost",  # or local IP / AWS RDS endpoint
    "dbname": "<db_name>",
    "user": "<db_username>",
    "password": "<db_password>",
    "port": 5432
}

OSRM_BASE_URL = "https://router.project-osrm.org"


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


def get_nearest_shelters(lat: float, lng: float, radius_m: int = 5000, limit: int = 10):
    """
    Returns nearby shelters within radius, sorted by distance.
    This version matches the simplified facilities table:
    id, name, facility_type, lat, lon, geom
    """
    query = """
    SELECT
        id,
        name,
        facility_type,
        lat,
        lon,
        ST_Distance(
            geom::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
        ) AS distance_m
    FROM facilities
    WHERE ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
      )
      AND (
            facility_type ILIKE %s
            OR facility_type = %s
      )
    ORDER BY distance_m
    LIMIT %s;
    """

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    lng, lat,          # for ST_Distance
                    lng, lat,          # for ST_DWithin
                    radius_m,
                    "%SHELTER%",       # park shelters, rain shelters, etc.
                    "CIVIL_DEFENCE",   # csv-ingested shelters
                    limit
                )
            )
            return cur.fetchall()
    finally:
        conn.close()


def get_shelter_by_id(shelter_id: int):
    query = """
    SELECT
        id,
        name,
        facility_type,
        lat,
        lon
    FROM facilities
    WHERE id = %s
      AND (
            facility_type ILIKE %s
            OR facility_type = %s
      )
    LIMIT 1;
    """

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, (shelter_id, "%SHELTER%", "CIVIL_DEFENCE"))
            return cur.fetchone()
    finally:
        conn.close()


def get_route_osrm(user_lat: float, user_lng: float, dest_lat: float, dest_lng: float):
    """
    Uses OSRM public demo server for walking route.
    Returns GeoJSON LineString coordinates suitable for frontend map drawing.
    """
    url = (
        f"{OSRM_BASE_URL}/route/v1/foot/"
        f"{user_lng},{user_lat};{dest_lng},{dest_lat}"
        f"?overview=full&geometries=geojson&steps=true"
    )

    response = requests.get(url, timeout=20)
    response.raise_for_status()
    data = response.json()

    if not data.get("routes"):
        raise ValueError("No route found.")

    route = data["routes"][0]

    return {
        "distance_m": route["distance"],
        "duration_s": route["duration"],
        "geometry": route["geometry"],
        "legs": route.get("legs", [])
    }


@app.get("/api/nearby-shelters")
def nearby_shelters(
    lat: float,
    lng: float,
    radius_m: int = Query(default=5000, ge=1),
    limit: int = Query(default=10, ge=1, le=50)
):
    try:
        rows = get_nearest_shelters(lat=lat, lng=lng, radius_m=radius_m, limit=limit)

        return {
            "status": "OK",
            "data": {
                "user_location": {
                    "lat": round(lat, 6),
                    "lng": round(lng, 6)
                },
                "radius_m": radius_m,
                "count": len(rows),
                "items": [
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "facility_type": row["facility_type"],
                        "lat": row["lat"],
                        "lon": row["lon"],
                        "distance_m": round(float(row["distance_m"]), 2)
                    }
                    for row in rows
                ]
            }
        }
    except Exception as e:
        return {"error": "Internal Engine Error", "details": str(e)}


@app.get("/api/route-to-shelter")
def route_to_shelter(
    user_lat: float,
    user_lng: float,
    shelter_lat: float,
    shelter_lng: float,
    shelter_name: str = "Shelter"
):
    """
    Route from current user location to a specific shelter coordinate.
    """
    try:
        route = get_route_osrm(
            user_lat=user_lat,
            user_lng=user_lng,
            dest_lat=shelter_lat,
            dest_lng=shelter_lng
        )

        return {
            "status": "OK",
            "data": {
                "user_location": {
                    "lat": round(user_lat, 6),
                    "lng": round(user_lng, 6)
                },
                "destination": {
                    "name": shelter_name,
                    "lat": round(shelter_lat, 6),
                    "lng": round(shelter_lng, 6)
                },
                "route": {
                    "distance_m": round(float(route["distance_m"]), 2),
                    "duration_s": round(float(route["duration_s"]), 2),
                    "geometry": route["geometry"]
                }
            }
        }
    except Exception as e:
        return {"error": "Internal Engine Error", "details": str(e)}


@app.get("/api/nearest-shelter-route")
def nearest_shelter_route(
    lat: float,
    lng: float,
    radius_m: int = Query(default=5000, ge=1)
):
    """
    Convenience endpoint:
    - find nearest shelter within radius
    - compute walking route to that shelter
    """
    try:
        rows = get_nearest_shelters(lat=lat, lng=lng, radius_m=radius_m, limit=1)

        if not rows:
            return {
                "status": "NO_RESULT",
                "data": {
                    "user_location": {
                        "lat": round(lat, 6),
                        "lng": round(lng, 6)
                    },
                    "message": f"No shelter found within {radius_m} meters."
                }
            }

        shelter = rows[0]

        route = get_route_osrm(
            user_lat=lat,
            user_lng=lng,
            dest_lat=shelter["lat"],
            dest_lng=shelter["lon"]
        )

        return {
            "status": "OK",
            "data": {
                "user_location": {
                    "lat": round(lat, 6),
                    "lng": round(lng, 6)
                },
                "shelter": {
                    "id": shelter["id"],
                    "name": shelter["name"],
                    "facility_type": shelter["facility_type"],
                    "lat": shelter["lat"],
                    "lng": shelter["lon"],
                    "straight_line_distance_m": round(float(shelter["distance_m"]), 2)
                },
                "route": {
                    "distance_m": round(float(route["distance_m"]), 2),
                    "duration_s": round(float(route["duration_s"]), 2),
                    "geometry": route["geometry"]
                }
            }
        }
    except Exception as e:
        return {"error": "Internal Engine Error", "details": str(e)}