import { NODE_ENV, ROUND_DELAY } from '#config'
import { closeChrome, prepareBrowser, startChrome } from '#ops'
import { logger, sleep, setupGracefulShutdown, isShutdown } from '#utils'
import systemState from './state.js'

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
  
  // start browser
  logger.info('Starting Chrome browser...')
  await startChrome()
  const browser = await prepareBrowser({ port: 9922 })
  systemState.setBrowser(browser)
  systemState.updateStatus('idle')

  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 5
  
  while (!isShutdown() && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    let roundHadError = false
    
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
      roundHadError = true
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
      roundHadError = true
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
      roundHadError = true
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
