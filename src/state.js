import EventEmitter from 'events'

class SystemState extends EventEmitter {
  constructor() {
    super()
    this.state = {
      status: 'idle', // idle, running, sleeping, error, stopping
      lastRun: null,
      nextRun: null,
      currentTask: null,
      isRunning: false,
      browser: null,
      errors: [],
      stats: {
        receives: 0,
        renames: 0,
        sends: 0,
        errors: 0,
        lastError: null,
      },
      tasks: {
        receive: {
          status: 'idle',
          lastRun: null,
          duration: null,
          results: null,
        },
        rename: {
          status: 'idle',
          lastRun: null,
          duration: null,
          results: null,
        },
        send: {
          status: 'idle',
          lastRun: null,
          duration: null,
          results: null,
        },
      },
      // New queue tracking
      queues: {
        local: {
          receive: { pending: 0, processing: 0, complete: 0, error: 0 },
          rename: { toRename: 0 },
          send: { pending: 0, processing: 0, complete: 0, error: 0 },
          lastUpdated: null,
        },
        dev: {
          receive: { pending: 0, processing: 0, complete: 0, error: 0 },
          rename: { toRename: 0 },
          send: { pending: 0, processing: 0, complete: 0, error: 0 },
          lastUpdated: null,
        },
        prod: {
          receive: { pending: 0, processing: 0, complete: 0, error: 0 },
          rename: { toRename: 0 },
          send: { pending: 0, processing: 0, complete: 0, error: 0 },
          lastUpdated: null,
        },
      },
      // Active transfers being processed
      activeTransfers: [],
      // Recent transfer history
      transferHistory: [],
      // Current transfer details
      currentTransfer: null,
    }
  }

  updateStatus(status, details = {}) {
    this.state.status = status
    if (details.currentTask) {
      this.state.currentTask = details.currentTask
    }
    this.emit('statusUpdate', { status, details })
  }

  startTask(taskName) {
    this.state.currentTask = taskName
    this.state.tasks[taskName] = {
      ...this.state.tasks[taskName],
      status: 'running',
      lastRun: new Date().toISOString(),
    }
    this.emit('taskStart', taskName)
  }

  endTask(taskName, results = null) {
    if (this.state.tasks[taskName]) {
      const startTime = new Date(this.state.tasks[taskName].lastRun)
      this.state.tasks[taskName] = {
        ...this.state.tasks[taskName],
        status: 'completed',
        duration: Date.now() - startTime.getTime(),
        results,
      }
      this.state.stats[`${taskName}s`]++
    }
    this.state.currentTask = null
    this.emit('taskEnd', { taskName, results })
  }

  addError(error) {
    const errorInfo = {
      message: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      task: this.state.currentTask,
    }

    this.state.errors.push(errorInfo)
    // Keep only last 100 errors
    if (this.state.errors.length > 100) {
      this.state.errors = this.state.errors.slice(-100)
    }

    this.state.stats.errors++
    this.state.stats.lastError = errorInfo
    this.emit('error', errorInfo)
  }

  setNextRun(timestamp) {
    this.state.nextRun = timestamp
    this.emit('nextRunUpdate', timestamp)
  }

  setBrowser(browser) {
    this.state.browser = browser
  }

  getState() {
    return { ...this.state }
  }

  reset() {
    this.state.errors = []
    this.state.stats = {
      receives: 0,
      renames: 0,
      sends: 0,
      errors: 0,
      lastError: null,
    }
    this.emit('reset')
  }

  // New queue management methods
  updateQueue(env, queueData) {
    if (this.state.queues[env] && queueData) {
      this.state.queues[env] = {
        receive: queueData.receive || this.state.queues[env].receive,
        rename: queueData.rename || this.state.queues[env].rename,
        send: queueData.send || this.state.queues[env].send,
        lastUpdated: new Date().toISOString(),
      }
      this.emit('queueUpdate', { env, data: this.state.queues[env] })
    }
  }

  setActiveTransfer(transfer) {
    this.state.currentTransfer = transfer

    // Add to active transfers list if not already there
    const existingIndex = this.state.activeTransfers.findIndex(
      t => t.id === transfer.id
    )

    if (existingIndex >= 0) {
      this.state.activeTransfers[existingIndex] = transfer
    } else {
      this.state.activeTransfers.push(transfer)
    }

    // Keep only last 10 active transfers
    if (this.state.activeTransfers.length > 10) {
      this.state.activeTransfers = this.state.activeTransfers.slice(-10)
    }

    this.emit('transferUpdate', transfer)
  }

  removeActiveTransfer(transferId) {
    this.state.activeTransfers = this.state.activeTransfers.filter(
      t => t.id !== transferId
    )

    if (this.state.currentTransfer?.id === transferId) {
      this.state.currentTransfer = null
    }

    this.emit('transferComplete', { transferId })
  }

  addToHistory(transfer) {
    this.state.transferHistory.unshift({
      ...transfer,
      completedAt: new Date().toISOString(),
    })

    // Keep only last 50 transfers in history
    if (this.state.transferHistory.length > 50) {
      this.state.transferHistory = this.state.transferHistory.slice(0, 50)
    }

    this.emit('historyUpdate', this.state.transferHistory)
  }

  emitTransferProgress(transferId, stage, progress, details = {}) {
    const progressData = {
      transferId,
      stage,
      progress,
      timestamp: new Date().toISOString(),
      ...details,
    }

    // Update current transfer if it matches
    if (this.state.currentTransfer?.id === transferId) {
      this.state.currentTransfer = {
        ...this.state.currentTransfer,
        stage,
        progress,
        lastUpdate: new Date().toISOString(),
      }
    }

    this.emit('transferProgress', progressData)
  }
}

// Singleton instance
export const systemState = new SystemState()
export default systemState