'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllUsers } from '@/lib/auth'
import { getAdminLogs } from '@/lib/admin-logs'
import { User, AdminLog } from '@/types'


// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDateTime = (date: any): string => {
  if (!date) return 'N/A'
  let d: Date
  if (typeof date === 'string') d = new Date(date)
  else if (date?.toDate) d = date.toDate()
  else d = date as Date
  return d.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

const formatTime = (date: any): string => {
  if (!date) return 'N/A'
  let d: Date
  if (typeof date === 'string') d = new Date(date)
  else if (date?.toDate) d = date.toDate()
  else d = date as Date
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const getActionStyle = (action: string): string => {
  switch (action?.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'passed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'deleted':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'disabled':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'enabled':
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case 'approved':
      return (
        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    case 'rejected':
      return (
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    case 'passed':
      return (
        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    case 'failed':
      return (
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    case 'deleted':
      return (
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      )
    case 'disabled':
      return (
        <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
      )
    case 'enabled':
    case 'active':
      return (
        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const POLL_INTERVAL = 30_000 // 30 seconds

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [polling, setPolling] = useState(false)

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setPolling(true)
    try {
      const logsData = await getAdminLogs(50, 0)
      setLogs(logsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
      setLastUpdated(new Date())
    } catch (e: any) {
      if (!silent) setError('Failed to load logs: ' + e.message)
    } finally {
      setLoading(false)
      setPolling(false)
    }
  }, [])

  // Initial load + polling
  useEffect(() => {
    loadLogs(false)
    const interval = setInterval(() => loadLogs(true), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [loadLogs])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black-100">

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 h-full flex flex-col">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Track all administrative actions and changes</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex-shrink-0">
            {error}
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-lg border border-black-200 overflow-hidden flex flex-col h-full">

          {/* Header */}
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Recent Activity
            </h2>
            <span className="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {logs.length}
            </span>
          </div>

          {/* Column headers */}
          {logs.length > 0 && (
            <div className="grid grid-cols-[2fr_1.5fr_1fr] sm:grid-cols-[1.5fr_1.5fr_1.5fr_1fr_1.5fr] gap-2 px-3 sm:px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">Actor</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left sm:hidden">Target</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left hidden sm:block">Target User</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left hidden sm:block">Activity</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">Action</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left text-right hidden sm:block">Date & Time</p>
            </div>
          )}

          {/* Rows */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <svg className="animate-spin w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p className="text-sm font-medium">No activity logs found</p>
                <p className="text-xs mt-1">Admin actions will appear here</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={log.id}
                  className={`grid grid-cols-[2fr_1.5fr_1fr] sm:grid-cols-[1.5fr_1.5fr_1.5fr_1fr_1.5fr] gap-2 items-center px-3 sm:px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {/* Actor - Admin Name */}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                      {log.actorName}
                    </p>
                    {/* Mobile: Show activity below actor name */}
                    <p className="text-xs text-gray-500 truncate sm:hidden mt-1">
                      {log.activity}
                    </p>
                  </div>

                  {/* Target User */}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-900 truncate">
                      {log.targetUserName}
                    </p>
                    {/* Mobile: Show date/time below target user */}
                    <p className="text-xs text-gray-400 truncate sm:hidden mt-1">
                      {formatDateTime(log.timestamp)}
                    </p>
                  </div>

                  {/* Activity - Desktop only */}
                  <div className="hidden sm:block min-w-0">
                    <p className="text-sm text-gray-600 truncate">
                      {log.activity}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">
                      <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium ${getActionStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </p>
                  </div>

                  {/* Date & Time - Desktop only */}
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </main>
    </div>
  )
}
