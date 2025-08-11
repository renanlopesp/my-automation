import Transport from 'winston-transport'
import { EventEmitter } from 'events'

class LogBuffer extends EventEmitter {
  constructor(maxSize = 1000) {
    super()
    this.maxSize = maxSize
    this.buffer = []
    this.subscribers = new Set()
  }

  add(log) {
    const formattedLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: log.timestamp || new Date().toISOString(),
      level: log.level,
      message: log.message,
      meta: log.meta || {},
      source: log.source || 'system',
      ...log
    }

    this.buffer.push(formattedLog)
    
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }

    this.emit('log', formattedLog)
    
    return formattedLog
  }

  getLogs(options = {}) {
    const { 
      limit = 100, 
      offset = 0, 
      level = null,
      source = null,
      search = null,
      startTime = null,
      endTime = null 
    } = options

    let filtered = [...this.buffer]

    if (level) {
      const levels = Array.isArray(level) ? level : [level]
      filtered = filtered.filter(log => levels.includes(log.level))
    }

    if (source) {
      filtered = filtered.filter(log => log.source === source)
    }

    if (search) {
      const regex = new RegExp(search, 'i')
      filtered = filtered.filter(log => 
        regex.test(log.message) || 
        regex.test(JSON.stringify(log.meta))
      )
    }

    if (startTime) {
      const start = new Date(startTime).getTime()
      filtered = filtered.filter(log => 
        new Date(log.timestamp).getTime() >= start
      )
    }

    if (endTime) {
      const end = new Date(endTime).getTime()
      filtered = filtered.filter(log => 
        new Date(log.timestamp).getTime() <= end
      )
    }

    const total = filtered.length
    const logs = filtered.slice(-offset - limit, offset ? -offset : undefined)

    return {
      logs: logs.reverse(),
      total,
      offset,
      limit,
      hasMore: offset + limit < total
    }
  }

  clear() {
    this.buffer = []
    this.emit('clear')
  }

  getStats() {
    const stats = {
      total: this.buffer.length,
      byLevel: {},
      bySource: {},
      oldestLog: this.buffer[0]?.timestamp,
      newestLog: this.buffer[this.buffer.length - 1]?.timestamp
    }

    this.buffer.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1
    })

    return stats
  }

  subscribe(callback) {
    this.subscribers.add(callback)
    this.on('log', callback)
    return () => {
      this.subscribers.delete(callback)
      this.off('log', callback)
    }
  }
}

class WebSocketTransport extends Transport {
  constructor(opts) {
    super(opts)
    this.name = 'websocket'
    this.buffer = opts.buffer
    this.broadcast = opts.broadcast
    // Increase max listeners to prevent warnings
    this.setMaxListeners(50)
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info)
    })

    const log = this.buffer.add(info)
    
    if (this.broadcast) {
      this.broadcast({
        type: 'logEntry',
        data: log
      })
    }

    callback()
  }
}

export const logBuffer = new LogBuffer(1000)

export function createWebSocketTransport(broadcast) {
  return new WebSocketTransport({
    buffer: logBuffer,
    broadcast
  })
}