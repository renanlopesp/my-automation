import { logger } from '#utils'

export function logLine(line) {
  const output = line.trim()
  if (output) {
    logger.warn(`\n ${line.trim()}`)
  }
}
