import 'dotenv/config'
import { exec, spawn } from 'child_process'
import { readFile, writeFile } from 'fs/promises'

import { CHROME_PATH } from '#config'
import { logger, sleep, logLine } from '#utils'
import { chromeCliArguments } from '../chrome-cli-arguments.js'

let controller = new AbortController()
const PID_FILE = './CHROME_PID'

async function getChromeCanaryPid(appPath) {
  return new Promise((resolve, reject) => {
    const findPidCommand = `ps aux | grep "${appPath}" | grep -v grep | awk '{print $2}'`

    exec(findPidCommand, (error, stdout, stderr) => {
      if (error) {
        logger.warn(`❌ Error finding PID: ${error.message}`)
        return reject(error)
      }

      if (stderr) {
        logger.warn(`Heads up looking for PID: ${stderr}`)
      }

      const pid = stdout.trim()
      if (!pid) {
        logger.warn('No process found for Google Chrome Canary.')
        return resolve(undefined)
      }

      resolve(pid)
    })
  })
}

async function killLastChrome(pid) {
  return new Promise((resolve, reject) => {
    exec(`kill -9 ${pid}`, (error, stdout, stderr) => {
      if (stderr) {
        logger.warn(`${stderr}`)
      }

      if (error || stderr) {
        logger.warn(`Failed to kill Chrome`)
        logger.warn(`\n---\n${error.message}\n---`)
        return reject()
      } else {
        logger.info(`Last Chrome closed pid: ${pid}`)
      }

      return resolve()
    })
  })
}

export async function closeChrome() {
  return new Promise((resolve, reject) => {
    controller.abort()

    if (controller.signal.aborted) {
      logger.info('Chrome process closed')
      controller = new AbortController()
      resolve()
    } else {
      logger.warn('Chrome aborting failed')
      controller = new AbortController()
      reject()
    }
  })
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
  // Only start a new Chrome window without killing any existing ones
  const pid = await spinUpChrome()
  await writeFile(PID_FILE, pid.toString(), {
    encoding: 'utf-8',
  })

  logger.info(`Chrome process started, pid: ${pid}`)

  await sleep(1000 * 5)
}
