## 🏃‍♂️ RunReady SG Prototype

This guide explains how to run the RunReady SG prototype, which now includes:

- 🏠 Nearby Shelter Finder + Navigation (PostGIS + routing + map)

We use:
- FastAPI backend → handles APIs, database, routing  
- PostgreSQL + PostGIS → spatial queries (nearest shelters)  
- HTML/JS frontend + Leaflet → map + visualization  

---

### 1. Database Setup (PostgreSQL + PostGIS)

# Create a PostgreSQL database (e.g. "run-ready") using your preferred method
# (pgAdmin, psql, or any GUI)

# Then run the provided SQL script:
# sql_script.sql

# This script will:
# - enable PostGIS extension
# - create the facilities table
# - create necessary indexes

# After that, load the data:
python parse_shelters_into_sql.py

# NOTE:
# This will take a few minutes to run.
---

### 2. Start the Backend

# Install dependencies
pip install -r requirements.txt

# Configure DB + API key inside main.py

# Run backend
uvicorn main:app --reload

# Backend runs at:
# http://localhost:8000

---

### 3. Start the Frontend

# From folder containing index.html
python3 -m http.server 8001

# Open in browser:
# http://localhost:8001

---

### 4. Overview

---

## 🏠 Feature: Find Nearby Shelters + Route

# Step 1: Capture user location

# Step 2: PostGIS query:
# - ST_DWithin → filter within 5km
# - ST_Distance → compute distance
# - ORDER BY → nearest first

# Step 3: Return top 10 shelters

# Step 4: User selects shelter

# Step 5: Backend calls OSRM:
# user → shelter route

# Step 6: Frontend (Leaflet):
# - display markers
# - draw route

---

### 🧠 Architecture

# PostgreSQL/PostGIS → spatial query
# OSRM → routing
# Leaflet → visualization

---

### 🚀 Summary

# Combines:
# - geospatial querying
# - routing
# - map UI

# Helps users:
# - navigate to nearest shelter