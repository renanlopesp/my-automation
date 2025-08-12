#!/bin/bash

# DSM Automation - Local Headless Test Script
# This script tests the automation in headless mode locally

echo "🧪 Testing DSM Automation in Headless Mode"
echo "=========================================="
echo ""

# Kill any existing Chrome processes on port 9922
echo "🔄 Cleaning up existing Chrome processes..."
pkill -f "remote-debugging-port=9922" 2>/dev/null
sleep 2

# Set environment to headless mode
export CHROME_HEADLESS=true
export NODE_ENV=development

echo "📋 Configuration:"
echo "  - CHROME_HEADLESS: true"
echo "  - NODE_ENV: development"
echo "  - Chrome will run in headless mode"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    pkill -f "remote-debugging-port=9922" 2>/dev/null
    pkill -f "node.*index.js" 2>/dev/null
    echo "✅ Cleanup complete"
}

# Register cleanup function
trap cleanup EXIT INT TERM

# Start the application in development mode
echo "🚀 Starting DSM Automation in headless mode..."
echo "📝 Logs will appear below:"
echo "=========================================="
echo ""

# Run the application
npm run dev