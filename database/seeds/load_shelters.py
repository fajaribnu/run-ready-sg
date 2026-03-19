"""
Load shelter data into the shelters table.
Merges HDB void decks, Civil Defence shelters, and NParks pavilions.

Handles SVY21 -> WGS84 coordinate conversion for datasets
that use Singapore's local coordinate system.

Usage: python load_shelters.py
Prerequisites: pip install psycopg2-binary requests pyproj
"""

import os
import sys
import json
import requests
import psycopg2
from pyproj import Transformer

# Add backend to path for config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
from app.config import settings

# SVY21 -> WGS84 transformer
svy21_to_wgs84 = Transformer.from_crs("EPSG:3414", "EPSG:4326", always_xy=True)


def connect():
    return psycopg2.connect(settings.DATABASE_URL)


def convert_svy21(x: float, y: float) -> tuple:
    """Convert SVY21 X/Y to WGS84 lng/lat."""
    lng, lat = svy21_to_wgs84.transform(x, y)
    return lat, lng


def load_hdb_buildings(conn):
    """
    Load HDB building coordinates as void deck shelters.
    Source: data.gov.sg HDB Property Information dataset.
    """
    # TODO: Replace with actual data.gov.sg dataset URL or local CSV
    # The dataset provides X, Y in SVY21 format
    print("[HDB] Loading HDB void deck locations...")
    print("[HDB] TODO: Download dataset and parse. Skipping for now.")
    # Example insert pattern:
    # with conn.cursor() as cur:
    #     for building in buildings:
    #         lat, lng = convert_svy21(building['x'], building['y'])
    #         cur.execute("""
    #             INSERT INTO shelters (name, shelter_type, address, geom)
    #             VALUES (%s, 'hdb', %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
    #         """, (building['name'], building['address'], lng, lat))
    # conn.commit()


def load_cd_shelters(conn):
    """
    Load Civil Defence shelter locations.
    Source: data.gov.sg CD Shelters dataset.
    """
    print("[CD] Loading Civil Defence shelter locations...")
    print("[CD] TODO: Download dataset and parse. Skipping for now.")


def load_nparks_pavilions(conn):
    """
    Load NParks pavilion/shelter locations.
    Source: NParks Facilities GeoJSON.
    Filter for shelter_type in ('Pavilion', 'Shelter', 'Rest Area').
    """
    print("[NParks] Loading park pavilion locations...")
    print("[NParks] TODO: Download and filter NParks facilities GeoJSON. Skipping for now.")


def main():
    conn = connect()
    try:
        load_hdb_buildings(conn)
        load_cd_shelters(conn)
        load_nparks_pavilions(conn)
        print("\nShelter seeding complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
