import winston from 'winston'
import Transport from 'winston-transport'

import { NODE_ENV } from '../config.js'
import { createWebSocketTransport, logBuffer } from './logBuffer.js'

const Dim = '\x1b[2m'

const FgBlack = '\x1b[30m'
const FgGreen = '\x1b[32m'
const FgYellow = '\x1b[33m'
const FgCyan = '\x1b[36m'
const FgWhite = '\x1b[37m'

const BgRed = '\x1b[41m'

const Clear = '\x1b[0m'

const Colors = {
  silly: `${Dim}${FgGreen}`,
  trace: `${Dim}${FgCyan}`,
  info: `${FgCyan}`,
  error: `${BgRed}${FgBlack}`,
  warn: `${FgYellow}`,
  verbose: `${FgWhite}`,
}

class SimpleConsoleTransport extends Transport {
  constructor() {
    super()
    this.isProd = false
  }

  log(info, callback) {
    const { level, message, stack, timestamp } = info
    console.log(
      `${!this.isProd ? Colors[level] : ''}[${String(
        level,
      ).toUpperCase()}${timestamp ? ` ${timestamp}` : ''}]\t${message}${!this.isProd ? Clear : ''}`,
      stack ? `\n${stack}` : '',
    )
    if (callback) {
      callback()
    }
  }
}

const transports = [
  new winston.transports.File({ filename: './general.log' }),
  new SimpleConsoleTransport(),
]

export const logger = winston.createLogger({
  level: NODE_ENV !== 'development' ? 'info' : 'silly',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports,
})

// Increase max listeners to prevent memory leak warnings
logger.setMaxListeners(50)

export function addWebSocketTransport(broadcast) {
  const wsTransport = createWebSocketTransport(broadcast)
  logger.add(wsTransport)
  return wsTransport
}

export { logBuffer }

export function switchTransportTo(filename = './general.log') {
  logger.info(`Moving logs to: ${filename}`)
  if (!filename) {
    return
  }

  const notGeneralTransports = logger.transports.filter(t => {
    return (
      t instanceof winston.transports.File &&
      !t.filename.includes('general.log')
    )
  })

  notGeneralTransports.forEach(t => logger.remove(t))

  const newTransport = new winston.transports.File({ filename })
  logger.add(newTransport)
}

logger.info('Logger initialized')
