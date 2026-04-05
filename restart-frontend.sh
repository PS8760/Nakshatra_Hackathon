#!/bin/bash

echo "🔄 Restarting Frontend with Camera Fix..."
echo "=========================================="

# Kill any existing Next.js processes
echo "1. Stopping existing frontend..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Navigate to frontend
cd frontend || exit 1

echo ""
echo "2. Starting frontend with camera debugging..."
echo "   URL: http://localhost:3000"
echo "   Camera test: http://localhost:3000/test-camera.html"
echo ""
echo "📝 Watch for camera debug messages in console:"
echo "   🎥 Starting camera initialization..."
echo "   ✅ Camera access granted"
echo "   📹 Video stream attached"
echo "   ▶️ Video playing"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev
