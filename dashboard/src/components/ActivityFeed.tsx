import { useStore } from '@/store'
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

export default function ActivityFeed() {
  const activities = useStore((state) => state.activities)

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No recent activity
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={clsx(
            'flex items-start space-x-3 p-3 rounded-lg',
            'bg-gray-50 dark:bg-gray-700/50',
            'animate-slide-in'
          )}
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon(activity.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-gray-100">{activity.message}</p>
            {activity.data && activity.data.env && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Environment: {activity.data.env}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}