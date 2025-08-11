import type { Transfer } from '@/types'
import { clsx } from 'clsx'

interface TransferProgressProps {
  transfer: Transfer
}

export default function TransferProgress({ transfer }: TransferProgressProps) {
  const progress = transfer.progress || 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Transfer ID</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {transfer.transferId || transfer.id}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
            {transfer.type}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Environment</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
            {transfer.env}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Template</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {transfer.templateName}
          </p>
        </div>
      </div>

      {(transfer.toUser || transfer.fromUser) && (
        <div className="grid grid-cols-2 gap-4">
          {transfer.fromUser && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">From User</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {transfer.fromUser}
              </p>
            </div>
          )}
          {transfer.toUser && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">To User</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {transfer.toUser}
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {transfer.stage || 'Processing'}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              'bg-gradient-to-r from-primary-500 to-primary-600',
              progress < 100 && 'animate-pulse'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}