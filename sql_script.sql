-- Enable PostGIS (run once per database)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop old table if needed (optional)
DROP TABLE IF EXISTS facilities;

-- Create minimal table
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    name TEXT,
    facility_type TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    geom geometry(Point, 4326)
);

-- Spatial index (VERY IMPORTANT for performance)
CREATE INDEX idx_facilities_geom
ON facilities
USING GIST (geom);

-- Optional (for filtering by type)
CREATE INDEX idx_facilities_type
ON facilities (facility_type);