import express from 'express'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import { logger, logBuffer } from '#utils'
import LogFileWatcher from './utils/logFileWatcher.js'
import systemState from './state.js'
import { receive } from './receive.js'
import { rename } from './rename.js'
import { send } from './send.js'
import { prepareBrowser, startChrome } from '#ops'
import { NODE_ENV } from '#config'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'
import { getQueueStats, getActiveTransfers, getTransferHistory } from '#dataActions'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// Store WebSocket clients
const wsClients = new Set()

// Helper to broadcast to all WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data)
  wsClients.forEach(client => {
    if (client.readyState === 1) {
      // OPEN
      client.send(message)
    }
  })
}

// Add WebSocket transport to logger - DISABLED to avoid duplication
// addWebSocketTransport(broadcast)

// Initialize log file watcher for main process logs
const logWatcher = new LogFileWatcher('./general.log')

logWatcher.on('newLog', (log) => {
  // Add to buffer and broadcast via WebSocket
  const formattedLog = logBuffer.add(log)
  broadcast({ type: 'logEntry', data: formattedLog })
})

logWatcher.on('error', (error) => {
  logger.error('Log file watcher error:', error)
})

// Start watching the log file
logWatcher.start()

// Listen to state changes and broadcast
systemState.on('statusUpdate', data => {
  broadcast({ type: 'statusUpdate', data })
})

systemState.on('taskStart', taskName => {
  broadcast({ type: 'taskStart', data: { taskName } })
})

systemState.on('taskEnd', data => {
  broadcast({ type: 'taskEnd', data })
})

systemState.on('error', error => {
  broadcast({ type: 'error', data: error })
})

// New event listeners for queue and transfer updates
systemState.on('queueUpdate', data => {
  broadcast({ type: 'queueUpdate', data })
})

systemState.on('transferUpdate', data => {
  broadcast({ type: 'transferUpdate', data })
})

systemState.on('transferProgress', data => {
  broadcast({ type: 'transferProgress', data })
})

systemState.on('transferComplete', data => {
  broadcast({ type: 'transferComplete', data })
})

systemState.on('historyUpdate', data => {
  broadcast({ type: 'historyUpdate', data: data.slice(0, 10) }) // Send only last 10
})

systemState.on('marketplaceCheck', data => {
  broadcast({ type: 'marketplaceCheck', data })
})

systemState.on('queueCheck', data => {
  broadcast({ type: 'queueCheck', data })
})

systemState.on('queueEmpty', data => {
  broadcast({ type: 'queueEmpty', data })
})

systemState.on('transferFound', data => {
  broadcast({ type: 'transferFound', data })
})

// REST API Routes
app.get('/api/status', (req, res) => {
  res.json(systemState.getState())
})

app.get('/api/health', (req, res) => {
  const state = systemState.getState()
  const health = {
    status: state.status !== 'error' ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    stats: state.stats,
    currentTask: state.currentTask,
  }
  res.json(health)
})

// Trigger endpoints
app.post('/api/trigger/receive', async (req, res) => {
  try {
    if (systemState.state.isRunning) {
      return res.status(400).json({ error: 'System is already running a task' })
    }

    res.json({ message: 'Receive task started' })

    // Run in background
    ;(async () => {
      try {
        systemState.updateStatus('running', { currentTask: 'receive' })
        if (!systemState.state.browser) {
          await startChrome()
          const browser = await prepareBrowser({ port: 9922 })
          systemState.setBrowser(browser)
        }
        await receive(systemState.state.browser)
      } catch (error) {
        logger.error('Receive task error:', error)
        systemState.addError(error)
      } finally {
        systemState.updateStatus('idle')
      }
    })()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/trigger/rename', async (req, res) => {
  try {
    if (systemState.state.isRunning) {
      return res.status(400).json({ error: 'System is already running a task' })
    }

    const { env = 'local' } = req.body
    res.json({ message: 'Rename task started', env })

    // Run in background
    ;(async () => {
      try {
        systemState.updateStatus('running', { currentTask: 'rename' })
        if (!systemState.state.browser) {
          await startChrome()
          const browser = await prepareBrowser({ port: 9922 })
          systemState.setBrowser(browser)
        }
        await rename(env, systemState.state.browser)
      } catch (error) {
        logger.error('Rename task error:', error)
        systemState.addError(error)
      } finally {
        systemState.updateStatus('idle')
      }
    })()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/trigger/send', async (req, res) => {
  try {
    if (systemState.state.isRunning) {
      return res.status(400).json({ error: 'System is already running a task' })
    }

    const { env = 'local' } = req.body
    res.json({ message: 'Send task started', env })

    // Run in background
    ;(async () => {
      try {
        systemState.updateStatus('running', { currentTask: 'send' })
        if (!systemState.state.browser) {
          await startChrome()
          const browser = await prepareBrowser({ port: 9922 })
          systemState.setBrowser(browser)
        }
        await send(env, systemState.state.browser)
      } catch (error) {
        logger.error('Send task error:', error)
        systemState.addError(error)
      } finally {
        systemState.updateStatus('idle')
      }
    })()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get recent logs from buffer with filtering
app.get('/api/logs', async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      level,
      source,
      search,
      startTime,
      endTime
    } = req.query

    const result = logBuffer.getLogs({
      limit: parseInt(limit),
      offset: parseInt(offset),
      level,
      source,
      search,
      startTime,
      endTime
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get logs', message: error.message })
  }
})

// Get log statistics
app.get('/api/logs/stats', (req, res) => {
  try {
    const stats = logBuffer.getStats()
    const watcherStats = logWatcher.getStats()
    res.json({
      ...stats,
      watcher: watcherStats
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get log stats' })
  }
})

// Clear logs buffer
app.delete('/api/logs/buffer', (req, res) => {
  try {
    logBuffer.clear()
    res.json({ message: 'Log buffer cleared' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear log buffer' })
  }
})

// Get logs from file (legacy endpoint)
app.get('/api/logs/file', async (req, res) => {
  try {
    const { lines = 100 } = req.query
    const logPath = path.join(process.cwd(), 'general.log')
    const content = await readFile(logPath, 'utf-8')
    const logLines = content.split('\n').filter(Boolean).slice(-lines)
    res.json({ logs: logLines.map(line => JSON.parse(line)) })
  } catch (error) {
    res.status(500).json({ error: 'Failed to read log file' })
  }
})

// Get errors
app.get('/api/errors', (req, res) => {
  res.json({ errors: systemState.state.errors })
})

// Clear errors
app.delete('/api/errors', (req, res) => {
  systemState.state.errors = []
  res.json({ message: 'Errors cleared' })
})

// Get queue statistics for an environment
app.get('/api/queue/:env', async (req, res) => {
  try {
    const { env } = req.params
    const stats = await getQueueStats(env)
    res.json(stats || { error: 'Failed to fetch queue stats' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all queues statistics
app.get('/api/queues', async (req, res) => {
  try {
    const envs = NODE_ENV === 'development' ? ['local'] : ['dev', 'prod']
    const results = {}

    for (const env of envs) {
      results[env] = await getQueueStats(env)
    }

    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get active transfers for an environment
app.get('/api/transfers/:env', async (req, res) => {
  try {
    const { env } = req.params
    const transfers = await getActiveTransfers(env)
    res.json({ env, transfers })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get transfer history
app.get('/api/history/:env', async (req, res) => {
  try {
    const { env } = req.params
    const { limit = 20 } = req.query
    const history = await getTransferHistory(env, parseInt(limit))
    res.json({ env, history })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get detailed statistics
app.get('/api/stats/detailed', async (req, res) => {
  try {
    const envs = NODE_ENV === 'development' ? ['local'] : ['dev', 'prod']
    const stats = {
      environments: {},
      summary: {
        totalPending: 0,
        totalProcessing: 0,
        totalComplete: 0,
        totalError: 0,
      },
      timestamp: new Date().toISOString(),
    }

    for (const env of envs) {
      const envStats = await getQueueStats(env)
      if (envStats) {
        stats.environments[env] = envStats
        stats.summary.totalPending += envStats.receive.pending + envStats.send.pending
        stats.summary.totalProcessing += envStats.receive.processing + envStats.send.processing
        stats.summary.totalComplete += envStats.receive.complete + envStats.send.complete
        stats.summary.totalError += envStats.receive.error + envStats.send.error
      }
    }

    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Redirect to React dashboard
app.get('/', (req, res) => {
  res.redirect('http://localhost:5173')
})

// Start HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API Server running on http://localhost:${PORT}`)
  console.log(`🚀 API Server running on http://localhost:${PORT}`)
  console.log(`📊 Dashboard available at http://localhost:5173`)
  console.log(`🔌 WebSocket available at ws://localhost:${PORT}`)
})

// Periodic queue polling (every 5 seconds)
let queuePollInterval = null
async function pollQueues() {
  try {
    const envs = NODE_ENV === 'development' ? ['local'] : ['dev', 'prod']

    for (const env of envs) {
      const stats = await getQueueStats(env)
      if (stats) {
        systemState.updateQueue(env, stats)
      }
    }
  } catch (error) {
    logger.error('Queue polling error:', error)
  }
}

// Start polling when first client connects
function startQueuePolling() {
  if (!queuePollInterval) {
    pollQueues() // Initial poll
    queuePollInterval = setInterval(pollQueues, 5000) // Poll every 5 seconds
    logger.info('Started queue polling')
  }
}

// Stop polling when no clients connected
function stopQueuePolling() {
  if (queuePollInterval && wsClients.size === 0) {
    clearInterval(queuePollInterval)
    queuePollInterval = null
    logger.info('Stopped queue polling')
  }
}

// WebSocket Server
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  logger.info(`New WebSocket connection from ${req.socket.remoteAddress}`)
  wsClients.add(ws)

  // Start queue polling when clients connect
  startQueuePolling()

  // Send current state on connection
  ws.send(
    JSON.stringify({
      type: 'initial',
      data: systemState.getState(),
    })
  )

  ws.on('message', message => {
    try {
      const data = JSON.parse(message)
      logger.info(`WebSocket message received: ${data.type}`)

      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }))
          break
        case 'getState':
          ws.send(
            JSON.stringify({
              type: 'state',
              data: systemState.getState(),
            })
          )
          break
      }
    } catch (error) {
      logger.error('WebSocket message error:', error)
    }
  })

  ws.on('close', () => {
    wsClients.delete(ws)
    logger.info('WebSocket connection closed')

    // Stop polling if no clients connected
    stopQueuePolling()
  })

  ws.on('error', error => {
    logger.error('WebSocket error:', error)
  })
})

// Graceful shutdown handler
function gracefulShutdown(signal) {
  logger.info(`${signal} received, closing server...`)

  // Stop log file watcher
  logWatcher.stop()

  // Clear queue polling interval
  if (queuePollInterval) {
    clearInterval(queuePollInterval)
  }

  // Close all WebSocket connections
  wsClients.forEach(client => {
    if (client.readyState === 1) {
      client.close()
    }
  })
  wsClients.clear()

  // Close HTTP server
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 10000)
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  gracefulShutdown('uncaughtException')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})