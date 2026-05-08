'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, updateUserStatus } from '@/lib/auth'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (date: any): string => {
  if (!date) return 'N/A'
  let d: Date
  if (typeof date === 'string') d = new Date(date)
  else if (date?.toDate) d = date.toDate()
  else d = date as Date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Calculate weekly registrations for the past 4 weeks
const getWeeklyRegistrations = (users: User[]) => {
  const weeks = []
  const today = new Date()
  
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - (i * 7) - (today.getDay() === 0 ? 6 : today.getDay() - 1))
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    
    const weekUsers = users.filter(user => {
      let createdAt: Date
      if (typeof user.createdAt === 'string') {
        createdAt = new Date(user.createdAt)
      } else if ('toDate' in user.createdAt && typeof user.createdAt.toDate === 'function') {
        createdAt = user.createdAt.toDate()
      } else {
        createdAt = user.createdAt as Date
      }
      
      return createdAt >= weekStart && createdAt <= weekEnd
    })
    
    weeks.push({
      dateFrom: weekStart,
      dateTo: weekEnd,
      count: weekUsers.length
    })
  }
  
  return weeks
}


// ── Reject Confirmation Modal ─────────────────────────────────────────────────
interface RejectConfirmModalProps {
  user: User
  onConfirm: () => void
  onCancel: () => void
}

function RejectConfirmModal({ user, onConfirm, onCancel }: RejectConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Reject user?</p>
            <p className="text-xs text-gray-400">
              {user.lastName}
              {user.firstName ? `, ${user.firstName}` : ''}
              {user.middleName ? ` ${user.middleName}` : ''}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          Are you sure you want to reject this account? This user will not be able to access the
          platform.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
          >
            Yes, reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Realtime indicator dot ────────────────────────────────────────────────────
function LiveDot({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex items-center">
      <span
        className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`}
      />
      {active && (
        <span className="absolute inline-flex w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
      )}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const POLL_INTERVAL = 10_000 // 10 seconds

export default function AdminOverviewPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rejectConfirmUid, setRejectConfirmUid] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [polling, setPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setPolling(true)
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      setLastUpdated(new Date())

      const pending = allUsers.filter((u) => u.status === 'pending').length
      // @ts-ignore
      if (window.__setAdminPendingCount) window.__setAdminPendingCount(pending)
    } catch (e: any) {
      if (!silent) setError('Failed to load users: ' + e.message)
    } finally {
      setLoading(false)
      setPolling(false)
    }
  }, [])

  // Initial load + polling
  useEffect(() => {
    loadUsers(false)
    intervalRef.current = setInterval(() => loadUsers(true), POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadUsers])

  // ── Account status (Level 1 approval) ────────────────────────────────────
  const handleStatusChange = async (uid: string, newStatus: any) => {
    try {
      await updateUserStatus(uid, newStatus)
      const updated = users.map((u) => (u.uid === uid ? { ...u, status: newStatus } : u))
      setUsers(updated)
      setSuccess(`User ${newStatus} successfully`)
      setTimeout(() => setSuccess(''), 3000)
      const pending = updated.filter((u) => u.status === 'pending').length
      // @ts-ignore
      if (window.__setAdminPendingCount) window.__setAdminPendingCount(pending)
    } catch (e: any) {
      setError('Failed: ' + e.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  
  // ── Derived lists ─────────────────────────────────────────────────────────
  const nonAdminUsers    = users.filter((u) => u.role !== 'admin')
  const adminUsers       = users.filter((u) => u.role === 'admin')
  const pendingUsers     = users.filter((u) => u.status === 'pending')
  const activeUsers      = users.filter((u) => u.status === 'active')
  const activeAdmins     = activeUsers.filter((u) => u.role === 'admin')
  const activeRegular    = activeUsers.filter((u) => u.role !== 'admin')

  const rejectConfirmUser = rejectConfirmUid
    ? users.find((u) => u.uid === rejectConfirmUid) ?? null
    : null

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black-100">

      {/* Reject confirmation modal */}
      {rejectConfirmUser && (
        <RejectConfirmModal
          user={rejectConfirmUser}
          onConfirm={() => {
            handleStatusChange(rejectConfirmUser.uid, 'rejected')
            setRejectConfirmUid(null)
          }}
          onCancel={() => setRejectConfirmUid(null)}
        />
      )}

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 h-full flex flex-col">

        {/* Alerts */}
        {error   && <div className="mb-4 bg-red-50   border border-red-200   text-red-700   px-4 py-3 rounded-lg text-sm flex-shrink-0">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex-shrink-0">{success}</div>}

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 min-h-0">

          {/* ══ LEFT 40% ══ */}
          <div className="w-full lg:w-[40%] flex flex-col gap-4 sm:gap-6 flex-shrink-0 overflow-y-auto">

            {/* Welcome card */}
            <div className="bg-blue-900 rounded-xl p-4 sm:p-6 text-white flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold mb-1">Admin Dashboard</h2>
              <p className="text-blue-200 text-xs sm:text-sm">
                Manage users and monitor platform activity.
              </p>
            </div>

            {/* Stats grid */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-black-200 flex-shrink-0">
              <h3 className="text-sm font-bold text-black-900 mb-3">Overview</h3>
              <div className="grid grid-cols-2 gap-3">

                {/* Total Users */}
                <div className="bg-white rounded-xl p-4 text-center border-2 border-yellow-600">
                  <p className="text-3xl font-bold text-blue-900">{users.length}</p>
                  <p className="text-xs text-black-500 font-medium mt-1">Total Users</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      {adminUsers.length} admin{adminUsers.length !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      {nonAdminUsers.length} user{nonAdminUsers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Active */}
                <div className="bg-white rounded-xl p-4 text-center border-2 border-yellow-600">
                  <p className="text-3xl font-bold text-green-600">{activeUsers.length}</p>
                  <p className="text-xs text-black-500 font-medium mt-1">Active</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      {activeAdmins.length} admin{activeAdmins.length !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      {activeRegular.length} user{activeRegular.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Weekly Registrations */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-black-200 flex-shrink-0">
              <h3 className="text-sm font-bold text-black-900 mb-3">Weekly Registrations</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-black-400 uppercase tracking-wider pb-2 border-b border-black-100">
                  <p>Date Range</p>
                  <p className="text-right">Users Registered</p>
                </div>
                {getWeeklyRegistrations(users).map((week, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-black-600">
                      {formatDate(week.dateFrom)} - {formatDate(week.dateTo)}
                    </p>
                    <p className="text-black-900 font-semibold text-right">{week.count}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
          {/* ══ RIGHT 60% — Users Status ══ */}
          <div className="w-full lg:w-[60%] flex flex-col min-h-0 flex-1">
            <div className="bg-white rounded-xl shadow-lg border border-black-200 overflow-hidden flex flex-col h-full">
              {/* Header */}
              <div className="px-5 py-4 bg-green-50 border-b border-green-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-bold text-black-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Users Status
                </h2>
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {nonAdminUsers.length}
                </span>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[32px_1fr_auto] sm:grid-cols-[32px_2fr_1fr_auto] gap-2 px-5 py-2.5 bg-black-50 border-b border-black-100 flex-shrink-0">
                <p className="text-xs font-semibold text-black-400 uppercase tracking-wider text-left">#</p>
                <p className="text-xs font-semibold text-black-400 uppercase tracking-wider text-left">Name</p>
                <p className="text-xs font-semibold text-black-400 uppercase tracking-wider hidden sm:block text-left">Email</p>
                <p className="text-xs font-semibold text-black-400 uppercase tracking-wider text-left">Level</p>
              </div>

              {/* Rows - Users sorted by highest level */}
              <div className="overflow-y-auto flex-1">
                {nonAdminUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-black-400">
                    <p className="text-4xl mb-3">👥</p>
                    <p className="text-sm font-medium">No users found</p>
                    <p className="text-xs mt-1">Start by adding users to the platform</p>
                  </div>
                ) : (
                  nonAdminUsers
                    .sort((a, b) => (b.currentLevel || 0) - (a.currentLevel || 0))
                    .map((u, idx) => (
                    <div
                      key={u.uid}
                      className="grid grid-cols-[32px_1fr_auto] sm:grid-cols-[32px_2fr_1fr_auto] gap-2 items-center px-5 py-3 hover:bg-green-50/40 transition-colors border-b border-black-100 last:border-b-0"
                    >
                      <p className="text-xs font-semibold text-black-400 text-left">{idx + 1}</p>

                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-black-900 truncate">
                          {u.lastName || '—'}
                          {u.firstName ? `, ${u.firstName}` : ''}
                          {u.advisorType && (
                            <span className="ml-1 text-xs font-normal text-gray-500">
                              ({u.advisorType === 'returnee' ? 'Returnee' : 'New'})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-black-400 truncate sm:hidden">{u.email}</p>
                      </div>

                      <div className="hidden sm:block min-w-0 text-left">
                        <p className="text-xs text-black-500 truncate">{u.email}</p>
                      </div>

                      <div className="text-left">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          u.currentLevel === 7 ? 'bg-purple-100 text-purple-800' :
                          u.currentLevel === 6 ? 'bg-indigo-100 text-indigo-800' :
                          u.currentLevel === 5 ? 'bg-blue-100 text-blue-800' :
                          u.currentLevel === 4 ? 'bg-green-100 text-green-800' :
                          u.currentLevel === 3 ? 'bg-yellow-100 text-yellow-800' :
                          u.currentLevel === 2 ? 'bg-orange-100 text-orange-800' :
                          u.currentLevel === 1 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          Level {u.currentLevel || 0}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}