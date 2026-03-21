"""
Load shelter data into the shelters table.
Merges HDB void decks, Civil Defence shelters, and NParks pavilions.

Data sources (data.gov.sg):
  - HDB Property Information CSV  → geocoded via OneMap API
  - Civil Defence Public Shelters CSV → geocoded via OneMap API
  - NParks Park Facilities GeoJSON  → WGS84 coordinates included

Usage: python load_shelters.py
Prerequisites: pip install psycopg2-binary requests pyproj
"""

import os
import sys
import csv
import json
import time
import requests
import psycopg2
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add backend to path for config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
from app.config import settings

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# ── data.gov.sg dataset IDs ─────────────────────────────────────────
DATASETS = {
    "hdb": "d_17f5382f26140b1fdae0ba2ef6239d2f",       # HDB Property Information (CSV)
    "cd": "d_291795a678b8cf82f108780a6235ce18",          # CD Public Shelters (CSV)
    "nparks": "d_14d807e20158338fd578c2913953516e",      # NParks Park Facilities (GeoJSON)
}

DATAGOV_BASE = "https://api-open.data.gov.sg/v1/public/api/datasets"
ONEMAP_SEARCH = "https://www.onemap.gov.sg/api/common/elastic/search"


def connect():
    return psycopg2.connect(settings.DATABASE_URL)


# ── Dataset download helpers ─────────────────────────────────────────

def download_csv(dataset_id, dest_path):
    """Download a CSV dataset from data.gov.sg (initiate → poll → download)."""
    if os.path.exists(dest_path):
        print(f"  Using cached file: {dest_path}")
        return
    print(f"  Initiating download for {dataset_id}...")
    requests.get(f"{DATAGOV_BASE}/{dataset_id}/initiate-download")
    time.sleep(2)
    resp = requests.get(f"{DATAGOV_BASE}/{dataset_id}/poll-download")
    url = resp.json()["data"]["url"]
    r = requests.get(url)
    r.raise_for_status()
    with open(dest_path, "wb") as f:
        f.write(r.content)
    print(f"  Downloaded: {len(r.content)/1024:.0f} KB → {dest_path}")


def download_geojson(dataset_id, dest_path):
    """Download a GeoJSON dataset from data.gov.sg (poll → download)."""
    if os.path.exists(dest_path):
        print(f"  Using cached file: {dest_path}")
        return
    print(f"  Downloading GeoJSON for {dataset_id}...")
    resp = requests.get(f"{DATAGOV_BASE}/{dataset_id}/poll-download")
    url = resp.json()["data"]["url"]
    r = requests.get(url)
    r.raise_for_status()
    with open(dest_path, "wb") as f:
        f.write(r.content)
    print(f"  Downloaded: {len(r.content)/1024:.0f} KB → {dest_path}")


# ── OneMap geocoding ─────────────────────────────────────────────────

def geocode_onemap(search_val):
    """Geocode an address or postal code via OneMap Search API.
    Returns (lat, lng) or None."""
    try:
        r = requests.get(ONEMAP_SEARCH, params={
            "searchVal": search_val,
            "returnGeom": "Y",
            "getAddrDetails": "Y",
        }, timeout=10)
        data = r.json()
        if data.get("found", 0) > 0:
            result = data["results"][0]
            return float(result["LATITUDE"]), float(result["LONGITUDE"])
    except Exception:
        pass
    return None


def batch_geocode(items, key_fn, label="items", workers=5):
    """Geocode a list of items in parallel with caching.
    key_fn(item) should return the search string for OneMap.
    Returns dict: index → (lat, lng)."""
    results = {}
    failed = 0
    total = len(items)

    def _geocode(idx, item):
        search = key_fn(item)
        coords = geocode_onemap(search)
        return idx, coords

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_geocode, i, item): i for i, item in enumerate(items)}
        done = 0
        for future in as_completed(futures):
            idx, coords = future.result()
            done += 1
            if coords:
                results[idx] = coords
            else:
                failed += 1
            if done % 200 == 0 or done == total:
                print(f"  Geocoded {done}/{total} {label} ({failed} failed)")

    return results


# ── HDB void deck loader ────────────────────────────────────────────

def load_hdb_buildings(conn):
    """
    Load HDB residential building locations as void deck shelters.
    Source: data.gov.sg HDB Property Information (d_17f5382f26140b1fdae0ba2ef6239d2f)
    Geocoded via OneMap Search API using block + street address.
    """
    print("\n[HDB] Loading HDB void deck locations...")

    csv_path = os.path.join(DATA_DIR, "hdb_property_info.csv")
    cache_path = os.path.join(DATA_DIR, "hdb_geocoded_cache.json")

    # Download if not already present
    download_csv(DATASETS["hdb"], csv_path)

    # Read CSV and filter residential only
    with open(csv_path, newline="") as f:
        rows = [r for r in csv.DictReader(f) if r.get("residential") == "Y"]
    print(f"  Found {len(rows)} residential HDB buildings")

    # Load geocode cache if exists
    cache = {}
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            cache = json.load(f)
        print(f"  Loaded geocode cache: {len(cache)} entries")

    # Geocode uncached addresses
    to_geocode = []
    to_geocode_idx = []  # original index in rows
    for i, row in enumerate(rows):
        key = f"{row['blk_no']} {row['street']}"
        if key not in cache:
            to_geocode.append(row)
            to_geocode_idx.append(i)

    if to_geocode:
        print(f"  Geocoding {len(to_geocode)} new addresses via OneMap...")
        geo_results = batch_geocode(
            to_geocode,
            key_fn=lambda r: f"{r['blk_no']} {r['street']}",
            label="HDB addresses",
            workers=5,
        )
        # Update cache
        for local_idx, (lat, lng) in geo_results.items():
            row = to_geocode[local_idx]
            key = f"{row['blk_no']} {row['street']}"
            cache[key] = [lat, lng]

        # Save cache
        with open(cache_path, "w") as f:
            json.dump(cache, f)
        print(f"  Cache updated: {len(cache)} total entries")
    else:
        print("  All addresses already cached")

    # Insert into database
    inserted = 0
    with conn.cursor() as cur:
        for row in rows:
            key = f"{row['blk_no']} {row['street']}"
            if key not in cache:
                continue
            lat, lng = cache[key]
            name = f"Blk {row['blk_no']} {row['street']}"
            address = f"{row['blk_no']} {row['street']}, Singapore"
            cur.execute("""
                INSERT INTO shelters (name, shelter_type, address, geom)
                VALUES (%s, 'hdb', %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                ON CONFLICT DO NOTHING
            """, (name, address, lng, lat))
            inserted += 1
    conn.commit()
    print(f"  [HDB] Inserted {inserted} void deck shelters")


# ── Civil Defence shelter loader ─────────────────────────────────────

def load_cd_shelters(conn):
    """
    Load Civil Defence public shelter locations.
    Source: data.gov.sg CD Shelters (d_291795a678b8cf82f108780a6235ce18)
    Geocoded via OneMap Search API using postal code.
    """
    print("\n[CD] Loading Civil Defence shelter locations...")

    csv_path = os.path.join(DATA_DIR, "cd_shelters.csv")
    cache_path = os.path.join(DATA_DIR, "cd_geocoded_cache.json")

    # Download if not already present
    download_csv(DATASETS["cd"], csv_path)

    # Read CSV
    with open(csv_path, newline="") as f:
        rows = list(csv.DictReader(f))
    print(f"  Found {len(rows)} CD shelters")

    # Load geocode cache
    cache = {}
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            cache = json.load(f)
        print(f"  Loaded geocode cache: {len(cache)} entries")

    # Geocode uncached postal codes
    to_geocode = [r for r in rows if r["POSTALCODE"] not in cache]
    if to_geocode:
        print(f"  Geocoding {len(to_geocode)} postal codes via OneMap...")
        geo_results = batch_geocode(
            to_geocode,
            key_fn=lambda r: r["POSTALCODE"],
            label="CD shelters",
            workers=5,
        )
        for local_idx, (lat, lng) in geo_results.items():
            postal = to_geocode[local_idx]["POSTALCODE"]
            cache[postal] = [lat, lng]

        with open(cache_path, "w") as f:
            json.dump(cache, f)
        print(f"  Cache updated: {len(cache)} total entries")

    # Insert into database
    inserted = 0
    with conn.cursor() as cur:
        for row in rows:
            postal = row["POSTALCODE"]
            if postal not in cache:
                continue
            lat, lng = cache[postal]
            name = row["NAME"].strip()
            address = f"{row['ADDRESS'].strip()}, Singapore {postal}"
            cur.execute("""
                INSERT INTO shelters (name, shelter_type, address, geom)
                VALUES (%s, 'cd_shelter', %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                ON CONFLICT DO NOTHING
            """, (name, address, lng, lat))
            inserted += 1
    conn.commit()
    print(f"  [CD] Inserted {inserted} Civil Defence shelters")


# ── NParks shelter loader ────────────────────────────────────────────

def load_nparks_pavilions(conn):
    """
    Load NParks shelter/pavilion locations.
    Source: NParks Park Facilities GeoJSON (d_14d807e20158338fd578c2913953516e)
    Coordinates are already WGS84 (EPSG:4326).
    Filters for CLASS = 'SHELTER'.
    """
    print("\n[NParks] Loading park shelter locations...")

    geojson_path = os.path.join(DATA_DIR, "nparks_facilities.geojson")

    # Download if not already present
    download_geojson(DATASETS["nparks"], geojson_path)

    # Read GeoJSON
    with open(geojson_path) as f:
        data = json.load(f)

    features = data.get("features", [])
    shelters = [f for f in features if f["properties"].get("CLASS") == "SHELTER"]
    print(f"  Found {len(shelters)} shelters out of {len(features)} total facilities")

    # Insert into database
    inserted = 0
    with conn.cursor() as cur:
        for feat in shelters:
            props = feat["properties"]
            coords = feat["geometry"]["coordinates"]  # [lng, lat]
            lng, lat = coords[0], coords[1]
            name = (props.get("NAME") or "NParks Shelter").strip()
            cur.execute("""
                INSERT INTO shelters (name, shelter_type, address, geom)
                VALUES (%s, 'nparks_pavilion', NULL, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                ON CONFLICT DO NOTHING
            """, (name, lng, lat))
            inserted += 1
    conn.commit()
    print(f"  [NParks] Inserted {inserted} park shelters")


# ── Verification ─────────────────────────────────────────────────────

def verify(conn):
    """Print shelter counts by type and spot-check a few records."""
    print("\n" + "=" * 50)
    print("VERIFICATION")
    print("=" * 50)
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM shelters")
        total = cur.fetchone()[0]
        print(f"\nTotal shelters: {total}")

        cur.execute("""
            SELECT shelter_type, count(*)
            FROM shelters
            GROUP BY shelter_type
            ORDER BY count(*) DESC
        """)
        print("\nBy type:")
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]}")

        cur.execute("""
            SELECT name, shelter_type,
                   ST_Y(geom) AS lat, ST_X(geom) AS lng
            FROM shelters
            ORDER BY RANDOM()
            LIMIT 5
        """)
        print("\nSample records (random 5):")
        for row in cur.fetchall():
            print(f"  {row[0]} ({row[1]}) → lat={row[2]:.6f}, lng={row[3]:.6f}")


# ── Main ─────────────────────────────────────────────────────────────

def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    conn = connect()
    try:
        # Clear existing shelters for clean re-seed
        with conn.cursor() as cur:
            cur.execute("DELETE FROM shelters")
        conn.commit()
        print("Cleared existing shelter data.")

        load_hdb_buildings(conn)
        load_cd_shelters(conn)
        load_nparks_pavilions(conn)
        verify(conn)

        print("\nShelter seeding complete!")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
