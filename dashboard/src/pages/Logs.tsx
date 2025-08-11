import React, { useState } from 'react'
import { Terminal, Activity, AlertCircle, Info } from 'lucide-react'
import { LogViewer } from '@/components/LogViewer'
import { useStore } from '@/store'
import { useLogsData, useLogStats, useLogActions } from '@/store/selectors/logs'

export default function Logs() {
  const isConnected = useStore((state) => state.isConnected)
  const [autoScroll, setAutoScroll] = useState(true)
  
  // Use custom hooks instead of useEffect
  const { logs, isLoading, isPaused, refetch } = useLogsData()
  const { data: stats } = useLogStats()
  const { setPaused, clearLogs } = useLogActions()
  
  const handleClear = async () => {
    try {
      await clearLogs()
      refetch()
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }
  
  const handlePauseToggle = () => {
    setPaused(!isPaused)
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Logs
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time system logs and debugging information
            </p>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
          isConnected 
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.byLevel?.error || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.byLevel?.warn || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Info</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.byLevel?.info || 0}
                </p>
              </div>
              <Info className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Settings Bar */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded text-blue-500 focus:ring-blue-500"
            />
            Auto-scroll
          </label>
          
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Buffer: {logs.length} logs
          </span>
        </div>

        {/* Log Level Distribution */}
        {stats && (
          <div className="flex items-center gap-2 text-xs">
            {Object.entries(stats.byLevel || {}).map(([level, count]) => (
              <span
                key={level}
                className={`px-2 py-1 rounded ${
                  level === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  level === 'warn' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                  level === 'info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {level}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Log Viewer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <LogViewer
            logs={logs}
            isPaused={isPaused}
            onPauseToggle={handlePauseToggle}
            onClear={handleClear}
            autoScroll={autoScroll}
            maxHeight="600px"
          />
        )}
      </div>

      {/* Help Text */}
      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
        <p>💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Use the search bar to filter logs by content</li>
          <li>Click the filter button to show/hide specific log levels</li>
          <li>Export logs as JSON or text for analysis</li>
          <li>Pause log streaming to examine specific entries</li>
        </ul>
      </div>
    </div>
  )
}