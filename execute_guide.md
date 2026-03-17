## 🏃‍♂️ RunReady SG Prototype

This guide explains how to run the RunReady SG prototype, which now includes:

- 🌦️ Run Decision Engine (weather-based safety check)  
- 🏠 Nearby Shelter Finder + Navigation (PostGIS + routing + map)

We use:
- FastAPI backend → handles APIs, database, routing  
- PostgreSQL + PostGIS → spatial queries (nearest shelters)  
- HTML/JS frontend + Leaflet → map + visualization  

---

### 1. Start the Backend

The backend is responsible for:
- Fetching real-time weather data (data.gov.sg)
- Querying nearby shelters using PostGIS
- Generating routes using a routing engine (OSRM)

#### Prerequisites
- Python 3 installed  
- PostgreSQL with PostGIS enabled  
- data.gov.sg API key  

#### Setup

Install dependencies:
pip install fastapi uvicorn requests psycopg2-binary

#### Configure

In main.py:
- Add your data.gov.sg API key
- Set your PostgreSQL DB config

Example:
DB_CONFIG = {
    "host": "...",
    "dbname": "...",
    "user": "...",
    "password": "...",
    "port": ...
}

#### Run backend

uvicorn main:app --reload

Backend runs at:
http://localhost:8000

---

### 2. Start the Frontend

python3 -m http.server 8001

Then open:
http://localhost:8001

---

### 3. Features Overview

---

## 🌦️ Feature 1: Can I Run?

### Step 1: Capture User Location
The browser requests GPS coordinates (latitude, longitude).

### Step 2: Fetch Live Weather Data
Backend calls:
- Air Temperature API  
- 2-Hour Forecast API  
- WBGT (Heat Stress) API  

### Step 3: Spatial Matching
The backend finds the nearest weather station to the user using distance calculation.

### Step 4: Decision Rules
- Rain → unsafe  
- WBGT > 32°C → unsafe  

### Step 5: Output
Returns:
- SAFE (green)  
- WARNING (red)  
- with explanation  

---

## 🏠 Feature 2: Nearby Shelters + Route (NEW)

### Step 1: Capture User Location
User clicks “Find Nearby Shelters”, browser provides GPS coordinates.

### Step 2: Query PostGIS (Spatial Database)

The backend uses:
- ST_DWithin → filter shelters within 5km  
- ST_Distance → compute distance  
- ORDER BY → get nearest shelters  

This enables efficient spatial querying.

### Step 3: Return Top Shelters
Backend returns:
- Top 10 nearest shelters  
- Distance to each shelter  

### Step 4: User Selection (Frontend)
User clicks on a shelter from the list.

### Step 5: Route Generation
Backend calls routing engine (OSRM):

User → Shelter path (walking route)

Returns:
- route geometry (polyline)
- distance
- estimated duration

### Step 6: Map Visualization
Frontend (Leaflet):
- shows user marker  
- shows shelter markers  
- draws route  

---

### 🧠 Key Architecture Insight

- data.gov.sg API → weather data  
- PostGIS → spatial queries (nearest shelters)  
- OSRM → routing (actual path)  
- Leaflet → visualization  

---

### 🚀 Summary

The system combines:
- real-time weather intelligence  
- geospatial querying  
- route planning  
- interactive map UI  

to help users:
- decide whether to run  
- and navigate to nearby shelters if needed  