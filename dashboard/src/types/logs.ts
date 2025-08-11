export type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  source?: string
  meta?: Record<string, any>
}

export interface LogFilter {
  level?: LogLevel | LogLevel[]
  source?: string
  search?: string
  startTime?: string
  endTime?: string
}

export interface LogsResponse {
  logs: LogEntry[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

export interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  bySource: Record<string, number>
  oldestLog?: string
  newestLog?: string
}

export interface LogsState {
  logs: LogEntry[]
  filter: LogFilter
  stats: LogStats | null
  isLoading: boolean
  isPaused: boolean
  autoScroll: boolean
  maxBufferSize: number
}