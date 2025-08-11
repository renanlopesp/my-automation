import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { websocketMiddleware } from './middleware/websocket'
import type { SystemState, Activity, Transfer, QueueStats, Environment } from '@/types'
import type { LogEntry, LogsState } from '@/types/logs'

export interface AppState {
  // Connection (managed by WebSocket middleware)
  isConnected: boolean
  
  // System State (managed by WebSocket middleware)
  systemState: SystemState | null
  
  // Queues (managed by WebSocket middleware)
  queues: { [env: string]: QueueStats }
  
  // Transfers (managed by WebSocket middleware)
  activeTransfers: Transfer[]
  currentTransfer: Transfer | null
  transferHistory: Transfer[]
  
  // Activities (managed by WebSocket middleware)
  activities: Activity[]
  maxActivities: number
  
  // Errors (managed by WebSocket middleware)
  errors: any[]
  
  // Logs (managed by WebSocket middleware)
  logs: LogEntry[]
  logsState?: Partial<LogsState>
  
  // UI State (managed manually)
  selectedEnv: Environment | 'all'
  setSelectedEnv: (env: Environment | 'all') => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  
  // Manual actions only (no WebSocket logic!)
  addActivity: (activity: Pick<Activity, 'type' | 'message' | 'data'>) => void
  clearActivities: () => void
  clearErrors: () => void
}

export const useStore = create<AppState>()(
  devtools(
    websocketMiddleware(
      (set) => ({
        // Initial state - WebSocket middleware will update these
        isConnected: false,
        systemState: null,
        queues: {},
        activeTransfers: [],
        currentTransfer: null,
        transferHistory: [],
        activities: [],
        maxActivities: 100,
        errors: [],
        
        // Logs defaults
        logs: [],
        logsState: {
          isPaused: false,
          maxBufferSize: 1000
        },
        
        // UI State defaults
        selectedEnv: 'all',
        sidebarOpen: true,
        
        // UI State actions
        setSelectedEnv: (env) => set({ selectedEnv: env }),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        
        // Manual actions
        addActivity: (activity) => set((state) => ({
          activities: [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: new Date().toISOString(),
              type: activity.type,
              message: activity.message,
              data: activity.data
            } as Activity,
            ...state.activities
          ].slice(0, state.maxActivities)
        })),
        clearActivities: () => set({ activities: [] }),
        clearErrors: () => set({ errors: [] }),
      })
    ),
    {
      name: 'dsm-dashboard-store',
    }
  )
)