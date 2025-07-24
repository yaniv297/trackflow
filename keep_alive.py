#!/usr/bin/env python3
"""
Keep-alive script to prevent Render cold starts
Run this locally to keep your API warm
"""

import requests
import time
import os
from datetime import datetime

# Your Render API URL
API_URL = "https://trackflow-wb8l.onrender.com"

def ping_api():
    """Ping the API to keep it warm"""
    try:
        response = requests.get(f"{API_URL}/docs", timeout=30)
        if response.status_code == 200:
            print(f"✅ {datetime.now().strftime('%H:%M:%S')} - API is warm")
        else:
            print(f"⚠️  {datetime.now().strftime('%H:%M:%S')} - API responded with {response.status_code}")
    except Exception as e:
        print(f"❌ {datetime.now().strftime('%H:%M:%S')} - Failed to ping API: {e}")

def main():
    print(f"🚀 Starting keep-alive for {API_URL}")
    print("Press Ctrl+C to stop")
    
    while True:
        ping_api()
        # Wait 10 minutes (600 seconds)
        time.sleep(600)

if __name__ == "__main__":
    main() 