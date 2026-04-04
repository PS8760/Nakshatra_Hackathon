#!/bin/bash

echo "🔍 Camera Issue Diagnostic"
echo "=========================="
echo ""

# Check if camera process is running
echo "1. Checking camera processes..."
ps aux | grep -i "camera\|video" | grep -v grep | head -5

echo ""
echo "2. Checking video devices..."
ls -la /dev/video* 2>/dev/null || echo "No /dev/video* devices found (normal on macOS)"

echo ""
echo "3. Checking if other apps using camera..."
lsof 2>/dev/null | grep -i "camera\|video" | head -5 || echo "Cannot check (need sudo)"

echo ""
echo "4. Browser recommendations:"
echo "   ✅ Chrome/Edge (best support)"
echo "   ⚠️  Safari (may need extra permissions)"
echo "   ⚠️  Firefox (may need extra permissions)"

echo ""
echo "5. Quick fixes to try:"
echo "   a) Grant camera permission in browser"
echo "   b) Use http://localhost:3000 (not IP address)"
echo "   c) Close Zoom/Skype/Teams"
echo "   d) Hard refresh: Cmd+Shift+R"

echo ""
echo "6. Test camera in browser console:"
echo "   Press F12 → Console → Run:"
echo "   navigator.mediaDevices.getUserMedia({ video: true })"
echo "     .then(() => console.log('✅ Works'))"
echo "     .catch(err => console.error('❌', err.name, err.message))"

