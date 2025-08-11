import type { SystemState, QueueStats, Transfer, DetailedStats, Environment, TaskType } from '@/types'

const API_BASE = '/api'

class ApiService {
  private async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // System Status
  async getStatus(): Promise<SystemState> {
    return this.fetchJson<SystemState>(`${API_BASE}/status`)
  }

  async getHealth(): Promise<{
    status: string
    uptime: number
    timestamp: string
    stats: SystemState['stats']
    currentTask: string | null
  }> {
    return this.fetchJson(`${API_BASE}/health`)
  }

  // Queue Management
  async getQueueStats(env: Environment): Promise<QueueStats> {
    return this.fetchJson<QueueStats>(`${API_BASE}/queue/${env}`)
  }

  async getAllQueues(): Promise<{ [env: string]: QueueStats }> {
    return this.fetchJson(`${API_BASE}/queues`)
  }

  // Transfer Management
  async getActiveTransfers(env: Environment): Promise<{ env: string; transfers: Transfer[] }> {
    return this.fetchJson(`${API_BASE}/transfers/${env}`)
  }

  async getTransferHistory(env: Environment, limit = 20): Promise<{ env: string; history: Transfer[] }> {
    return this.fetchJson(`${API_BASE}/history/${env}?limit=${limit}`)
  }

  // Statistics
  async getDetailedStats(): Promise<DetailedStats> {
    return this.fetchJson<DetailedStats>(`${API_BASE}/stats/detailed`)
  }

  // Logs
  async getLogs(lines = 100): Promise<{ logs: any[] }> {
    return this.fetchJson(`${API_BASE}/logs?lines=${lines}`)
  }

  // Errors
  async getErrors(): Promise<{ errors: any[] }> {
    return this.fetchJson(`${API_BASE}/errors`)
  }

  async clearErrors(): Promise<{ message: string }> {
    return this.fetchJson(`${API_BASE}/errors`, { method: 'DELETE' })
  }

  // Task Triggers
  async triggerTask(task: TaskType, env: Environment = 'local'): Promise<{ message: string }> {
    return this.fetchJson(`${API_BASE}/trigger/${task}`, {
      method: 'POST',
      body: JSON.stringify({ env }),
    })
  }

  // Trigger specific tasks
  async triggerReceive(): Promise<{ message: string }> {
    return this.triggerTask('receive')
  }

  async triggerRename(env: Environment = 'local'): Promise<{ message: string }> {
    return this.triggerTask('rename', env)
  }

  async triggerSend(env: Environment = 'local'): Promise<{ message: string }> {
    return this.triggerTask('send', env)
  }
}

export const api = new ApiService()