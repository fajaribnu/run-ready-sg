import json
import psycopg2
from psycopg2.extras import execute_batch

# ==============================
# CONFIG
# ==============================
DB_CONFIG = {
    "host": "192.168.96.1",
    "dbname": "run-ready",
    "user": "postgres",
    "password": "postgres",
    "port": 5433
}

JSON_PATH = "NParksTracks.geojson"

# ==============================
# CONNECT
# ==============================
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()


# ==============================
# HELPERS
# ==============================
def clean_value(x):
    if x in ["None", "", None]:
        return None
    return str(x).strip()


def parse_track_feature(feature):
    """
    Parse one GeoJSON feature for park_tracks_raw.
    Accepts LineString or MultiLineString.
    Returns tuple: (name, park_name, track_type, geometry_json_str)
    """
    if feature.get("type") != "Feature":
        return None

    geometry = feature.get("geometry")
    properties = feature.get("properties", {})

    if not geometry:
        return None

    geom_type = geometry.get("type")
    if geom_type not in {"LineString", "MultiLineString"}:
        return None

    coords = geometry.get("coordinates")
    if not coords:
        return None

    # Try a few common property names; adjust if your file uses others
    name = clean_value(
        properties.get("name")
        or properties.get("NAME")
        or properties.get("track_name")
        or properties.get("TrackName")
    )

    park_name = clean_value(
        properties.get("park_name")
        or properties.get("PARK_NAME")
        or properties.get("park")
        or properties.get("PARK")
    )

    track_type = clean_value(
        properties.get("track_type")
        or properties.get("TRACK_TYPE")
        or properties.get("type")
        or properties.get("TYPE")
        or geom_type
    )

    # store the geometry part as GeoJSON string
    geom_json = json.dumps(geometry)

    return (name, park_name, track_type, geom_json)


# ==============================
# LOAD GEOJSON
# ==============================
with open(JSON_PATH, "r", encoding="utf-8") as f:
    geo_data = json.load(f)

features = geo_data.get("features", [])
rows = []

for feature in features:
    parsed = parse_track_feature(feature)
    if parsed:
        rows.append(parsed)

print(f"Parsed track features: {len(rows)}")

if not rows:
    print("No valid features found. Nothing inserted.")
    cur.close()
    conn.close()
    raise SystemExit


# ==============================
# INSERT INTO park_tracks_raw
# ==============================
query = """
INSERT INTO park_tracks_raw (
    name,
    park_name,
    track_type,
    geom
)
VALUES (
    %s,
    %s,
    %s,
    ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)
)
"""

execute_batch(cur, query, rows, page_size=1000)

conn.commit()
cur.close()
conn.close()

print("Done inserting park tracks into park_tracks_raw 🚀")