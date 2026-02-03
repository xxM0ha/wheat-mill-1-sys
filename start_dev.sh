#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT EXIT

echo "Starting Wheat-Mill project in dev mode..."

# Parse arguments
INSTALL_DEPS=false
if [[ "$1" == "--install" ]]; then
    INSTALL_DEPS=true
fi

# Backend Setup
echo "--- Preparing Backend ---"
cd backend

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
    INSTALL_DEPS=true
fi

# Activate venv
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Error: Could not find venv activation script."
    exit 1
fi

# Install dependencies if requested or venv was just created
if [ "$INSTALL_DEPS" = true ]; then
    echo "Installing backend dependencies..."
    pip install -r requirements.txt
fi

echo "Starting Django Server..."
python manage.py runserver &

cd ..

# Frontend Setup
echo "--- Preparing Frontend ---"
cd frontend

# Install dependencies if missing or requested
if [ ! -d "node_modules" ] || [ "$INSTALL_DEPS" = true ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo "Starting Vite Server..."
npm run dev &

cd ..

echo ""
echo "========================================"
echo "Wheat-Mill is starting up!"
echo "========================================"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://127.0.0.1:8000"
echo ""
echo "Servers are running. Press Ctrl+C to stop."
wait
