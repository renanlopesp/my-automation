#!/bin/bash

# DSM Automation - VPS Start Script with Virtual Display
# This script sets up a virtual display for running Chrome in headless environments

echo "🚀 Starting DSM Automation for VPS Environment"

# Check if Xvfb is installed
if ! command -v Xvfb &> /dev/null; then
    echo "❌ Xvfb not found. Please install it first:"
    echo "   Ubuntu/Debian: sudo apt-get install xvfb"
    echo "   CentOS/RHEL: sudo yum install xorg-x11-server-Xvfb"
    exit 1
fi

# Check if Chrome is installed
if ! command -v google-chrome &> /dev/null; then
    echo "❌ Google Chrome not found. Please install it first:"
    echo "   wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -"
    echo "   sudo sh -c 'echo \"deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main\" >> /etc/apt/sources.list.d/google.list'"
    echo "   sudo apt-get update"
    echo "   sudo apt-get install google-chrome-stable"
    exit 1
fi

# Kill any existing Xvfb processes
echo "🔄 Cleaning up existing Xvfb processes..."
pkill -f "Xvfb :99" 2>/dev/null

# Start Xvfb with a virtual display
echo "🖥️  Starting virtual display on :99..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 2

# Export the display variable
export DISPLAY=:99

echo "✅ Virtual display started (PID: $XVFB_PID)"

# Set Chrome to headless mode
export CHROME_HEADLESS=true

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    npm run stop:pm2 2>/dev/null
    kill $XVFB_PID 2>/dev/null
    echo "✅ Cleanup complete"
}

# Register cleanup function
trap cleanup EXIT INT TERM

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Start the application with PM2
echo "🎯 Starting DSM Automation with PM2..."
npm run start:pm2

# Show PM2 status
echo "📊 PM2 Process Status:"
pm2 list

echo ""
echo "✅ DSM Automation is running in VPS mode!"
echo "📝 Logs: pm2 logs"
echo "🛑 Stop: npm run stop:pm2 or press Ctrl+C"
echo ""

# Keep script running and forward PM2 logs
pm2 logs --nostream