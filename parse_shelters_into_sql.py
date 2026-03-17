import json
import psycopg2
from psycopg2.extras import execute_batch
import pandas as pd
import requests
import time

# ==============================
# CONFIG
# ==============================
DB_CONFIG = {
    "host": "localhost",  # or local IP / AWS RDS endpoint
    "dbname": "<db_name>",
    "user": "<db_username>",
    "password": "<db_password>",
    "port": 5432
}

JSON_PATH = "ParkFacilities.geojson"
CSV_PATH = "PublicShelters.csv"

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
    return x


# ==============================
# GEOCODING (Singapore OneMap)
# ==============================
def postal_to_latlon(postal_code):
    """
    Convert postal code → lat/lon using OneMap API
    """
    url = f"https://www.onemap.gov.sg/api/common/elastic/search?searchVal={postal_code}&returnGeom=Y&getAddrDetails=Y"

    try:
        res = requests.get(url, timeout=10)
        data = res.json()

        if data["found"] > 0:
            result = data["results"][0]
            return float(result["LATITUDE"]), float(result["LONGITUDE"])
    except Exception as e:
        print(f"Geocode error for {postal_code}: {e}")

    return None, None


# ==============================
# PARSE GEOJSON (Parks)
# ==============================
def parse_geojson(feature):
    if feature.get("type") != "Feature":
        return None

    geometry = feature.get("geometry", {})
    properties = feature.get("properties", {})

    if geometry.get("type") != "Point":
        return None

    coords = geometry.get("coordinates")
    if not coords:
        return None

    lon, lat = coords[0], coords[1]

    name = clean_value(properties.get("NAME"))
    faci_type = clean_value(properties.get("CLASS"))  # ✅ fix here

    if not name or lat is None or lon is None:
        return None

    return (name, lat, lon, faci_type)


# ==============================
# PARSE CSV (Civil Defence)
# ==============================
def parse_csv():
    df = pd.read_csv(CSV_PATH, encoding="utf-8").dropna(subset=["ADDRESS", "POSTALCODE"])

    df["name"] = df["ADDRESS"].astype(str).str.strip()

    # apply geocoding
    coords = df["POSTALCODE"].apply(postal_to_latlon)

    # split tuple → lat, lon
    df["lat"] = coords.apply(lambda x: x[0])
    df["lon"] = coords.apply(lambda x: x[1])

    # assign a fixed type for this source
    df["facility_type"] = "CIVIL_DEFENCE"

    # remove failed geocoding
    df = df.dropna(subset=["lat", "lon"])

    # final format
    rows = list(df[["name", "lat", "lon", "facility_type"]].itertuples(index=False, name=None))

    return rows


# ==============================
# LOAD GEOJSON
# ==============================
with open(JSON_PATH, "r", encoding="utf-8") as f:
    geo_data = json.load(f)

geo_rows = []
for feature in geo_data.get("features", []):
    parsed = parse_geojson(feature)
    if parsed:
        geo_rows.append(parsed)

print(f"GeoJSON parsed: {len(geo_rows)}")

# ==============================
# LOAD CSV
# ==============================
csv_rows = parse_csv()
print(f"CSV parsed (after geocoding): {len(csv_rows)}")

# ==============================
# MERGE
# ==============================
all_rows = geo_rows + csv_rows

print(f"Total records to insert: {len(all_rows)}")

# ==============================
# INSERT (ONLY CORE FIELDS)
# ==============================
query = """
INSERT INTO facilities (
    name,
    lat,
    lon,
    facility_type,
    geom
)
VALUES (
    %s, %s, %s, %s,
    ST_SetSRID(ST_MakePoint(%s, %s), 4326)
)
"""

data_to_insert = [
    (name, lat, lon, facility_type, lon, lat)
    for (name, lat, lon, facility_type) in all_rows
]
execute_batch(cur, query, data_to_insert, page_size=1000)

conn.commit()
cur.close()
conn.close()

print("Done inserting 🚀")