from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import math

app = FastAPI(title="RunReady SG Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "x-api-key": "[PUT YOUR API KEY HERE]"
}

def get_nearest(lat, lng, metadata_list):

    nearest = None
    shortest_dist = float('inf')
    
    for item in metadata_list:
        if 'labelLocation' in item:
            item_lat = float(item['labelLocation']['latitude'])
            item_lng = float(item['labelLocation']['longitude'])
        elif 'label_location' in item:
            item_lat = float(item['label_location']['latitude'])
            item_lng = float(item['label_location']['longitude'])
        else:
            item_lat = float(item['location']['latitude'])
            item_lng = float(item['location']['longitude'])
            
        dist = math.sqrt((lat - item_lat)**2 + (lng - item_lng)**2)
        if dist < shortest_dist:
            shortest_dist = dist
            nearest = item
            
    return nearest

@app.get("/api/check-run")
def check_run(lat: float, lng: float):
    try:
        temp_res = requests.get('https://api.data.gov.sg/v1/environment/air-temperature', headers=HEADERS)
        forecast_res = requests.get('https://api.data.gov.sg/v1/environment/2-hour-weather-forecast', headers=HEADERS)
        wbgt_res = requests.get('https://api-open.data.gov.sg/v2/real-time/api/weather?api=wbgt', headers=HEADERS)

        if temp_res.status_code != 200 or forecast_res.status_code != 200 or wbgt_res.status_code != 200:
            return {"error": "API Error", "details": f"Temp: {temp_res.status_code}, Forecast: {forecast_res.status_code}, WBGT: {wbgt_res.status_code}"}

        temp_data = temp_res.json()
        forecast_data = forecast_res.json()
        wbgt_data = wbgt_res.json()

        # Parse V1 Data
        nearest_area = get_nearest(lat, lng, forecast_data['area_metadata'])
        nearest_temp_station = get_nearest(lat, lng, temp_data['metadata']['stations'])
        
        my_temp = next(r['value'] for r in temp_data['items'][0]['readings'] if r['station_id'] == nearest_temp_station['id'])
        my_forecast = next(f['forecast'] for f in forecast_data['items'][0]['forecasts'] if f['area'] == nearest_area['name'])

        # Parse V2 WBGT Data
        wbgt_readings = wbgt_data['data']['records'][0]['item']['readings']
        nearest_wbgt_reading = get_nearest(lat, lng, wbgt_readings)
        
        # Extract WBGT value. If the station is broken ("NA"), default to a safe 29.0
        my_wbgt = nearest_wbgt_reading.get('wbgt', '29.0')
        if my_wbgt == "NA":
            my_wbgt = "29.0"

        # The Decision Logic
        projection = "Conditions holding steady."
        is_safe = True
        
        if any(word in my_forecast for word in ["Rain", "Showers", "Thundery", "Lightning"]):
            projection = "Rain expected shortly. Seek shelter."
            is_safe = False
        elif float(my_wbgt) > 32:
            projection = "Heat stress rising. Hydrate immediately."
            is_safe = False

        return {
            "status": "SAFE" if is_safe else "WARNING",
            "data": {
                "1_location": f"Lat: {lat:.3f}, Lng: {lng:.3f} (Near {nearest_area['name']})",
                "2_current_temperature": f"{my_temp}°C",
                "3_weather_condition": my_forecast,
                "4_wbgt": f"{my_wbgt}°C",
                "5_projection": projection
            }
        }

    except Exception as e:
        return {"error": "Internal Engine Error", "details": str(e)}