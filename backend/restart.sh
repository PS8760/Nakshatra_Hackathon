#!/bin/bash
# NeuroRestore Backend Restart Script

echo "🔄 Restarting NeuroRestore Backend..."

# Kill existing uvicorn processes
echo "🛑 Stopping existing server..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Checking dependencies..."
pip install -q -r requirements.txt

# Start server
echo "🚀 Starting server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Note: Use Ctrl+C to stop the server
