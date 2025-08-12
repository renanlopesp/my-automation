# VPS Setup Guide for DSM Automation

This guide provides step-by-step instructions for deploying DSM Automation on a VPS (Virtual Private Server) without a graphical interface.

## Table of Contents
- [Requirements](#requirements)
- [Server Setup](#server-setup)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Requirements

### Minimum VPS Specifications
- **OS**: Ubuntu 20.04+ or Debian 10+
- **RAM**: 2GB minimum (4GB recommended)
- **CPU**: 2 vCPUs minimum
- **Storage**: 20GB SSD
- **Network**: Stable internet connection

### Required Software
- Node.js 18+ 
- npm or yarn
- Google Chrome
- Xvfb (Virtual Display)
- PM2 (Process Manager)
- Git

## Server Setup

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install Google Chrome
```bash
# Add Google Chrome repository
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

# Update and install Chrome
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Verify installation
google-chrome --version
```

### 4. Install Xvfb (Virtual Display)
```bash
# Install Xvfb and dependencies
sudo apt-get install -y xvfb
sudo apt-get install -y x11-xkb-utils xfonts-100dpi xfonts-75dpi xfonts-scalable xfonts-cyrillic

# Install additional utilities (optional but recommended)
sudo apt-get install -y x11-apps imagemagick
```

### 5. Install PM2 Globally
```bash
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the command output to complete setup
```

## Installation

### 1. Clone Repository
```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/your-repo/dsm-automation.git my-stufs
cd my-stufs
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
# Copy example environment file
cp .env.example .env

# Edit the environment file
nano .env
```

Configure the following essential variables:
```env
NODE_ENV=production
CHROME_HEADLESS=true
CHROME_DATA_DIR=/tmp/chrome-data

# Webflow credentials
WEBFLOW_USERNAME=your_email@example.com
WEBFLOW_PASSWORD=your_password

# Database connections (if applicable)
SURREAL_URL=ws://your-database-url
SURREAL_USER=your_user
SURREAL_PASSWORD=your_password

# Optional: AWS for log storage
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

### 4. Make Scripts Executable
```bash
chmod +x start-vps.sh
chmod +x test-headless.sh
```

## Configuration

### Headless Chrome Configuration
The application automatically configures Chrome for headless operation when `CHROME_HEADLESS=true` is set. Additional optimizations include:
- `--no-sandbox`: Required for running as non-root
- `--disable-dev-shm-usage`: Prevents /dev/shm issues
- `--disable-gpu`: Not needed in headless mode
- `--headless=new`: Uses new headless mode

### Virtual Display Configuration
Xvfb creates a virtual display at `:99` with resolution `1920x1080x24`. This allows Chrome to run as if it had a real display, enabling:
- Screenshot capture for debugging
- CAPTCHA detection
- Full DOM rendering

## Running the Application

### Method 1: Using VPS Start Script (Recommended)
```bash
# Start with virtual display and PM2
./start-vps.sh

# The script will:
# 1. Start Xvfb virtual display
# 2. Set DISPLAY=:99
# 3. Start application with PM2
# 4. Show process status
```

### Method 2: Manual Start
```bash
# Start Xvfb in background
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Set headless mode
export CHROME_HEADLESS=true

# Start with PM2
npm run start:pm2
```

### Method 3: Using systemd Service (Production)
Create a systemd service file:
```bash
sudo nano /etc/systemd/system/dsm-automation.service
```

Add the following content:
```ini
[Unit]
Description=DSM Automation Service
After=network.target

[Service]
Type=forking
User=your_user
WorkingDirectory=/home/your_user/my-stufs
ExecStart=/home/your_user/my-stufs/start-vps.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable dsm-automation
sudo systemctl start dsm-automation
```

## Monitoring

### View Logs
```bash
# PM2 logs
pm2 logs

# Specific process logs
pm2 logs dsm-automation
pm2 logs dsm-api-server

# System logs
tail -f general.log
```

### Check Process Status
```bash
# PM2 process list
pm2 list

# Monitor with auto-refresh
pm2 monit
```

### Access Dashboard
If the dashboard is running:
```bash
# Forward port to local machine (from your local terminal)
ssh -L 5173:localhost:5173 user@your-vps-ip

# Then access in browser
http://localhost:5173
```

## Troubleshooting

### Chrome Won't Start
```bash
# Check Chrome installation
google-chrome --version

# Test Chrome in headless mode
google-chrome --headless --no-sandbox --dump-dom https://example.com

# Check for missing dependencies
ldd /usr/bin/google-chrome | grep "not found"
```

### Xvfb Issues
```bash
# Check if Xvfb is running
ps aux | grep Xvfb

# Test Xvfb
Xvfb :99 -screen 0 1024x768x24 -ac

# In another terminal
export DISPLAY=:99
xclock  # Should not show errors
```

### Permission Issues
```bash
# Fix Chrome sandbox (if running as non-root)
sudo chown root:root /usr/bin/google-chrome
sudo chmod 4755 /usr/bin/google-chrome

# Or disable sandbox (less secure)
export CHROME_NO_SANDBOX=true
```

### Memory Issues
```bash
# Check memory usage
free -h

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### CAPTCHA Handling
When running headless, CAPTCHA resolution requires:
1. Email alerts are sent with screenshots
2. Use VNC or SSH X11 forwarding to resolve manually
3. Consider using a CAPTCHA solving service API

### Debug Mode
For troubleshooting, run without PM2:
```bash
# Set debug environment
export CHROME_HEADLESS=true
export NODE_ENV=development
export DEBUG=*

# Run directly
node src/index.js
```

## Security Considerations

1. **Never run Chrome as root** - Use a dedicated user
2. **Firewall Configuration** - Only expose necessary ports
3. **Secure .env file** - Set proper permissions: `chmod 600 .env`
4. **Use SSH keys** - Disable password authentication
5. **Regular Updates** - Keep system and dependencies updated

## Performance Optimization

### Chrome Flags for VPS
Additional flags for better performance:
```javascript
// In chrome-cli-arguments.js
'--disable-web-security',
'--disable-features=VizDisplayCompositor',
'--disable-background-timer-throttling',
'--disable-backgrounding-occluded-windows',
'--disable-renderer-backgrounding',
```

### Resource Limits
Set PM2 memory limits in `ecosystem.config.cjs`:
```javascript
max_memory_restart: '1G',  // Adjust based on VPS RAM
```

### Monitoring Resources
```bash
# CPU and Memory usage
htop

# Disk usage
df -h

# Network usage
iftop
```

## Backup and Recovery

### Backup Strategy
```bash
# Backup data and logs
tar -czf backup-$(date +%Y%m%d).tar.gz data/ logs/ .env

# Upload to S3 or remote storage
aws s3 cp backup-*.tar.gz s3://your-bucket/backups/
```

### Recovery
```bash
# Restore from backup
tar -xzf backup-20240112.tar.gz

# Restart services
pm2 restart all
```

## Support

For issues specific to VPS deployment:
1. Check logs: `pm2 logs --lines 100`
2. Verify Chrome: `google-chrome --version`
3. Test Xvfb: `export DISPLAY=:99 && xdpyinfo`
4. Review this guide's troubleshooting section

## Quick Commands Reference

```bash
# Start application
./start-vps.sh

# Stop application
pm2 stop all

# Restart application
pm2 restart all

# View logs
pm2 logs

# Monitor
pm2 monit

# Check status
pm2 list

# Clean restart
pm2 delete all && ./start-vps.sh
```