#!/bin/bash

# DSM Automation - PM2 Headless Test Script
# This script tests the automation with PM2 in headless mode

echo "🧪 Testing DSM Automation with PM2 in Headless Mode"
echo "===================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    pm2 stop all 2>/dev/null
    pm2 delete all 2>/dev/null
    pkill -f "remote-debugging-port=9922" 2>/dev/null
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Register cleanup function
trap cleanup EXIT INT TERM

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 not found. Installing...${NC}"
    npm install -g pm2
fi

# Stop any existing PM2 processes
echo -e "${YELLOW}🛑 Stopping existing PM2 processes...${NC}"
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null

# Kill any existing Chrome processes
echo -e "${YELLOW}🔄 Cleaning up Chrome processes...${NC}"
pkill -f "remote-debugging-port=9922" 2>/dev/null
sleep 2

# Clear logs
echo -e "${YELLOW}📄 Clearing old logs...${NC}"
pm2 flush 2>/dev/null

# Start PM2 with headless environment
echo -e "${GREEN}🚀 Starting PM2 with headless mode...${NC}"
echo ""
npm run start:pm2:headless

# Wait for services to start
echo ""
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 5

# Show PM2 status
echo ""
echo -e "${GREEN}📊 PM2 Process Status:${NC}"
pm2 list

# Show environment info
echo ""
echo -e "${GREEN}🔍 Environment Check:${NC}"
pm2 env dsm-automation | grep -E "NODE_ENV|CHROME_HEADLESS" | head -4

echo ""
echo "===================================================="
echo -e "${GREEN}✅ PM2 Headless Test Started!${NC}"
echo ""
echo "Available commands:"
echo "  📋 pm2 list          - Show process status"
echo "  📝 pm2 logs          - View logs"
echo "  📊 pm2 monit         - Monitor processes"
echo "  🔄 pm2 restart all   - Restart all processes"
echo "  🛑 pm2 stop all      - Stop all processes"
echo ""
echo "API endpoints:"
echo "  🌐 http://localhost:3001/api/status"
echo "  📋 http://localhost:3001/api/queue/status"
echo "  🚀 curl -X POST http://localhost:3001/api/trigger/receive"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop and cleanup${NC}"
echo "===================================================="
echo ""

# Follow logs
pm2 logs --lines 50