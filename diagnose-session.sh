#!/bin/bash
# Session Feature Diagnostic Tool

echo "🔍 Session Feature Diagnostic"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend Health
echo "1️⃣  Testing Backend Health..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend is running${NC}"
    BACKEND_OK=1
else
    echo -e "   ${RED}❌ Backend is NOT running${NC}"
    echo "   Fix: cd backend && ./restart.sh"
    BACKEND_OK=0
fi
echo ""

# Test 2: Frontend
echo "2️⃣  Testing Frontend..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Frontend is running${NC}"
    FRONTEND_OK=1
else
    echo -e "   ${RED}❌ Frontend is NOT running${NC}"
    echo "   Fix: cd frontend && npm run dev"
    FRONTEND_OK=0
fi
echo ""

# Test 3: Database
echo "3️⃣  Checking Database..."
if [ -f "backend/neurorestore.db" ]; then
    DB_SIZE=$(du -h backend/neurorestore.db | awk '{print $1}')
    echo -e "   ${GREEN}✅ Database exists ($DB_SIZE)${NC}"
    DB_OK=1
else
    echo -e "   ${RED}❌ Database not found${NC}"
    echo "   Fix: cd backend && alembic upgrade head"
    DB_OK=0
fi
echo ""

# Test 4: Demo User
if [ "$BACKEND_OK" = "1" ]; then
    echo "4️⃣  Testing Demo User Login..."
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"demo@neurorestore.ai","password":"Demo@1234"}')
    
    if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
        echo -e "   ${GREEN}✅ Demo user login works${NC}"
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        echo "   Token: ${TOKEN:0:20}..."
        AUTH_OK=1
    else
        echo -e "   ${RED}❌ Demo user login failed${NC}"
        echo "   Response: $LOGIN_RESPONSE"
        echo "   Fix: Check if demo user exists or create account"
        AUTH_OK=0
    fi
    echo ""
    
    # Test 5: Session Creation
    if [ "$AUTH_OK" = "1" ]; then
        echo "5️⃣  Testing Session Creation..."
        SESSION_RESPONSE=$(curl -s -X POST http://localhost:8000/sessions \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"session_type":"physical"}')
        
        if echo "$SESSION_RESPONSE" | grep -q '"id"'; then
            echo -e "   ${GREEN}✅ Session creation works${NC}"
            SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
            echo "   Created session ID: $SESSION_ID"
            SESSION_OK=1
        else
            echo -e "   ${RED}❌ Session creation failed${NC}"
            echo "   Response: $SESSION_RESPONSE"
            SESSION_OK=0
        fi
        echo ""
    fi
fi

# Test 6: CORS Configuration
echo "6️⃣  Checking CORS Configuration..."
if grep -q "ALLOWED_ORIGINS=.*localhost:3000" backend/.env 2>/dev/null; then
    echo -e "   ${GREEN}✅ CORS configured for localhost:3000${NC}"
    CORS_OK=1
else
    echo -e "   ${YELLOW}⚠️  CORS might not be configured${NC}"
    echo "   Check: backend/.env should have ALLOWED_ORIGINS=http://localhost:3000"
    CORS_OK=0
fi
echo ""

# Test 7: Required Dependencies
echo "7️⃣  Checking Dependencies..."
if [ -f "backend/venv/bin/python" ]; then
    if backend/venv/bin/python -c "import httpx" 2>/dev/null; then
        echo -e "   ${GREEN}✅ httpx installed${NC}"
    else
        echo -e "   ${RED}❌ httpx not installed${NC}"
        echo "   Fix: cd backend && source venv/bin/activate && pip install httpx"
    fi
    
    if backend/venv/bin/python -c "import fastapi" 2>/dev/null; then
        echo -e "   ${GREEN}✅ fastapi installed${NC}"
    else
        echo -e "   ${RED}❌ fastapi not installed${NC}"
        echo "   Fix: cd backend && source venv/bin/activate && pip install -r requirements.txt"
    fi
fi
echo ""

# Summary
echo "=============================="
echo "📊 Diagnostic Summary"
echo "=============================="

if [ "$BACKEND_OK" = "1" ] && [ "$FRONTEND_OK" = "1" ] && [ "$DB_OK" = "1" ] && [ "$AUTH_OK" = "1" ] && [ "$SESSION_OK" = "1" ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    echo ""
    echo "🎉 Session feature should work!"
    echo ""
    echo "Next steps:"
    echo "1. Navigate to http://localhost:3000/auth"
    echo "2. Sign in with demo@neurorestore.ai / Demo@1234"
    echo "3. Go to http://localhost:3000/session"
    echo "4. Click 'Start Session'"
    echo ""
else
    echo -e "${RED}❌ Issues detected${NC}"
    echo ""
    echo "Problems found:"
    [ "$BACKEND_OK" = "0" ] && echo "  • Backend not running"
    [ "$FRONTEND_OK" = "0" ] && echo "  • Frontend not running"
    [ "$DB_OK" = "0" ] && echo "  • Database missing"
    [ "$AUTH_OK" = "0" ] && echo "  • Authentication failing"
    [ "$SESSION_OK" = "0" ] && echo "  • Session creation failing"
    echo ""
    echo "Quick fix:"
    echo "  ./check-status.sh"
    echo ""
    echo "Or manual fix:"
    echo "  Terminal 1: cd backend && ./restart.sh"
    echo "  Terminal 2: cd frontend && npm run dev"
    echo ""
fi

echo "=============================="
echo ""
echo "For detailed troubleshooting, see:"
echo "  SESSION_TROUBLESHOOTING.md"
echo ""
