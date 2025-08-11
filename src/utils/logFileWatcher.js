import fs from 'fs'
import { EventEmitter } from 'events'
import readline from 'readline'
import { logger } from './logger.js'

class LogFileWatcher extends EventEmitter {
  constructor(filepath) {
    super()
    this.filepath = filepath
    this.position = 0
    this.watcher = null
    this.isReading = false
    this.retryCount = 0
    this.maxRetries = 3
    // Deduplication cache
    this.recentLogs = new Map()
    this.cacheMaxSize = 1000
    this.cacheTimeout = 5000 // 5 seconds
  }

  start() {
    try {
      // Check if file exists
      if (!fs.existsSync(this.filepath)) {
        logger.warn(`Log file ${this.filepath} does not exist yet, will wait for it...`)
        this.position = 0
      } else {
        // Get initial file size to start from end (only new lines)
        const stats = fs.statSync(this.filepath)
        this.position = stats.size
        logger.info(`Starting log file watcher from position ${this.position}`)
      }

      // Watch for changes using fs.watchFile (polling every 500ms)
      this.watcher = fs.watchFile(this.filepath, { interval: 500 }, (curr, prev) => {
        // File created
        if (prev.size === 0 && curr.size > 0 && this.position === 0) {
          logger.info('Log file created, reading from beginning')
          this.readNewLines(0, curr.size)
        }
        // File grew
        else if (curr.size > this.position && !this.isReading) {
          this.readNewLines(this.position, curr.size)
        }
        // File truncated or rotated
        else if (curr.size < this.position) {
          logger.info('Log file was truncated or rotated, resetting position')
          this.position = 0
          if (curr.size > 0) {
            this.readNewLines(0, curr.size)
          }
        }
      })

      this.emit('started')
      logger.info(`Log file watcher started for ${this.filepath}`)
    } catch (error) {
      logger.error('Failed to start log file watcher:', error)
      this.emit('error', error)
    }
  }

  readNewLines(startPos, endPos) {
    if (this.isReading) return

    this.isReading = true
    const bytesToRead = endPos - startPos

    // Don't read if nothing new
    if (bytesToRead <= 0) {
      this.isReading = false
      return
    }

    let stream = null
    let rl = null

    try {
      // Create read stream from last position
      stream = fs.createReadStream(this.filepath, {
        start: startPos,
        end: endPos - 1, // end is inclusive, so subtract 1
        encoding: 'utf8'
      })

      // Increase max listeners to prevent warnings
      stream.setMaxListeners(50)

      rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity // Handle all line break types
      })

      rl.on('line', (line) => {
        if (!line.trim()) return // Skip empty lines

        // Filter out known harmless Chrome warnings
        if (line.includes('google_apis/gcm/engine/registration_request.cc') ||
            line.includes('DEPRECATED_ENDPOINT') ||
            line.includes('Failed to call method: org.freedesktop.DBus') ||
            line.includes('org.freedesktop.UPower') ||
            line.includes('WARNING: All log messages before absl::InitializeLog') ||
            line.includes('Created TensorFlow Lite XNNPACK delegate') ||
            line.includes('DevTools listening on ws://')) {
          return // Skip these known Chrome internal warnings
        }

        try {
          // Parse Winston JSON log format
          const log = JSON.parse(line)

          // Add source if not present
          if (!log.source) {
            log.source = 'main'
          }

          // Deduplication check
          const logKey = `${log.timestamp}_${log.level}_${log.message}`
          const now = Date.now()

          // Check if we've seen this log recently
          if (this.recentLogs.has(logKey)) {
            const lastSeen = this.recentLogs.get(logKey)
            if (now - lastSeen < this.cacheTimeout) {
              // Skip duplicate log
              return
            }
          }

          // Store in cache and clean old entries
          this.recentLogs.set(logKey, now)
          if (this.recentLogs.size > this.cacheMaxSize) {
            // Remove old entries
            const cutoff = now - this.cacheTimeout
            for (const [key, time] of this.recentLogs) {
              if (time < cutoff) {
                this.recentLogs.delete(key)
              }
            }
          }

          this.emit('newLog', log)
          this.retryCount = 0 // Reset retry count on success
        } catch (err) {
          // Try to handle non-JSON log lines
          if (line.includes('[INFO') || line.includes('[ERROR') || line.includes('[WARN')) {
            // Handle formatted console output
            const match = line.match(/\[(\w+)[^\]]*\]\s*(.*)/)
            if (match) {
              const [, level, message] = match
              const timestamp = new Date().toISOString()

              // Deduplication check for non-JSON logs
              const logKey = `${timestamp}_${level.toLowerCase()}_${message.trim()}`
              const now = Date.now()

              if (this.recentLogs.has(logKey)) {
                const lastSeen = this.recentLogs.get(logKey)
                if (now - lastSeen < this.cacheTimeout) {
                  return // Skip duplicate
                }
              }

              this.recentLogs.set(logKey, now)

              this.emit('newLog', {
                level: level.toLowerCase(),
                message: message.trim(),
                timestamp: timestamp,
                source: 'main'
              })
            }
          }
          // Ignore lines that can't be parsed
        }
      })

      rl.on('error', (error) => {
        logger.error('Error reading log file:', error)
        // IMPORTANT: Update position even on error to avoid re-reading same content
        this.position = endPos
        this.isReading = false
        this.handleReadError(error)
        // Clean up resources
        if (rl) {
          rl.removeAllListeners()
          rl.close()
        }
        if (stream) {
          stream.removeAllListeners()
          stream.destroy()
        }
      })

      rl.on('close', () => {
        this.position = endPos
        this.isReading = false
        // Clean up readline interface
        if (rl) {
          rl.removeAllListeners()
        }
        // Clean up stream
        if (stream) {
          stream.removeAllListeners()
          stream.destroy()
        }
      })
    } catch (error) {
      logger.error('Failed to read new lines:', error)
      // IMPORTANT: Update position even on error to avoid re-reading same content
      this.position = endPos
      this.isReading = false
      this.handleReadError(error)
      // Clean up resources on error
      if (rl) {
        rl.removeAllListeners()
        rl.close()
      }
      if (stream) {
        stream.removeAllListeners()
        stream.destroy()
      }
    }
  }

  handleReadError(error) {
    this.retryCount++
    if (this.retryCount <= this.maxRetries) {
      logger.info(`Retrying read operation (${this.retryCount}/${this.maxRetries})...`)
      setTimeout(() => {
        this.isReading = false
      }, 1000 * this.retryCount)
    } else {
      this.emit('error', error)
    }
  }

  stop() {
    if (this.watcher) {
      fs.unwatchFile(this.filepath)
      this.watcher = null
      // Clear deduplication cache
      this.recentLogs.clear()
      logger.info('Log file watcher stopped')
      this.emit('stopped')
    }
  }

  // Get current stats
  getStats() {
    return {
      filepath: this.filepath,
      position: this.position,
      isReading: this.isReading,
      isWatching: !!this.watcher
    }
  }
}

export default LogFileWatcher