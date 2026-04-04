#!/bin/bash

echo "🎥 Testing Webcam Fix"
echo "===================="
echo ""

# Check if frontend is running
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend is NOT running!"
    echo ""
    echo "Start it with:"
    echo "  cd frontend"
    echo "  npm run dev"
    echo ""
    exit 1
fi

echo ""
echo "📋 Instructions:"
echo ""
echo "1. Open browser: http://localhost:3000/session"
echo ""
echo "2. Press F12 to open console"
echo ""
echo "3. Look for these messages:"
echo "   🎥 Starting camera initialization..."
echo "   ✅ Camera access granted"
echo "   📹 Video stream attached"
echo "   ▶️ Video playing"
echo ""
echo "4. When browser asks for camera permission:"
echo "   → Click 'Allow'"
echo ""
echo "5. You should see:"
echo "   ✅ Your face in camera feed"
echo "   ✅ Skeleton overlay"
echo "   ✅ Green/yellow/red joints"
echo ""
echo "6. If you see 'Camera Error':"
echo "   → Read the error message"
echo "   → Click 'Reload & Retry' button"
echo ""
echo "7. If still not working:"
echo "   → Share console output (F12 → Console)"
echo "   → Try test page: http://localhost:3000/test-camera.html"
echo ""
echo "===================="
echo "Opening browser..."
echo ""

# Open browser (macOS)
open "http://localhost:3000/session"

echo "✅ Browser opened!"
echo ""
echo "Remember: Press F12 to see console logs!"
