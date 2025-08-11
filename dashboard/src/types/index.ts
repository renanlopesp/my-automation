export interface QueueStats {
  receive: {
    total: number
    pending: number
    processing: number
    complete: number
    error: number
    initial?: number
  }
  rename: {
    toRename: number
  }
  send: {
    total: number
    pending: number
    processing: number
    complete: number
    error: number
    initial?: number
  }
  lastUpdated?: string
}

export interface SystemState {
  status: 'idle' | 'running' | 'sleeping' | 'error' | 'stopping'
  lastRun: string | null
  nextRun: string | null
  currentTask: string | null
  isRunning: boolean
  errors: ErrorInfo[]
  stats: {
    receives: number
    renames: number
    sends: number
    errors: number
    lastError: ErrorInfo | null
  }
  queues: {
    [env: string]: QueueStats
  }
  activeTransfers: Transfer[]
  transferHistory: Transfer[]
  currentTransfer: Transfer | null
}

export interface ErrorInfo {
  message: string
  stack?: string
  timestamp: string
  task?: string
}

export interface Transfer {
  id: string
  transferId?: string
  type: 'receive' | 'rename' | 'send'
  env: string
  templateName: string
  toUser?: string
  fromUser?: string
  status: string
  progress?: number
  stage?: string
  action?: string
  createdAt?: string
  updatedAt?: string
  completedAt?: string
}

export interface Activity {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: string
  data?: any
}

export interface WebSocketMessage {
  type: string
  data?: any
}

export interface DetailedStats {
  environments: {
    [env: string]: QueueStats
  }
  summary: {
    totalPending: number
    totalProcessing: number
    totalComplete: number
    totalError: number
  }
  timestamp: string
}

export type Environment = 'local' | 'dev' | 'prod'
export type TaskType = 'receive' | 'rename' | 'send'