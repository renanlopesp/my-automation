# DSM Automation - Implementation Documentation

## Overview

This document details the comprehensive improvements made to the DSM Automation system, transforming it from a single-run script with `--watch` mode into a production-ready, continuously running automation system with real-time monitoring and control capabilities.

### Key Problems Solved

1. **Production Mode Issue**: The system was using `node --watch` in production, causing it to idle waiting for file changes instead of running continuously
2. **Lack of Monitoring**: No visibility into system state or progress
3. **No Manual Control**: Unable to trigger tasks manually or control execution
4. **Missing State Management**: No centralized state tracking
5. **Graceful Shutdown**: No clean way to stop the system

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   DSM Automation                     │
├───────────────┬───────────────┬────────────────────┤
│  Main Loop    │  State Manager │   API Server       │
│  (index.js)   │  (state.js)    │   (server.js)      │
├───────────────┴───────────────┴────────────────────┤
│                 Core Services                        │
│  - receive.js  - rename.js  - send.js               │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│              External Interfaces                     │
├─────────────────┬─────────────┬────────────────────┤
│   WebSocket     │  REST API   │   Dashboard         │
│   (Real-time)   │  (Control)  │   (Web UI)          │
└─────────────────┴─────────────┴────────────────────┘
```

## Component Details

### 1. State Management System (`src/state.js`)

**Purpose**: Centralized state tracking with event-driven updates

**Features**:
- Event emitter for real-time state changes
- Task tracking (pending, in-progress, completed)
- Error tracking and statistics
- Round counting and timing

**Key Methods**:
```javascript
startTask(taskName)    // Mark task as started
completeTask(taskName) // Mark task as completed
incrementError()       // Track error occurrences
getState()            // Get current system state
reset()               // Reset state for new round
```

**Events Emitted**:
- `stateChange`: Fired on any state update
- `taskStart`: Fired when task begins
- `taskComplete`: Fired when task finishes
- `error`: Fired on error occurrence

### 2. Enhanced Main Loop (`src/index.js`)

**Improvements**:
- Removed `--watch` for continuous execution
- Integrated state management
- Graceful shutdown handling
- Interruptible sleep cycles
- Consecutive error threshold

**Key Features**:
```javascript
// Graceful shutdown
process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)

// Interruptible sleep
async function sleep(ms) {
  const interval = 100
  const iterations = Math.ceil(ms / interval)
  for (let i = 0; i < iterations && !isShutdown(); i++) {
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}

// Main loop with state tracking
while (!isShutdown() && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
  systemState.startRound()
  
  // Execute tasks with state updates
  systemState.startTask('receive')
  await receiveAction()
  systemState.completeTask('receive')
  
  // ... other tasks
  
  systemState.completeRound()
  await sleep(ROUND_DELAY * 1000)
}
```

### 3. API Server (`src/server.js`)

**Port**: 3001 (configurable via PORT env variable)

**REST Endpoints**:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve dashboard HTML |
| `/api/status` | GET | Get current system state |
| `/api/health` | GET | Health check endpoint |
| `/api/trigger/:task` | POST | Manually trigger a task |
| `/api/shutdown` | POST | Gracefully shutdown system |
| `/api/restart` | POST | Restart automation loop |

**WebSocket Features**:
- Real-time state broadcasting
- Automatic reconnection support
- Message types:
  - `getState`: Request current state
  - `state`: State update broadcast
  - `error`: Error notifications

**Implementation**:
```javascript
// WebSocket setup
const wss = new WebSocketServer({ server })

// Broadcast state changes
systemState.on('stateChange', () => {
  const state = systemState.getState()
  broadcast({ type: 'state', data: state })
})

// Handle client messages
ws.on('message', (message) => {
  const data = JSON.parse(message)
  if (data.type === 'getState') {
    ws.send(JSON.stringify({
      type: 'state',
      data: systemState.getState()
    }))
  }
})
```

### 4. Dashboard (`src/dashboard.html`)

**Features**:
- Real-time status monitoring
- Task progress visualization
- Error tracking display
- Manual task triggering
- System control buttons

**Key Components**:
- WebSocket connection with auto-reconnect
- Dynamic status updates
- Task history tracking
- Error log display
- Statistics dashboard

### 5. PM2 Configuration (`ecosystem.config.cjs`)

**Process Management**:
```javascript
apps: [
  {
    name: 'dsm-automation',      // Main automation process
    script: './src/index.js',
    exec_mode: 'fork',           // Fork mode for WebSocket support
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G'
  },
  {
    name: 'dsm-api-server',      // API and WebSocket server
    script: './src/server.js',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    port: 3001
  }
]
```

## Usage Guide

### Development Mode
```bash
# Run with file watching for development
npm run dev
```

### Production Mode

#### Option 1: Direct Node Execution
```bash
# Start main automation
npm start

# In another terminal, start API server
npm run start:server
```

#### Option 2: PM2 Process Manager (Recommended)
```bash
# Start both processes with PM2
npm run start:pm2

# Check status
pm2 status

# View logs
pm2 logs dsm-automation
pm2 logs dsm-api-server

# Stop processes
pm2 stop all

# Restart processes
pm2 restart all
```

### Accessing the Dashboard
Open browser to: `http://localhost:3001`

### API Usage Examples

```bash
# Check system status
curl http://localhost:3001/api/status

# Health check
curl http://localhost:3001/api/health

# Manually trigger receive task
curl -X POST http://localhost:3001/api/trigger/receive

# Graceful shutdown
curl -X POST http://localhost:3001/api/shutdown
```

## Technical Implementation Details

### Script Changes in package.json
```json
{
  "scripts": {
    "dev": "node --watch ./src/index.js",        // Development with watch
    "start": "node ./src/index.js",              // Production without watch
    "start:pm2": "pm2 start ecosystem.config.cjs", // PM2 managed
    "start:server": "node ./src/server.js",      // API server only
    "stop:pm2": "pm2 stop all",
    "restart:pm2": "pm2 restart all",
    "logs:pm2": "pm2 logs",
    "status:pm2": "pm2 status"
  }
}
```

### Environment Variables
```env
# Chrome configuration (WSL)
CHROME_PATH="/usr/bin/google-chrome-stable"

# Timing configuration
ROUND_DELAY=30

# API Server
PORT=3001

# Webflow credentials
WEBFLOW_USERNAME=your_username
WEBFLOW_PASSWORD=your_password

# Optional: AWS S3 (for log uploads)
AWS_ACCESS_KEY_ID=optional
AWS_SECRET_ACCESS_KEY=optional
AWS_REGION=optional
AWS_BUCKET_NAME=optional

# Optional: Resend API (for email alerts)
RESEND_API_KEY=optional
RESEND_FROM_EMAIL=optional
RESEND_TO_EMAIL=optional
```

### State Object Structure
```javascript
{
  status: 'idle' | 'running' | 'error',
  currentTask: null | 'receive' | 'rename' | 'send',
  lastRun: ISO timestamp,
  nextRun: ISO timestamp,
  roundCount: number,
  errorCount: number,
  lastError: null | { message, timestamp },
  tasks: {
    receive: { count, lastRun, duration },
    rename: { count, lastRun, duration },
    send: { count, lastRun, duration }
  },
  startTime: ISO timestamp,
  uptime: duration in seconds
}
```

## Error Handling

### AWS S3 Optional Upload
The system now checks for AWS credentials before attempting uploads:
```javascript
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  logger.info('AWS credentials not configured, skipping S3 upload')
  return []
}
```

### Consecutive Error Threshold
System automatically stops after 5 consecutive errors:
```javascript
const MAX_CONSECUTIVE_ERRORS = 5
if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
  logger.error('Max consecutive errors reached, stopping...')
  process.exit(1)
}
```

### Graceful Shutdown
Clean shutdown on SIGINT/SIGTERM:
```javascript
async function handleShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown...`)
  shuttingDown = true
  
  // Wait for current task
  while (systemState.getState().currentTask) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Close browser if open
  if (global.browser) {
    await global.browser.close()
  }
  
  process.exit(0)
}
```

## Troubleshooting

### Common Issues

1. **Port 3001 Already in Use**
   ```bash
   # Find process using port
   lsof -i :3001
   # Kill process if needed
   kill -9 <PID>
   ```

2. **PM2 Not Starting**
   ```bash
   # Clear PM2 logs
   pm2 flush
   # Delete PM2 processes
   pm2 delete all
   # Restart
   npm run start:pm2
   ```

3. **WebSocket Connection Failed**
   - Check if API server is running
   - Verify port 3001 is accessible
   - Check firewall settings

4. **Chrome Not Found (WSL)**
   ```bash
   # Install Chrome
   sudo ./install-chrome.sh
   # Verify installation
   which google-chrome-stable
   ```

## System Monitoring

### Log Files
- `logs/pm2.log` - PM2 general logs
- `logs/pm2-error.log` - PM2 error logs
- `logs/pm2-out.log` - PM2 output logs
- `logs/api.log` - API server logs
- `logs/api-error.log` - API errors
- `logs/api-out.log` - API output

### Real-time Monitoring
```bash
# PM2 monitoring
pm2 monit

# Tail logs
tail -f logs/pm2-out.log
tail -f logs/api-out.log

# Dashboard
open http://localhost:3001
```

## Performance Optimizations

1. **Interruptible Sleep**: Allows immediate shutdown during wait periods
2. **Event-Driven Updates**: WebSocket broadcasts only on state changes
3. **Fork Mode**: Single process instance for optimal resource usage
4. **Memory Limits**: Automatic restart on memory threshold (1GB main, 500MB API)

## Security Considerations

1. **Environment Variables**: Sensitive credentials in .env file
2. **Local Access Only**: API server binds to localhost by default
3. **No Authentication**: Add authentication for production deployment
4. **CORS**: Currently allows all origins (update for production)

## Future Improvements

### Potential Enhancements
1. **Authentication**: Add JWT authentication for API/WebSocket
2. **Database Integration**: Store task history and metrics
3. **Email Notifications**: Implement error alerting via email
4. **Task Queue**: Add Redis for task queue management
5. **Metrics Export**: Prometheus/Grafana integration
6. **Docker Support**: Containerize the application
7. **Multi-instance**: Support running multiple automation instances
8. **Task Scheduling**: Cron-like scheduling for specific tasks
9. **Web Configuration**: UI for managing settings
10. **Audit Logging**: Detailed audit trail of all actions

### API Expansion
- `/api/logs` - Retrieve system logs
- `/api/config` - Update configuration dynamically
- `/api/metrics` - Export Prometheus metrics
- `/api/tasks/schedule` - Schedule specific tasks
- `/api/export` - Export task history

## Conclusion

The DSM Automation system has been successfully transformed from a development-oriented tool into a production-ready automation platform with:

- ✅ Continuous execution without `--watch`
- ✅ Real-time monitoring via WebSocket
- ✅ REST API for control and status
- ✅ Web dashboard for visualization
- ✅ PM2 process management
- ✅ Graceful shutdown handling
- ✅ Comprehensive state management
- ✅ Error recovery mechanisms
- ✅ Interruptible operations

The system is now ready for production deployment with proper monitoring, control, and reliability features in place.