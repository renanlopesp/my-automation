import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useStore } from '@/store'
import { Package, RefreshCw, Send, Edit } from 'lucide-react'
import { clsx } from 'clsx'

export default function Queues() {
  const { selectedEnv } = useStore()

  // Fetch queues based on selected environment
  const { data: queues, isLoading, refetch } = useQuery({
    queryKey: ['queues', selectedEnv],
    queryFn: () => {
      if (selectedEnv === 'all') {
        return api.getAllQueues()
      }
      return api.getQueueStats(selectedEnv as any).then(data => ({ [selectedEnv]: data }))
    },
    refetchInterval: 5000,
  })


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'complete':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Queues</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and monitor queue status across environments
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {queues && Object.entries(queues).map(([env, stats]) => (
            <div key={env} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white capitalize">
                {env} Environment
              </h2>
              
              <div className="space-y-4">
                {/* Receive Queue */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Receive Queue</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.receive.total || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.receive).map(([status, count]) => {
                      if (status === 'total' || count === 0) return null
                      return (
                        <span key={status} className={clsx('px-2 py-1 rounded-full text-xs', getStatusColor(status))}>
                          {status}: {count}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Rename Queue */}
                <div className="border-l-4 border-yellow-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Rename Queue</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.rename.toRename || 0}
                    </span>
                  </div>
                </div>

                {/* Send Queue */}
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Send className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Send Queue</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.send.total || 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.send).map(([status, count]) => {
                      if (status === 'total' || count === 0) return null
                      return (
                        <span key={status} className={clsx('px-2 py-1 rounded-full text-xs', getStatusColor(status))}>
                          {status}: {count}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}