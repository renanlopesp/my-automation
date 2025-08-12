import { readFile, writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from './logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const QUEUE_FILE = `${dirname(__dirname)}/data/taskQueue.json`

class TaskQueue {
  constructor() {
    this.queueFile = QUEUE_FILE
    this.isProcessing = false
    this.initPromise = this.init()
  }

  async init() {
    try {
      // Ensure data directory exists
      await mkdir(dirname(this.queueFile), { recursive: true })
      
      // Initialize queue file if it doesn't exist
      try {
        await readFile(this.queueFile, 'utf-8')
      } catch (err) {
        if (err.code === 'ENOENT') {
          await writeFile(this.queueFile, JSON.stringify({ tasks: [] }, null, 2))
          logger.info('TaskQueue: Initialized empty queue file')
        }
      }
    } catch (err) {
      logger.error('TaskQueue: Failed to initialize:', err)
    }
  }

  async ensureInit() {
    await this.initPromise
  }

  async readQueue() {
    await this.ensureInit()
    try {
      const data = await readFile(this.queueFile, 'utf-8')
      return JSON.parse(data)
    } catch (err) {
      logger.error('TaskQueue: Failed to read queue:', err)
      return { tasks: [] }
    }
  }

  async writeQueue(queue) {
    await this.ensureInit()
    try {
      await writeFile(this.queueFile, JSON.stringify(queue, null, 2))
    } catch (err) {
      logger.error('TaskQueue: Failed to write queue:', err)
    }
  }

  async add(task) {
    await this.ensureInit()
    
    const taskWithMetadata = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: task.type,
      env: task.env || 'local',
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...task
    }

    const queue = await this.readQueue()
    queue.tasks.push(taskWithMetadata)
    await this.writeQueue(queue)
    
    logger.info(`TaskQueue: Added task ${taskWithMetadata.id} (${taskWithMetadata.type})`)
    return taskWithMetadata
  }

  async getNext() {
    await this.ensureInit()
    
    const queue = await this.readQueue()
    const pendingTask = queue.tasks.find(t => t.status === 'pending')
    
    if (pendingTask) {
      // Mark as processing
      pendingTask.status = 'processing'
      pendingTask.startedAt = new Date().toISOString()
      await this.writeQueue(queue)
      
      logger.info(`TaskQueue: Processing task ${pendingTask.id} (${pendingTask.type})`)
      return pendingTask
    }
    
    return null
  }

  async complete(taskId, result = {}) {
    await this.ensureInit()
    
    const queue = await this.readQueue()
    const task = queue.tasks.find(t => t.id === taskId)
    
    if (task) {
      task.status = 'completed'
      task.completedAt = new Date().toISOString()
      task.result = result
      await this.writeQueue(queue)
      
      logger.info(`TaskQueue: Completed task ${taskId}`)
    }
  }

  async fail(taskId, error) {
    await this.ensureInit()
    
    const queue = await this.readQueue()
    const task = queue.tasks.find(t => t.id === taskId)
    
    if (task) {
      task.status = 'failed'
      task.failedAt = new Date().toISOString()
      task.error = error.message || error
      await this.writeQueue(queue)
      
      logger.error(`TaskQueue: Failed task ${taskId}:`, error)
    }
  }

  async hasPendingTasks() {
    await this.ensureInit()
    
    const queue = await this.readQueue()
    return queue.tasks.some(t => t.status === 'pending')
  }

  async getPendingCount() {
    await this.ensureInit()
    
    const queue = await this.readQueue()
    return queue.tasks.filter(t => t.status === 'pending').length
  }

  async cleanup(olderThanHours = 24) {
    await this.ensureInit()
    
    const queue = await this.readQueue()
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    
    const originalCount = queue.tasks.length
    queue.tasks = queue.tasks.filter(task => {
      if (task.status === 'pending' || task.status === 'processing') {
        return true // Keep pending/processing tasks
      }
      
      const taskTime = new Date(task.completedAt || task.failedAt || task.createdAt)
      return taskTime > cutoffTime
    })
    
    const removed = originalCount - queue.tasks.length
    if (removed > 0) {
      await this.writeQueue(queue)
      logger.info(`TaskQueue: Cleaned up ${removed} old tasks`)
    }
    
    return removed
  }

  async getStatus() {
    await this.ensureInit()
    
    const queue = await this.readQueue()
    const status = {
      total: queue.tasks.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
    
    queue.tasks.forEach(task => {
      status[task.status]++
    })
    
    return status
  }

  async clear() {
    await this.ensureInit()
    
    await this.writeQueue({ tasks: [] })
    logger.info('TaskQueue: Cleared all tasks')
  }
}

// Export singleton instance
export const taskQueue = new TaskQueue()