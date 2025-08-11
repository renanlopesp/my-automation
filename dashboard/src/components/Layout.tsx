import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Package,
  RefreshCw,
  FileText,
  Settings,
  Menu,
  X,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useStore } from '@/store'
import { clsx } from 'clsx'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Overview', href: '/overview', icon: Home },
  { name: 'Queues', href: '/queues', icon: Package },
  { name: 'Transfers', href: '/transfers', icon: RefreshCw },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen, isConnected, systemState } = useStore()

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'idle':
        return 'bg-gray-500'
      case 'running':
        return 'bg-yellow-500'
      case 'sleeping':
        return 'bg-blue-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-primary-600" />
              <span className="text-[1rem] font-medium text-gray-900 dark:text-white">
                Templace Automation
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map(item => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                  )}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400',
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Status */}
          <div className="border-t dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {systemState && (
                <div className="flex items-center space-x-2">
                  <div
                    className={clsx(
                      'h-2 w-2 rounded-full animate-pulse',
                      getStatusColor(systemState.status),
                    )}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {systemState.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 flex items-center justify-end space-x-4">
              {/* Environment selector */}
              <EnvironmentSelector />

              {/* Stats */}
              {systemState && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Receives:</span>
                    <span className="font-semibold">
                      {systemState.stats.receives}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Renames:</span>
                    <span className="font-semibold">
                      {systemState.stats.renames}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Sends:</span>
                    <span className="font-semibold">
                      {systemState.stats.sends}
                    </span>
                  </div>
                  {systemState.stats.errors > 0 && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <span className="text-gray-500">Errors:</span>
                      <span className="font-semibold">
                        {systemState.stats.errors}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

function EnvironmentSelector() {
  const { selectedEnv, setSelectedEnv } = useStore()
  const environments = ['all', 'local', 'dev', 'prod'] as const

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      {environments.map(env => (
        <button
          key={env}
          onClick={() => setSelectedEnv(env as any)}
          className={clsx(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
            selectedEnv === env
              ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          )}
        >
          {env}
        </button>
      ))}
    </div>
  )
}
