#!/bin/bash
# NeuroRestore System Status Check

echo "🔍 NeuroRestore System Status Check"
echo "===================================="
echo ""

# Check Backend
echo "📡 Backend Server:"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✅ Running on http://localhost:8000"
else
    echo "  ❌ Not running"
    echo "     Start with: cd backend && ./restart.sh"
fi
echo ""

# Check Frontend
echo "🌐 Frontend Server:"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  ✅ Running on http://localhost:3000"
else
    echo "  ❌ Not running"
    echo "     Start with: cd frontend && npm run dev"
fi
echo ""

# Check Dependencies
echo "📦 Dependencies:"

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    echo "  ✅ Python $PYTHON_VERSION"
else
    echo "  ❌ Python not found"
fi

# Check Node
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  ✅ Node $NODE_VERSION"
else
    echo "  ❌ Node not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "  ✅ npm $NPM_VERSION"
else
    echo "  ❌ npm not found"
fi
echo ""

# Check Backend Virtual Environment
echo "🐍 Backend Virtual Environment:"
if [ -d "backend/venv" ]; then
    echo "  ✅ Virtual environment exists"
    
    # Check if httpx is installed
    if [ -f "backend/venv/bin/python" ]; then
        if backend/venv/bin/python -c "import httpx" 2>/dev/null; then
            echo "  ✅ httpx installed"
        else
            echo "  ❌ httpx not installed"
            echo "     Install with: cd backend && source venv/bin/activate && pip install httpx"
        fi
    fi
else
    echo "  ❌ Virtual environment not found"
    echo "     Create with: cd backend && python3 -m venv venv"
fi
echo ""

# Check Frontend node_modules
echo "📦 Frontend Dependencies:"
if [ -d "frontend/node_modules" ]; then
    echo "  ✅ node_modules exists"
else
    echo "  ❌ node_modules not found"
    echo "     Install with: cd frontend && npm install"
fi
echo ""

# Check Database
echo "💾 Database:"
if [ -f "backend/neurorestore.db" ]; then
    DB_SIZE=$(du -h backend/neurorestore.db | awk '{print $1}')
    echo "  ✅ Database exists ($DB_SIZE)"
else
    echo "  ⚠️  Database not found"
    echo "     Initialize with: cd backend && alembic upgrade head"
fi
echo ""

# Check Environment Files
echo "🔐 Environment Configuration:"
if [ -f "backend/.env" ]; then
    echo "  ✅ backend/.env exists"
    
    # Check for Groq API key
    if grep -q "GROQ_API_KEY=gsk_" backend/.env; then
        echo "  ✅ GROQ_API_KEY configured"
    else
        echo "  ⚠️  GROQ_API_KEY not configured"
        echo "     Add to backend/.env: GROQ_API_KEY=your_key_here"
    fi
else
    echo "  ❌ backend/.env not found"
    echo "     Copy from: cp backend/.env.example backend/.env"
fi

if [ -f "frontend/.env" ]; then
    echo "  ✅ frontend/.env exists"
else
    echo "  ⚠️  frontend/.env not found (optional)"
fi
echo ""

# Check Ports
echo "🔌 Port Usage:"
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ✅ Port 8000 in use (Backend)"
else
    echo "  ⚠️  Port 8000 free"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ✅ Port 3000 in use (Frontend)"
else
    echo "  ⚠️  Port 3000 free"
fi
echo ""

# Summary
echo "📊 Summary:"
BACKEND_OK=$(curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "1" || echo "0")
FRONTEND_OK=$(curl -s http://localhost:3000 > /dev/null 2>&1 && echo "1" || echo "0")

if [ "$BACKEND_OK" = "1" ] && [ "$FRONTEND_OK" = "1" ]; then
    echo "  ✅ All systems operational!"
    echo ""
    echo "  🌐 Frontend: http://localhost:3000"
    echo "  📡 Backend:  http://localhost:8000"
    echo "  📚 API Docs: http://localhost:8000/docs"
elif [ "$BACKEND_OK" = "1" ]; then
    echo "  ⚠️  Backend running, Frontend not running"
    echo "     Start frontend: cd frontend && npm run dev"
elif [ "$FRONTEND_OK" = "1" ]; then
    echo "  ⚠️  Frontend running, Backend not running"
    echo "     Start backend: cd backend && ./restart.sh"
else
    echo "  ❌ Both servers not running"
    echo ""
    echo "  Quick start:"
    echo "    Terminal 1: cd backend && ./restart.sh"
    echo "    Terminal 2: cd frontend && npm run dev"
fi
echo ""
echo "===================================="
