import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Search, Download, Pause, Play, Trash2, Filter } from 'lucide-react'
import type { LogEntry, LogLevel } from '@/types/logs'
import { logsService } from '@/services/logs'

interface LogViewerProps {
  logs: LogEntry[]
  isPaused?: boolean
  onPauseToggle?: () => void
  onClear?: () => void
  autoScroll?: boolean
  maxHeight?: string
}

const levelColors: Record<LogLevel, string> = {
  error: 'text-red-500 bg-red-50 dark:bg-red-950',
  warn: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  verbose: 'text-gray-600 bg-gray-50 dark:bg-gray-800',
  debug: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  silly: 'text-green-500 bg-green-50 dark:bg-green-950'
}

const levelIcons: Record<LogLevel, string> = {
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  verbose: '📝',
  debug: '🔍',
  silly: '🔧'
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  isPaused = false,
  onPauseToggle,
  onClear,
  autoScroll = true,
  maxHeight = '600px'
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
    new Set(['error', 'warn', 'info', 'verbose', 'debug', 'silly'])
  )
  const [showFilters, setShowFilters] = useState(false)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && !isPaused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll, isPaused])

  // Filter logs based on search and level
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.meta).toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesLevel = selectedLevels.has(log.level)
      
      return matchesSearch && matchesLevel
    })
  }, [logs, searchTerm, selectedLevels])

  const handleLevelToggle = (level: LogLevel) => {
    const newLevels = new Set(selectedLevels)
    if (newLevels.has(level)) {
      newLevels.delete(level)
    } else {
      newLevels.add(level)
    }
    setSelectedLevels(newLevels)
  }

  const handleExport = async (format: 'json' | 'txt') => {
    const blob = await logsService.exportLogs({ 
      level: Array.from(selectedLevels),
      search: searchTerm 
    }, format)
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString()}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-md transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause/Resume */}
          {onPauseToggle && (
            <button
              onClick={onPauseToggle}
              className="p-1.5 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
          
          {/* Clear */}
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          
          {/* Export */}
          <div className="relative group">
            <button className="p-1.5 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-1 w-24 bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => handleExport('json')}
                className="block w-full px-3 py-1.5 text-sm text-left text-gray-300 hover:bg-gray-700"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="block w-full px-3 py-1.5 text-sm text-left text-gray-300 hover:bg-gray-700"
              >
                Text
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Level filters */}
      {showFilters && (
        <div className="flex items-center gap-2 p-3 bg-gray-800 border-b border-gray-700">
          <span className="text-sm text-gray-400">Levels:</span>
          {(['error', 'warn', 'info', 'verbose', 'debug', 'silly'] as LogLevel[]).map(level => (
            <button
              key={level}
              onClick={() => handleLevelToggle(level)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                selectedLevels.has(level)
                  ? levelColors[level]
                  : 'bg-gray-700 text-gray-500'
              }`}
            >
              {levelIcons[level]} {level.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Log container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto font-mono text-xs p-3 space-y-1"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchTerm || selectedLevels.size < 6 
              ? 'No logs match your filters' 
              : 'No logs yet...'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-2 p-2 rounded ${levelColors[log.level]} bg-opacity-10`}
            >
              {/* Timestamp */}
              <span className="text-gray-500 whitespace-nowrap">
                {formatTimestamp(log.timestamp)}
              </span>
              
              {/* Level */}
              <span className={`font-semibold uppercase w-16 text-center ${levelColors[log.level].split(' ')[0]}`}>
                [{log.level}]
              </span>
              
              {/* Source */}
              {log.source && (
                <span className="text-cyan-500">
                  {log.source}:
                </span>
              )}
              
              {/* Message */}
              <span className="flex-1 text-gray-200 break-all">
                {log.message}
              </span>
              
              {/* Meta data */}
              {log.meta && Object.keys(log.meta).length > 0 && (
                <details className="ml-auto">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                    meta
                  </summary>
                  <pre className="mt-1 p-2 bg-gray-800 rounded text-xs text-gray-400">
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
        
        {/* Paused indicator */}
        {isPaused && (
          <div className="sticky bottom-0 text-center py-2 bg-yellow-600 bg-opacity-20 text-yellow-500 rounded">
            ⏸ Logs paused - New logs will not be displayed
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <span>
          Showing {filteredLogs.length} of {logs.length} logs
        </span>
        <span>
          {isPaused && '⏸ Paused'}
        </span>
      </div>
    </div>
  )
}