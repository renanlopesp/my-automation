import { spawn } from 'child_process'

import { logger, logLine } from '#utils'

const controller = new AbortController()

export async function talk(text) {
  return new Promise((resolve, reject) => {
    const speakingProcess = spawn('say', [text], {
      shell: false,
      signal: controller.signal,
      detached: false,
    })

    speakingProcess.stdout.on('data', data => {
      return `${data.toString()}`.split('\n').map(logLine)
    })

    speakingProcess.stderr.on('data', data => {
      return `${data.toString()}`.split('\n').map(logLine)
    })

    speakingProcess.on('close', code => {
      logger.info(`Talking process exited with code ${code}`)
      resolve(speakingProcess.pid)
    })

    speakingProcess.on('error', error => {
      if (error.code !== 'ABORT_ERR') {
        logger.error(`Talking process exited with error: ${error.message}`)
        logger.error(`error:\n${JSON.stringify(error)}`)
        reject(error)
      }
    })
  })
}
