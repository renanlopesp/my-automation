import { wsService } from '@/services/websocket'
import type { StateCreator } from 'zustand'
import type { AppState } from '../index'

/**
 * WebSocket Middleware for Zustand
 * 
 * This middleware automatically:
 * 1. Connects to WebSocket when store is created
 * 2. Sets up all event listeners
 * 3. Updates store state when WebSocket events occur
 * 4. No useEffect needed anywhere in the app!
 */
export const websocketMiddleware = <T extends AppState>(
  config: StateCreator<T>
): StateCreator<T> => {
  return (set, get, api) => {
    // Initialize the original store
    const store = config(set, get, api)
    
    // Only run on client side
    if (typeof window !== 'undefined') {
      // Use queueMicrotask to ensure store is fully initialized
      queueMicrotask(() => {
        // Connect to WebSocket
        wsService.connect()
        
        // Connection status handlers
        wsService.on('connected', () => {
          set((state) => ({ ...state, isConnected: true }) as T)
          addActivity('success', 'Connected to server')
        })
        
        wsService.on('disconnected', () => {
          set((state) => ({ ...state, isConnected: false }) as T)
          addActivity('warning', 'Disconnected from server')
        })
        
        // System state handlers
        wsService.on('state', (data) => {
          set((state) => ({ ...state, systemState: data }) as T)
        })
        
        wsService.on('statusUpdate', (data) => {
          set((state) => ({
            ...state,
            systemState: state.systemState 
              ? { ...state.systemState, status: data.status }
              : null
          }) as T)
        })
        
        // Queue handlers
        wsService.on('queueUpdate', (data) => {
          if (data.env && data.data) {
            set((state) => ({
              ...state,
              queues: { 
                ...state.queues, 
                [data.env]: data.data 
              }
            }) as T)
          }
        })
        
        // Transfer handlers
        wsService.on('transferUpdate', (transfer) => {
          set((state) => ({ 
            ...state, 
            currentTransfer: transfer 
          }) as T)
        })
        
        wsService.on('transferComplete', (data) => {
          set((state) => {
            // Remove from active transfers
            const activeTransfers = state.activeTransfers?.filter(
              (t: any) => t.id !== data.transferId
            ) || []
            
            // Clear current transfer if it matches
            const currentTransfer = state.currentTransfer?.id === data.transferId 
              ? null 
              : state.currentTransfer
            
            return {
              ...state,
              activeTransfers,
              currentTransfer
            } as T
          })
        })
        
        // Helper function to add activities
        const addActivity = (type: string, message: string, data?: any) => {
          const activity = {
            id: `${Date.now()}-${Math.random()}`,
            type,
            message,
            timestamp: new Date().toISOString(),
            data
          }
          
          set((state) => ({
            ...state,
            activities: [
              activity,
              ...(state.activities || [])
            ].slice(0, 100) // Keep only last 100 activities
          }) as T)
        }
        
        // Activity feed handlers
        wsService.on('transferProgress', (data) => {
          addActivity(
            'info',
            `${data.stage}: ${data.action || data.progress + '%'}`,
            data
          )
          
          // Update transfer progress if it's the current one
          set((state) => {
            if (state.currentTransfer?.id === data.transferId) {
              return {
                ...state,
                currentTransfer: {
                  ...state.currentTransfer,
                  progress: data.progress,
                  stage: data.stage
                }
              } as T
            }
            return state
          })
        })
        
        wsService.on('taskStart', (data) => {
          addActivity('info', `Task started: ${data.taskName}`, data)
        })
        
        wsService.on('taskEnd', (data) => {
          addActivity('success', `Task completed: ${data.taskName}`, data)
        })
        
        wsService.on('error', (data) => {
          addActivity('error', `Error: ${data.message}`, data)
          
          // Add to errors array
          set((state) => ({
            ...state,
            errors: [
              ...(state.errors || []),
              {
                message: data.message,
                timestamp: new Date().toISOString(),
                ...data
              }
            ].slice(0, 50) // Keep last 50 errors
          }) as T)
        })
        
        // Marketplace and queue check handlers
        wsService.on('marketplaceCheck', (data) => {
          addActivity('info', 'Checking marketplace for new templates...', data)
        })
        
        wsService.on('queueCheck', (data) => {
          addActivity('info', `Checking ${data.type} queue for ${data.env}...`, data)
        })
        
        wsService.on('queueEmpty', (data) => {
          addActivity('info', `No items in ${data.type} queue for ${data.env}`, data)
        })
        
        wsService.on('transferFound', (data) => {
          addActivity(
            'success',
            `Found transfer: ${data.transfer?.templateName || 'Unknown'}`,
            data
          )
        })
        
        // History update handler
        wsService.on('historyUpdate', (data) => {
          set((state) => ({
            ...state,
            transferHistory: data.slice(0, 50) // Keep last 50
          }) as T)
        })
        
        // Log entry handler
        wsService.on('logEntry', (logEntry) => {
          set((state) => {
            const logs = state.logs || []
            const isPaused = state.logsState?.isPaused || false
            
            if (isPaused) {
              return state
            }
            
            const maxBufferSize = state.logsState?.maxBufferSize || 1000
            const newLogs = [...logs, logEntry].slice(-maxBufferSize)
            
            return {
              ...state,
              logs: newLogs
            } as T
          })
        })
      })
    }
    
    return store
  }
}