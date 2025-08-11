import type { LogEntry, LogFilter, LogsResponse, LogStats } from '@/types/logs'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class LogsService {
  private cache: Map<string, LogEntry> = new Map()
  private maxCacheSize = 5000

  async fetchLogs(filter: LogFilter & { limit?: number; offset?: number }): Promise<LogsResponse> {
    const params = new URLSearchParams()
    
    if (filter.limit) params.append('limit', filter.limit.toString())
    if (filter.offset) params.append('offset', filter.offset.toString())
    if (filter.level) {
      const levels = Array.isArray(filter.level) ? filter.level : [filter.level]
      levels.forEach(l => params.append('level', l))
    }
    if (filter.source) params.append('source', filter.source)
    if (filter.search) params.append('search', filter.search)
    if (filter.startTime) params.append('startTime', filter.startTime)
    if (filter.endTime) params.append('endTime', filter.endTime)

    const response = await fetch(`${API_URL}/api/logs?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`)
    }

    const data: LogsResponse = await response.json()
    
    // Update cache
    data.logs.forEach(log => {
      this.cache.set(log.id, log)
      if (this.cache.size > this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) this.cache.delete(firstKey)
      }
    })

    return data
  }

  async fetchStats(): Promise<LogStats> {
    const response = await fetch(`${API_URL}/api/logs/stats`)
    if (!response.ok) {
      throw new Error(`Failed to fetch log stats: ${response.statusText}`)
    }
    return response.json()
  }

  async clearBuffer(): Promise<void> {
    const response = await fetch(`${API_URL}/api/logs/buffer`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`Failed to clear log buffer: ${response.statusText}`)
    }
    this.cache.clear()
  }

  async exportLogs(filter: LogFilter, format: 'json' | 'txt' = 'json'): Promise<Blob> {
    const response = await this.fetchLogs({ ...filter, limit: 10000, offset: 0 })
    
    if (format === 'json') {
      return new Blob([JSON.stringify(response.logs, null, 2)], { 
        type: 'application/json' 
      })
    } else {
      const text = response.logs.map(log => 
        `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.source || 'system'}: ${log.message}`
      ).join('\n')
      return new Blob([text], { type: 'text/plain' })
    }
  }

  getCachedLog(id: string): LogEntry | undefined {
    return this.cache.get(id)
  }

  searchCache(query: string): LogEntry[] {
    const regex = new RegExp(query, 'i')
    return Array.from(this.cache.values()).filter(log =>
      regex.test(log.message) || 
      regex.test(JSON.stringify(log.meta))
    )
  }

  // Group logs by a time window (in seconds)
  groupByTime(logs: LogEntry[], windowSeconds: number = 60): Map<string, LogEntry[]> {
    const groups = new Map<string, LogEntry[]>()
    
    logs.forEach(log => {
      const timestamp = new Date(log.timestamp)
      const windowStart = new Date(
        Math.floor(timestamp.getTime() / (windowSeconds * 1000)) * (windowSeconds * 1000)
      )
      const key = windowStart.toISOString()
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(log)
    })
    
    return groups
  }

  // Parse log message for common patterns
  parseLogMessage(message: string): {
    type?: string
    action?: string
    details?: string
    error?: string
  } {
    const patterns = {
      taskStart: /Task started: (.+)/,
      taskEnd: /Task completed: (.+)/,
      error: /Error: (.+)/,
      transfer: /Transfer: (.+) - (.+)/,
      queue: /Queue \[(.+)\]: (.+)/,
    }

    for (const [type, pattern] of Object.entries(patterns)) {
      const match = message.match(pattern)
      if (match) {
        return {
          type,
          action: match[1],
          details: match[2]
        }
      }
    }

    return { details: message }
  }
}

export const logsService = new LogsService()