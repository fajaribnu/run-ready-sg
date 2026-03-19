-- RunReady SG — Initial Schema
-- Requires PostgreSQL 15+ with PostGIS extension
-- Run: psql $DATABASE_URL -f 001_init_schema.sql

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- Shelters: unified table for all shelter types
-- HDB void decks, Civil Defence shelters, NParks pavilions
-- ============================================
CREATE TABLE IF NOT EXISTS shelters (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    shelter_type VARCHAR(50) NOT NULL,  -- 'hdb', 'cd_shelter', 'nparks_pavilion'
    address     TEXT,
    geom        GEOMETRY(Point, 4326) NOT NULL,  -- WGS84 lat/lng
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shelters_geom ON shelters USING GIST (geom);

-- ============================================
-- Covered linkways: line geometries from LTA/URA shapefiles
-- Used for route coverage scoring (F4)
-- ============================================
CREATE TABLE IF NOT EXISTS covered_linkways (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(255),
    geom    GEOMETRY(MultiLineString, 4326) NOT NULL,  -- converted from SVY21
    source  VARCHAR(50) DEFAULT 'lta'
);

CREATE INDEX idx_linkways_geom ON covered_linkways USING GIST (geom);

-- ============================================
-- Weather snapshots: raw API data stored every 15 min by ingestion pipeline
-- ============================================
CREATE TABLE IF NOT EXISTS weather_snapshots (
    id              SERIAL PRIMARY KEY,
    fetched_at      TIMESTAMPTZ NOT NULL UNIQUE,
    raw_temperature JSONB,
    raw_forecast    JSONB,
    raw_wbgt        JSONB
);

CREATE INDEX idx_snapshots_time ON weather_snapshots (fetched_at DESC);

-- ============================================
-- Weather stations: reference table for station metadata
-- ============================================
CREATE TABLE IF NOT EXISTS weather_stations (
    station_id  VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    geom        GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX idx_stations_geom ON weather_stations USING GIST (geom);

-- ============================================
-- Alert subscriptions: email alerts for saved locations (F3)
-- ============================================
CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    label       VARCHAR(255),  -- user-friendly name like "Bishan Park"
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    last_alerted_at TIMESTAMPTZ,  -- cooldown tracking
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Users: basic user profiles for personalization (F6, stretch)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    profile     VARCHAR(50) DEFAULT 'beginner',  -- 'beginner', 'acclimatized', 'children_pe'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
