#!/bin/bash

# TrackFlow Development Script
# This script helps you run both frontend and backend locally

echo "🎶 TrackFlow Development Setup"
echo "=============================="

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the trackflow root directory"
    exit 1
fi

# Function to start backend
start_backend() {
    echo "🚀 Starting backend..."
    cd backend
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    
    echo "📦 Installing dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
    
    echo "🌐 Starting backend server on http://localhost:8000"
    python main.py &
    BACKEND_PID=$!
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    echo "🌐 Starting frontend server on http://localhost:3000"
    npm start &
    FRONTEND_PID=$!
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start both services
start_backend
sleep 3  # Give backend time to start
start_frontend

echo ""
echo "✅ Both services are running!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user to stop
wait 