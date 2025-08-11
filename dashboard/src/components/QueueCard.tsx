import { Package, Edit, Send } from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '@/services/api'
import { useStore } from '@/store'

interface QueueCardProps {
  type: 'receive' | 'rename' | 'send'
  stats: any
  env: string
}

export default function QueueCard({ type, stats, env }: QueueCardProps) {
  const addActivity = useStore((state) => state.addActivity)

  const getIcon = () => {
    switch (type) {
      case 'receive':
        return <Package className="h-5 w-5" />
      case 'rename':
        return <Edit className="h-5 w-5" />
      case 'send':
        return <Send className="h-5 w-5" />
    }
  }

  const getColor = () => {
    switch (type) {
      case 'receive':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'rename':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'send':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20'
    }
  }

  const getTotal = () => {
    if (type === 'rename') {
      return stats.toRename || 0
    }
    return stats.total || stats.pending + stats.processing + stats.complete + stats.error || 0
  }

  const handleTrigger = async () => {
    try {
      const result = await api.triggerTask(type, env as any)
      addActivity({ type: 'success', message: result.message })
    } catch (error: any) {
      addActivity({ type: 'error', message: error.message })
    }
  }

  return (
    <div className={clsx('border-l-4 rounded-lg p-4 bg-white dark:bg-gray-800', getColor())}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className="font-semibold text-gray-900 dark:text-white capitalize">{type}</span>
        </div>
        <button
          onClick={handleTrigger}
          className="text-xs px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          Trigger
        </button>
      </div>
      
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {getTotal()}
      </div>
      
      {type !== 'rename' && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {stats.pending > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Pending:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{stats.pending}</span>
            </div>
          )}
          {stats.processing > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Processing:</span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">{stats.processing}</span>
            </div>
          )}
          {stats.complete > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Complete:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{stats.complete}</span>
            </div>
          )}
          {stats.error > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Error:</span>
              <span className="font-medium text-red-600 dark:text-red-400">{stats.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}