import { useQuery } from '@tanstack/react-query'
import { Activity, Package, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { api } from '@/services/api'
import { useStore } from '@/store'
import StatsCard from '@/components/StatsCard'
import QueueCard from '@/components/QueueCard'
import ActivityFeed from '@/components/ActivityFeed'
import TransferProgress from '@/components/TransferProgress'

export default function Overview() {
  const { systemState, queues, currentTransfer, selectedEnv } = useStore()

  // Fetch detailed stats
  const { data: detailedStats } = useQuery({
    queryKey: ['stats', 'detailed'],
    queryFn: () => api.getDetailedStats(),
    refetchInterval: 10000,
  })

  // Fetch all queues
  const { data: allQueues } = useQuery({
    queryKey: ['queues', 'all'],
    queryFn: () => api.getAllQueues(),
    refetchInterval: 5000,
  })

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'idle':
        return <Activity className="h-5 w-5 text-gray-500" />
      case 'running':
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />
    }
  }

  const getStatusText = (status: string | undefined) => {
    switch (status) {
      case 'idle':
        return 'System Idle'
      case 'running':
        return 'Processing'
      case 'sleeping':
        return 'Sleeping'
      case 'error':
        return 'Error State'
      default:
        return 'Unknown'
    }
  }

  // Filter queues based on selected environment
  const filteredQueues = selectedEnv === 'all' 
    ? allQueues || queues 
    : { [selectedEnv]: (allQueues || queues)[selectedEnv] }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Overview</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor your automation system in real-time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(systemState?.status)}
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
            {getStatusText(systemState?.status)}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      {detailedStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Pending"
            value={detailedStats.summary.totalPending}
            icon={<Package className="h-5 w-5" />}
            color="blue"
          />
          <StatsCard
            title="Processing"
            value={detailedStats.summary.totalProcessing}
            icon={<RefreshCw className="h-5 w-5" />}
            color="yellow"
          />
          <StatsCard
            title="Completed"
            value={detailedStats.summary.totalComplete}
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
          />
          <StatsCard
            title="Errors"
            value={detailedStats.summary.totalError}
            icon={<AlertCircle className="h-5 w-5" />}
            color="red"
          />
        </div>
      )}

      {/* Current Transfer */}
      {currentTransfer && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Active Transfer
          </h2>
          <TransferProgress transfer={currentTransfer} />
        </div>
      )}

      {/* Queue Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(filteredQueues).map(([env, stats]) => (
          <div key={env} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {env} Environment
            </h3>
            <div className="space-y-3">
              <QueueCard
                type="receive"
                stats={stats?.receive || { total: 0, pending: 0, processing: 0, complete: 0, error: 0 }}
                env={env}
              />
              <QueueCard
                type="rename"
                stats={{ toRename: stats?.rename?.toRename || 0 }}
                env={env}
              />
              <QueueCard
                type="send"
                stats={stats?.send || { total: 0, pending: 0, processing: 0, complete: 0, error: 0 }}
                env={env}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        <ActivityFeed />
      </div>
    </div>
  )
}