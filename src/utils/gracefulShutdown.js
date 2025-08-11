import { logger } from './logger.js'
import systemState from '../state.js'

let isShuttingDown = false
const shutdownCallbacks = []

export function registerShutdownCallback(callback) {
  shutdownCallbacks.push(callback)
}

export function isShutdown() {
  return isShuttingDown
}

async function performShutdown(signal) {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress...')
    return
  }

  isShuttingDown = true
  logger.info(`Received ${signal}, starting graceful shutdown...`)
  systemState.updateStatus('stopping')

  // Set timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 30000) // 30 seconds timeout

  try {
    // Execute all shutdown callbacks
    logger.info('Executing shutdown callbacks...')
    for (const callback of shutdownCallbacks) {
      try {
        await callback()
      } catch (error) {
        logger.error('Error during shutdown callback:', error)
      }
    }

    // Close browser if exists
    if (systemState.state.browser) {
      logger.info('Closing browser...')
      try {
        await systemState.state.browser.close()
      } catch (error) {
        logger.error('Error closing browser:', error)
      }
    }

    // Wait for current task to complete if any
    if (systemState.state.currentTask) {
      logger.info(`Waiting for current task to complete: ${systemState.state.currentTask}`)
      // Give it maximum 10 seconds to complete
      let waitTime = 0
      while (systemState.state.currentTask && waitTime < 10000) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        waitTime += 1000
      }
    }

    logger.info('Graceful shutdown completed')
    clearTimeout(forceShutdownTimeout)
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown:', error)
    clearTimeout(forceShutdownTimeout)
    process.exit(1)
  }
}

// Register signal handlers
export function setupGracefulShutdown() {
  // Handle different termination signals
  process.on('SIGTERM', () => performShutdown('SIGTERM'))
  process.on('SIGINT', () => performShutdown('SIGINT'))
  process.on('SIGUSR1', () => performShutdown('SIGUSR1'))
  process.on('SIGUSR2', () => performShutdown('SIGUSR2'))

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:', error)
    systemState.addError(error)
    performShutdown('uncaughtException')
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
    systemState.addError(reason)
    performShutdown('unhandledRejection')
  })

  logger.info('Graceful shutdown handlers registered')
}

export default {
  setupGracefulShutdown,
  registerShutdownCallback,
  isShutdown,
}