import { NODE_ENV, ROUND_DELAY } from '#config'
import { closeChrome, prepareBrowser, startChrome, isChomeRunning } from '#ops'
import { logger, sleep, setupGracefulShutdown, isShutdown, registerShutdownCallback } from '#utils'
import systemState from './state.js'
import { tabManager } from './utils/tabManager.js'
import { taskQueue } from './utils/taskQueue.js'

import { receive } from './receive.js'
import { rename } from './rename.js'
import { send } from './send.js'

const DELAY =
  NODE_ENV !== 'development' ? ROUND_DELAY * 60 * 1000 : ROUND_DELAY * 1000
const SMALL_DELAY = 3 * 1000

const ACTIVE_ENVS = NODE_ENV === 'development' ? ['local'] : ['dev', 'prod']

async function main() {
  logger.info('🚀 DSM Automation starting...')
  logger.info(`Environment: ${NODE_ENV}`)
  logger.info(`Round delay: ${DELAY / 1000} seconds`)
  logger.info(`Active environments: ${ACTIVE_ENVS.join(', ')}`)

  // Setup graceful shutdown handlers
  setupGracefulShutdown()
  
  // Register cleanup on shutdown
  registerShutdownCallback(async () => {
    logger.info('Closing all tabs...')
    await tabManager.closeAll()
    logger.info('Closing Chrome process...')
    await closeChrome()
  })

  // Check if Chrome is already running or start new one
  let browser
  logger.info('Checking for existing Chrome instance...')
  
  try {
    // Try to connect to existing Chrome first
    const isRunning = await isChomeRunning()
    if (isRunning) {
      logger.info('Found existing Chrome instance, connecting...')
      browser = await prepareBrowser({ port: 9922 })
      logger.info('Connected to existing Chrome instance')
    } else {
      // Start new Chrome if not running
      logger.info('No Chrome instance found, starting new one...')
      await startChrome()
      logger.info('Chrome started successfully')
      browser = await prepareBrowser({ port: 9922 })
      logger.info('Connected to new Chrome instance')
    }
    
    systemState.setBrowser(browser)
    systemState.updateStatus('idle')
    
    // Initialize tab manager with browser instance
    tabManager.setBrowser(browser)
    logger.info('Tab manager initialized with browser instance')
  } catch (error) {
    logger.error('Failed to setup Chrome:', error.message)
    logger.error('Please make sure Chrome is installed at /usr/bin/google-chrome')
    logger.error('You can install it with: sudo apt-get install google-chrome-stable')
    await closeChrome()
    process.exit(1)
  }

  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 5

  while (!isShutdown() && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    // Log tab manager statistics periodically
    const tabStats = tabManager.getStats()
    logger.info(`Tab pool status: ${JSON.stringify(tabStats)}`)
    
    // Clean up any closed tabs
    const cleaned = tabManager.cleanup()
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} closed tabs from pool`)
    }
    
    // Clean up old queue tasks periodically
    const queueCleaned = await taskQueue.cleanup(24) // Clean tasks older than 24 hours
    if (queueCleaned > 0) {
      logger.info(`Cleaned up ${queueCleaned} old tasks from queue`)
    }

    // Check for queued tasks first
    const queuedTask = await taskQueue.getNext()
    if (queuedTask) {
      logger.info(`📋 Processing queued task: ${queuedTask.id} (${queuedTask.type})`)
      
      try {
        systemState.updateStatus('running', { currentTask: queuedTask.type })
        
        switch (queuedTask.type) {
          case 'receive':
            logger.info(`📦 Starting RECEIVE task from queue`)
            systemState.startTask('receive')
            const receiveResult = await receive(browser)
            systemState.endTask('receive', receiveResult)
            await taskQueue.complete(queuedTask.id, { success: true })
            break
            
          case 'rename':
            logger.info(`🎊 Starting RENAME task from queue for ${queuedTask.env}`)
            systemState.startTask('rename')
            const renameResult = await rename(queuedTask.env || 'local', browser)
            systemState.endTask('rename', renameResult)
            await taskQueue.complete(queuedTask.id, { success: true })
            break
            
          case 'send':
            logger.info(`✈️ Starting SEND task from queue for ${queuedTask.env}`)
            systemState.startTask('send')
            const sendResult = await send(queuedTask.env || 'local', browser)
            systemState.endTask('send', sendResult)
            await taskQueue.complete(queuedTask.id, { success: true })
            break
            
          default:
            logger.warn(`Unknown task type: ${queuedTask.type}`)
            await taskQueue.fail(queuedTask.id, new Error('Unknown task type'))
        }
        
        consecutiveErrors = 0 // Reset on success
        systemState.updateStatus('idle')
        
        // Continue to next iteration to check for more queued tasks
        continue
      } catch (err) {
        logger.error(`Queued task ${queuedTask.id} error:`, err)
        systemState.addError(err)
        await taskQueue.fail(queuedTask.id, err)
        consecutiveErrors++
        systemState.updateStatus('idle')
      }
    }

    // If no queued tasks, run normal cycle
    // receive
    try {
      if (isShutdown()) break
      logger.info(`📦 Starting RECEIVE task`)
      systemState.startTask('receive')
      systemState.updateStatus('running', { currentTask: 'receive' })

      const result = await receive(browser)
      systemState.endTask('receive', result)
      consecutiveErrors = 0 // Reset on success
    } catch (err) {
      logger.error('RECEIVE task error:', err)
      systemState.addError(err)
      consecutiveErrors++
    } finally {
      logger.info(`🚚 Finishing RECEIVE task`)
    }

    // rename
    try {
      if (isShutdown()) break
      for await (const envName of ACTIVE_ENVS) {
        if (isShutdown()) break
        logger.info(`🎊 Starting RENAME task for ${envName}`)
        systemState.startTask('rename')
        systemState.updateStatus('running', { currentTask: `rename-${envName}` })

        const result = await rename(envName, browser)
        systemState.endTask('rename', result)
        consecutiveErrors = 0 // Reset on success
        await sleep(SMALL_DELAY)
      }
    } catch (err) {
      logger.error('RENAME task error:', err)
      systemState.addError(err)
      consecutiveErrors++
    } finally {
      logger.info(`✍🏼 Finishing RENAME task`)
    }

    // send
    try {
      if (isShutdown()) break
      logger.info(`✈️ Starting SEND task`)
      for await (const envName of ACTIVE_ENVS) {
        if (isShutdown()) break
        systemState.startTask('send')
        systemState.updateStatus('running', { currentTask: `send-${envName}` })

        const result = await send(envName, browser)
        systemState.endTask('send', result)
        consecutiveErrors = 0 // Reset on success
        await sleep(SMALL_DELAY)
      }
    } catch (err) {
      logger.error('SEND task error:', err)
      systemState.addError(err)
      consecutiveErrors++
    } finally {
      logger.info(`🚢 Finishing SEND task`)
    }

    if (isShutdown()) {
      logger.info('Shutdown requested, exiting loop...')
      break
    }

    // Update state
    systemState.updateStatus('sleeping')
    systemState.state.lastRun = new Date().toISOString()
    systemState.setNextRun(new Date(Date.now() + DELAY).toISOString())

    logger.info(`💤 Round complete, sleeping for ${DELAY / 1000}s`)
    logger.info(`Next run at: ${systemState.state.nextRun}`)

    // Sleep with interruptible intervals for shutdown
    const sleepInterval = 5000 // Check every 5 seconds
    let remainingTime = DELAY
    while (remainingTime > 0 && !isShutdown()) {
      await sleep(Math.min(sleepInterval, remainingTime))
      remainingTime -= sleepInterval
    }

    systemState.updateStatus('idle')
  }

  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    logger.error(`Too many consecutive errors (${consecutiveErrors}), shutting down...`)
    systemState.updateStatus('error')
  }

  logger.info('Main loop ended, cleaning up...')
  await closeChrome()
  process.exit(0)
}

export default main()
// export default receive()
// export default send('local')
// export default rename('local')
