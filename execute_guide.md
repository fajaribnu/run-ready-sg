## Prototype for Can I run or not?

This guide explains how to run the RunReady SG decision engine prototype. We use a **Python FastAPI backend** to securely fetch data from government APIs (bypassing CORS restrictions) and a simple **HTML/JS frontend** to display the results.

### 1. Start the Backend
The backend fetches real-time Temperature, 2-Hour Forecasts, and WBGT Heat Stress data, then calculates the nearest weather station to the user's GPS coordinates.

**Prerequisites:**
* Python 3 installed.
* Get your developer API key from data.gov.sg
* Put it on `main.py` line 17

**Steps:**
1. Open your terminal and install the required Python libraries:
   ```bash
   pip install fastapi uvicorn requests
   ```
2. Open `main.py` and paste your data.gov.sg API key into the **HEADERS** dictionary at the top of the file.
3. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```
4. It will run on `http://localhost:8000`

### 2. Start the Frontend
1. Open a new, separate terminal window.
2. Navigate to the folder containing your `index.html` file.
3. Start a simple local web server on port 8001 (so it doesn't conflict with the backend):
   ```bash
   python3 -m http.server 8001
   ```
4. Open Google Chrome and go to http://localhost:8001.
5. Click "Can I run right now?" and allow location access


### 3. Logic for the prototype:
#### Step 1: Capture user's Location (Input)
The app asks the user's phone or browser for their exact GPS coordinates (Latitude and Longitude).

#### Step 2: Fetch Live Data
The backend server contacts three APIs to download the latest island-wide data for air temperature, weather forecasts, and heat stress (WBGT).

#### Step 3: Spatial Matching
Because the government data covers the whole island, the server uses a distance formula (Euclidean distance) to draw an imaginary straight line from the user to every single weather station. It filters out the rest and only keeps the data from the stations closest to the user.

#### Step 4: The Safety Rules (The Engine)
The server runs the nearest station data through two strict rules **(we can always modify this)**:
- Rule 1 (Rain): Does the forecast contain words like "Rain", "Showers", "Thundery", or "Lightning"?
- Rule 2 (Heat): Is the Heat Stress (WBGT) reading higher than 32.0°C?

#### Step 5: The Final Decision (Output)
- If the data passes both rules, it triggers a Green "SAFE" response.
- If it fails either rule, it triggers a Red "WARNING" response.

It then sends this decision, along with the neighborhood name and exact temperatures, back to the user's screen