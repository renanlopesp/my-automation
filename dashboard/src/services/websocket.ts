import { EventEmitter } from 'events'
import type { WebSocketMessage } from '@/types'

export type WebSocketEventType = 
  | 'connected'
  | 'disconnected'
  | 'state'
  | 'statusUpdate'
  | 'queueUpdate'
  | 'transferProgress'
  | 'transferUpdate'
  | 'transferComplete'
  | 'taskStart'
  | 'taskEnd'
  | 'error'
  | 'queueCheck'
  | 'queueEmpty'
  | 'marketplaceCheck'
  | 'transferFound'
  | 'historyUpdate'
  | 'logEntry'

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectTimeout: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 3000

  constructor() {
    super()
    this.setMaxListeners(50) // Increase max listeners for multiple components
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host

    try {
      this.ws = new WebSocket(`${protocol}//${host}/ws`)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this.emit('connected')
        this.requestState()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.emit('disconnected')
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      this.scheduleReconnect()
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const { type, data } = message
    
    // Emit the raw message
    this.emit('message', message)
    
    // Emit specific event based on type
    if (type) {
      this.emit(type as WebSocketEventType, data)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000)

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect()
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  requestState(): void {
    this.send({ type: 'getState' })
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }
}

export const wsService = new WebSocketService()