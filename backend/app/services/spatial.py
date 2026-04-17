"""
Spatial service — PostGIS query helpers.
All geospatial DB queries go here so routers stay clean.
"""

from app.database import get_db


def find_nearest_shelters(lat: float, lng: float, limit: int = 5) -> list:
    """
    Find the N nearest shelters to a given lat/lng.
    Uses PostGIS ST_Distance for accurate distance calculation.
    Returns list of dicts with name, type, lat, lng, distance_m.
    """
    query = """
        SELECT
            COALESCE(NULLIF(address, ''), name) AS name,
            shelter_type,
            ST_Y(geom) AS lat,
            ST_X(geom) AS lng,
            ST_Distance(
                geom::geography,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
            ) AS distance_m
        FROM shelters
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint(%s, %s), 4326)
        LIMIT %s;
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (lng, lat, lng, lat, limit))
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]


def calculate_route_coverage(route_geojson: dict) -> float:
    """
    Calculate what percentage of a route is covered by linkways.
    Takes a GeoJSON LineString, overlays it on the covered_linkways table,
    and returns the coverage percentage (0.0 to 100.0).
    """
    query = """
        WITH route AS (
            SELECT ST_GeomFromGeoJSON(%s) AS geom
        ),
        covered AS (
            SELECT ST_Length(
                ST_Intersection(
                    r.geom::geography,
                    ST_Buffer(l.geom::geography, 5)
                )
            ) AS covered_length
            FROM route r, covered_linkways l
            WHERE ST_DWithin(r.geom::geography, l.geom::geography, 10)
        )
        SELECT
            COALESCE(SUM(covered_length), 0) AS total_covered,
            ST_Length(ST_GeomFromGeoJSON(%s)::geography) AS total_length
        FROM covered;
    """
    import json

    geojson_str = json.dumps(route_geojson)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (geojson_str, geojson_str))
            row = cur.fetchone()
            if row and row[1] > 0:
                return round((row[0] / row[1]) * 100, 1)
            return 0.0
