import 'dotenv/config'
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'

import { CHROME_PATH } from '#config'
import { logger, sleep, logLine } from '#utils'
import { chromeCliArguments } from '../chrome-cli-arguments.js'

let controller = new AbortController()
const PID_FILE = './CHROME_PID'


export async function isChomeRunning(port = 9922) {
  try {
    const response = await fetch(`http://localhost:${port}/json/version`)
    return response.ok
  } catch {
    return false
  }
}

export async function closeChrome() {
  try {
    // Try to read and kill the Chrome process using saved PID
    const pidStr = await readFile(PID_FILE, 'utf-8')
    const pid = parseInt(pidStr.trim())
    
    if (pid && !isNaN(pid)) {
      try {
        process.kill(pid, 'SIGTERM')
        logger.info(`Chrome process ${pid} terminated`)
        
        // Give it time to close gracefully
        await sleep(2000)
        
        // Force kill if still running
        try {
          process.kill(pid, 0) // Check if still running
          process.kill(pid, 'SIGKILL')
          logger.info(`Chrome process ${pid} force killed`)
        } catch {
          // Process already terminated
        }
      } catch (error) {
        if (error.code !== 'ESRCH') { // ESRCH means process doesn't exist
          logger.warn(`Failed to kill Chrome process: ${error.message}`)
        }
      }
    }
    
    // Clean up PID file
    await unlink(PID_FILE).catch(() => {})
    
    // Abort controller if active
    controller.abort()
    controller = new AbortController()
    
    return true
  } catch (error) {
    logger.warn(`closeChrome error: ${error.message}`)
    return false
  }
}

async function spinUpChrome(chromePath = CHROME_PATH) {
  return new Promise((resolve, reject) => {
    const chromeProcess = spawn(chromePath, chromeCliArguments, {
      shell: false,
      signal: controller.signal,
      detached: false,
    })

    chromeProcess.stdout.on('data', data => {
      ;`${data.toString()}`.split('\n').map(logLine)
    })

    chromeProcess.stderr.on('data', data => {
      ;`${data.toString()}`.split('\n').map(logLine)
    })

    chromeProcess.on('close', code => {
      logger.info(`Chrome process exited with code ${code}`)
    })

    chromeProcess.on('error', error => {
      if (error.code !== 'ABORT_ERR') {
        logger.error(`Chrome process exited with error: ${error.message}`)
        logger.error(`error:\n${JSON.stringify(error)}`)
        reject(error)
      }
    })

    return resolve(chromeProcess.pid)
  })
}

export async function startChrome() {
  // Check if Chrome is already running
  const isRunning = await isChomeRunning()
  if (isRunning) {
    logger.info('Chrome is already running on port 9922, skipping start')
    return
  }
  
  // Only start a new Chrome window if not already running
  const pid = await spinUpChrome()
  
  if (!pid) {
    logger.error('Failed to start Chrome - no PID returned')
    throw new Error('Chrome process failed to start')
  }
  
  await writeFile(PID_FILE, pid.toString(), {
    encoding: 'utf-8',
  })

  logger.info(`Chrome process started, pid: ${pid}`)

  await sleep(1000 * 5)
}
