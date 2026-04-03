"""
Load covered linkway shapefiles into the covered_linkways table.
Converts SVY21 ESRI Shapefiles to WGS84 GeoJSON, then inserts as PostGIS geometries.

Usage: python load_linkways.py
Prerequisites: pip install psycopg2-binary geopandas shapely
"""

import os
import sys
import json
import psycopg2
import geopandas as gpd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
from app.config import settings

# DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "CoveredLinkWay_Mar2026")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def connect():
    return psycopg2.connect(settings.DATABASE_URL)


def load_shapefile(filepath: str) -> gpd.GeoDataFrame:
    """Read shapefile and reproject from SVY21 (EPSG:3414) to WGS84 (EPSG:4326)."""
    gdf = gpd.read_file(filepath)
    if gdf.crs and 'SVY21' in gdf.crs.to_string():
        gdf = gdf.to_crs(epsg=4326)
        print(f"  Reprojected from SVY21 to WGS84: {len(gdf)} features")
    elif gdf.crs is None:
        print("  WARNING: No CRS detected. Assuming SVY21 and reprojecting.")
        gdf = gdf.set_crs(epsg=3414).to_crs(epsg=4326)
    else:
        print(f"  CRS already WGS84: {len(gdf)} features")
    return gdf


def test_conn():
    """Test database connection."""
    try:
        conn = connect()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            print("Database connection successful.")
    except Exception as e:
        print(f"Database connection failed: {e}")
        sys.exit(1)

def insert_linkways(conn, gdf: gpd.GeoDataFrame):
    """Insert GeoDataFrame rows into covered_linkways table."""
    with conn.cursor() as cur:
        for _, row in gdf.iterrows():
            geojson = json.dumps(row.geometry.__geo_interface__)
            name = row.get("NAME", row.get("OBJECTID", ""))
            cur.execute(
                """
                INSERT INTO covered_linkways (name, geom, source)
                VALUES (%s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), 'lta')
                """,
                (name, geojson),
            )
    conn.commit()
    print(f"  Inserted {len(gdf)} linkway segments.")


def main():
    # Look for .shp files in the data/ directory
    shapefiles = [f for f in os.listdir(DATA_DIR) if f.endswith(".geojson")]
    if not shapefiles:
        print(f"No .geojson files found in {DATA_DIR}")
        print("Place the covered linkway shapefile(s) there and rerun.")
        return

    conn = connect()
    # test_conn()
    try:
        for shp in shapefiles:
            filepath = os.path.join(DATA_DIR, shp)
            print(f"\nProcessing: {shp}")
            gdf = load_shapefile(filepath)
            insert_linkways(conn, gdf)
            # save_path = os.path.join(DATA_DIR, "..", "covered_linkway_wgs84.geojson")
            # save_path_mls = os.path.join(DATA_DIR, "..", "covered_linkway_wgs84_multilinestring.geojson")
            # gdf.to_file(save_path, driver="GeoJSON")
            # gdf["geometry"] = gdf.boundary
            # gdf.to_file(save_path_mls, driver="GeoJSON")
        print("\nLinkway seeding complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
