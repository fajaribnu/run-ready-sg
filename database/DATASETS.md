# Shelter Datasets — RunReady SG

## Overview

Three shelter datasets are sourced from [data.gov.sg](https://data.gov.sg) and loaded
into the `shelters` table via `database/seeds/load_shelters.py`.

| # | Dataset | Source | Format | Records | Coordinate System |
|---|---------|--------|--------|---------|-------------------|
| 1 | HDB Residential Buildings | data.gov.sg `d_17f5382f26140b1fdae0ba2ef6239d2f` | CSV | 10,743 (residential) | No coords — geocoded via OneMap |
| 2 | Civil Defence Public Shelters | data.gov.sg `d_291795a678b8cf82f108780a6235ce18` | CSV | 589 | No coords — geocoded via OneMap |
| 3 | NParks Park Facilities | data.gov.sg `d_14d807e20158338fd578c2913953516e` | GeoJSON | 37 (CLASS=SHELTER) | WGS84 (lng, lat) |

**Total: 11,367 shelters loaded into PostGIS**

---

## 1. HDB Property Information (Void Decks)

- **Dataset URL:** https://data.gov.sg/datasets/d_17f5382f26140b1fdae0ba2ef6239d2f/view
- **Agency:** Housing & Development Board (HDB)
- **Format:** CSV (~930 KB, 13,267 rows total)
- **Filtered to:** `residential = Y` → 10,743 buildings
- **Key columns:**
  | Column | Type | Description |
  |--------|------|-------------|
  | `blk_no` | text | Block number (e.g., "517E") |
  | `street` | text | Street name (e.g., "JURONG WEST ST 52") |
  | `residential` | Y/N | Whether building is residential |
  | `max_floor_lvl` | int | Max floor level |
  | `year_completed` | int | Year completed |
- **Coordinates:** Not included in dataset. **SVY21 X/Y: N/A**
- **Geocoding:** Block + street address geocoded via [OneMap Search API](https://www.onemap.gov.sg/apidocs/)
  to obtain WGS84 lat/lng. Results cached in `database/data/hdb_geocoded_cache.json`.
- **shelter_type in DB:** `hdb`

---

## 2. Civil Defence Public Shelters

- **Dataset URL:** https://data.gov.sg/datasets/d_291795a678b8cf82f108780a6235ce18/view
- **Agency:** Singapore Civil Defence Force (SCDF)
- **Format:** CSV (~49 KB, 589 rows)
- **Key columns:**
  | Column | Type | Description |
  |--------|------|-------------|
  | `NAME` | text | Shelter name (e.g., "Telok Blangah CC") |
  | `ADDRESS` | text | Full address |
  | `POSTALCODE` | text | Singapore postal code |
  | `DESCRIPTION` | text | Shelter category |
- **Shelter categories:**
  | Category | Count |
  |----------|-------|
  | CD Public Shelter (HDB) | 446 |
  | CD Public Shelter (MRT Station) | 59 |
  | CD Public Shelter (School) | 58 |
  | CD Public Shelter (Community Club/Centre) | 19 |
  | CD Public Shelter (Public Development) | 7 |
- **Coordinates:** Not included. **SVY21 X/Y: N/A**
- **Geocoding:** Postal code geocoded via OneMap Search API.
  Singapore postal codes are unique per building, so geocoding is highly reliable.
  Results cached in `database/data/cd_geocoded_cache.json`.
- **shelter_type in DB:** `cd_shelter`

---

## 3. NParks Park Facilities (Shelters)

- **Dataset URL:** https://data.gov.sg/datasets/d_14d807e20158338fd578c2913953516e/view
- **Agency:** National Parks Board (NParks)
- **Format:** GeoJSON (~2.2 MB, 5,393 features total)
- **Filtered to:** `CLASS = "SHELTER"` → 37 features
- **Key properties:**
  | Property | Type | Description |
  |----------|------|-------------|
  | `NAME` | text | Shelter name (e.g., "Trellis shelter 1") |
  | `CLASS` | text | Facility class (SHELTER, PLAYGROUND, etc.) |
  | `UNIQUEID` | text | Unique identifier |
- **Coordinates:** Already in **WGS84 (EPSG:4326)** as `[longitude, latitude]`.
  **No SVY21 conversion needed.**
- **shelter_type in DB:** `nparks_pavilion`

---

## Coordinate Systems Summary

| Dataset | Has Coordinates? | System | Conversion |
|---------|-----------------|--------|------------|
| HDB Property Info | No | N/A | Geocoded via OneMap → WGS84 |
| CD Shelters | No | N/A | Geocoded via OneMap → WGS84 |
| NParks Facilities | Yes (GeoJSON) | WGS84 | None needed |

**Note:** The original `load_shelters.py` skeleton referenced SVY21→WGS84 conversion
via pyproj. In practice, none of the three datasets provide SVY21 X/Y coordinates
directly. The HDB and CD datasets require geocoding, while NParks is already WGS84.
The SVY21 converter is retained in the script for potential future datasets that use it
(e.g., HDB Carpark Information which does have SVY21 X/Y).

---

## Running the Seed Script

```bash
# Prerequisites
pip install psycopg2-binary requests pyproj

# Set DATABASE_URL in .env (already configured for team RDS)
# Run from project root:
python database/seeds/load_shelters.py
```

First run geocodes all addresses via OneMap (~15 min for HDB).
Subsequent runs use cached geocode results (~30 seconds).
