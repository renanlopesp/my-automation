import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store'
import { logsService } from '@/services/logs'
import type { LogEntry } from '@/types/logs'

/**
 * Custom hook that combines initial logs from API with real-time WebSocket logs
 * This eliminates the need for useEffect synchronization
 */
export const useLogsData = () => {
  const logs = useStore((state) => state.logs)
  const isPaused = useStore((state) => state.logsState?.isPaused || false)
  
  // Fetch initial logs from API
  const { data: initialLogs, isLoading, refetch } = useQuery({
    queryKey: ['logs'],
    queryFn: () => logsService.fetchLogs({ limit: 500, offset: 0 }),
    refetchInterval: false,
  })
  
  // Combine and deduplicate logs automatically
  const combinedLogs = useMemo(() => {
    // Use Map to deduplicate by ID
    const logsMap = new Map<string, LogEntry>()
    
    // Add initial logs from API
    initialLogs?.logs?.forEach(log => {
      logsMap.set(log.id, log)
    })
    
    // Add/update with real-time logs (newer logs override older ones)
    logs.forEach(log => {
      logsMap.set(log.id, log)
    })
    
    // Convert back to array, sort by timestamp (oldest first), and limit
    return Array.from(logsMap.values())
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeA - timeB
      })
      .slice(-1000) // Keep last 1000 logs
  }, [logs, initialLogs?.logs])
  
  return {
    logs: combinedLogs,
    isLoading,
    refetch,
    isPaused,
  }
}

/**
 * Hook for log statistics
 */
export const useLogStats = () => {
  return useQuery({
    queryKey: ['logStats'],
    queryFn: () => logsService.fetchStats(),
    refetchInterval: 10000, // Refresh every 10 seconds
  })
}

/**
 * Hook for log actions
 */
export const useLogActions = () => {
  const setPaused = (paused: boolean) => {
    useStore.setState((state) => ({
      ...state,
      logsState: {
        ...state.logsState,
        isPaused: paused,
        maxBufferSize: state.logsState?.maxBufferSize || 1000,
      }
    }))
  }
  
  const clearLogs = async () => {
    await logsService.clearBuffer()
    // Clear logs in store
    useStore.setState((state) => ({
      ...state,
      logs: []
    }))
  }
  
  return {
    setPaused,
    clearLogs,
  }
}