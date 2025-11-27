#!/bin/bash
# Inkingi Smart School - Backend Startup Script
# This script starts the FastAPI backend server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}🚀 Starting Inkingi Smart School Backend${NC}"
echo "=========================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${RED}❌ Virtual environment not found!${NC}"
    echo "Please create a virtual environment first:"
    echo "  python3 -m venv venv"
    exit 1
fi

# Activate virtual environment
echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f "env_template.txt" ]; then
        cp env_template.txt .env
        echo -e "${YELLOW}⚠️  Please update .env with your configuration${NC}"
    else
        echo -e "${RED}❌ env_template.txt not found!${NC}"
        exit 1
    fi
fi

# Check if required packages are installed
echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
if ! python3 -c "import uvicorn" 2>/dev/null; then
    echo -e "${YELLOW}📥 Installing dependencies...${NC}"
    pip install -q -r requirements.txt
fi

# Stop any existing server
echo -e "${YELLOW}🛑 Stopping any existing server...${NC}"
pkill -f "run_server.py" 2>/dev/null || true
sleep 1

# Start the server
echo -e "${GREEN}🌐 Starting FastAPI server...${NC}"
echo ""
echo "📍 Server will be available at: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🔍 Health Check: http://localhost:8000/health"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo "=========================================="
echo ""

# Run the server
python3 run_server.py

