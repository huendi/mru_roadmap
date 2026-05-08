'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, updateUserStatus, onAuthStateChange } from '@/lib/auth'
import { User } from '@/types'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (date: any): string => {
  if (!date) return 'N/A'
  let d: Date
  if (typeof date === 'string') d = new Date(date)
  else if (date?.toDate) d = date.toDate()
  else d = date as Date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserPendingPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [currentAdmin, setCurrentAdmin] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rejectConfirmUid, setRejectConfirmUid] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [polling, setPolling] = useState(false)

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setPolling(silent)
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      setLastUpdated(new Date())

      const pending = allUsers.filter((u) => u.status === 'pending').length
      // @ts-ignore
      if (window.__setAdminPendingCount) window.__setAdminPendingCount(pending)
      // Also update the new approval counts system
      // @ts-ignore
      if (window.__setApprovalCounts) {
        // Get current counts to preserve other values
        // @ts-ignore
        const currentCounts = window.__getCurrentApprovalCounts?.() || { userPending: 0, level2Cert: 0, level5Exam: 0 }
        // @ts-ignore
        window.__setApprovalCounts({
          ...currentCounts,
          userPending: pending
        })
      }
    } catch (e: any) {
      if (!silent) setError('Failed to load users: ' + e.message)
    } finally {
      setLoading(false)
      setPolling(false)
    }
  }, [])

  // Track current admin
  useEffect(() => {
    const unsub = onAuthStateChange((userData) => {
      if (userData && userData.role === 'admin') {
        setCurrentAdmin(userData)
      }
    })
    return unsub
  }, [])

  // Initial load + realtime updates
  useEffect(() => {
    loadUsers(false)
    const unsubscribe = onSnapshot(collection(db, 'users'), () => {
      loadUsers(true)
    })
    return () => {
      unsubscribe()
    }
  }, [loadUsers])

  // ── Account status (Level 1 approval) ────────────────────────────────────
  const handleStatusChange = async (uid: string, newStatus: any) => {
    try {
      await updateUserStatus(uid, newStatus, currentAdmin?.email || currentAdmin?.displayName)
      const updated = users.map((u) => (u.uid === uid ? { ...u, status: newStatus } : u))
      setUsers(updated)
      setSuccess(`User ${newStatus} successfully`)
      setTimeout(() => setSuccess(''), 3000)
      const pending = updated.filter((u) => u.status === 'pending').length
      // @ts-ignore
      if (window.__setAdminPendingCount) window.__setAdminPendingCount(pending)
      // Also update the new approval counts system
      // @ts-ignore
      if (window.__setApprovalCounts) {
        // Get current counts to preserve other values
        // @ts-ignore
        const currentCounts = window.__getCurrentApprovalCounts?.() || { userPending: 0, level2Cert: 0, level5Exam: 0 }
        // @ts-ignore
        window.__setApprovalCounts({
          ...currentCounts,
          userPending: pending
        })
      }
    } catch (e: any) {
      setError('Failed: ' + e.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  // ── Derived lists ─────────────────────────────────────────────────────────
  const pendingUsers = users.filter((u) => u.status === 'pending')
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

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Pending Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve new user account requests</p>
          <div className="mt-2 flex items-center gap-3">
            {lastUpdated && (
              <p className="text-xs text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            {polling && <p className="text-xs text-green-600">Syncing...</p>}
            <button
              onClick={() => loadUsers(false)}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error   && <div className="mb-4 bg-red-50   border border-red-200   text-red-700   px-4 py-3 rounded-lg text-sm flex-shrink-0">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex-shrink-0">{success}</div>}

        {/* Pending Users Table */}
        <div className="bg-white rounded-xl shadow-lg border border-black-200 overflow-hidden flex flex-col h-full">

          {/* Header */}
          <div className="px-5 py-4 bg-yellow-50 border-b border-yellow-200 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-bold text-black-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block" />
              Pending Account Approvals
            </h2>
            <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingUsers.length}
            </span>
          </div>

          {/* Column headers */}
          {pendingUsers.length > 0 && (
            <div className="grid grid-cols-[32px_1fr_auto] sm:grid-cols-[32px_2fr_1.5fr_1fr_auto] gap-2 px-5 py-2.5 bg-black-50 border-b border-black-100 flex-shrink-0">
              <p className="text-xs font-semibold text-black-400 uppercase tracking-wider text-left">#</p>
              <p className="text-xs font-semibold text-black-400 uppercase tracking-wider text-left">Name</p>
              <p className="text-xs font-semibold text-black-400 uppercase tracking-wider hidden sm:block text-left">Email</p>
              <p className="text-xs font-semibold text-black-400 uppercase tracking-wider hidden sm:block text-left">Joined</p>
              <p className="text-xs font-semibold text-black-400 uppercase tracking-wider text-left">Action</p>
            </div>
          )}

          {/* Rows */}
          <div className="overflow-y-auto flex-1">
            {pendingUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-black-400">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-sm font-medium">No pending approvals</p>
                <p className="text-xs mt-1">All users have been reviewed</p>
              </div>
            ) : (
              pendingUsers.map((u, idx) => (
                <div
                  key={u.uid}
                  className="grid grid-cols-[32px_1fr_auto] sm:grid-cols-[32px_2fr_1.5fr_1fr_auto] gap-2 items-center px-5 py-3 hover:bg-yellow-50/40 transition-colors border-b border-black-100 last:border-b-0"
                >
                  <p className="text-xs font-semibold text-black-400 text-left">{idx + 1}</p>

                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold text-black-900 truncate">
                      {u.lastName || '—'}
                      {u.firstName ? `, ${u.firstName}` : ''}
                      {u.middleName ? ` ${u.middleName}` : ''}
                    </p>
                    <p className="text-xs text-black-400 truncate sm:hidden">{u.email}</p>
                  </div>

                  <div className="hidden sm:block min-w-0 text-left">
                    <p className="text-xs text-black-500 truncate">{u.email}</p>
                  </div>

                  <div className="hidden sm:block text-left">
                    <p className="text-xs text-black-400 whitespace-nowrap">{formatDate(u.createdAt)}</p>
                  </div>

                  {/* ── Action buttons: Approved / Rejected ── */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleStatusChange(u.uid, 'active')}
                      title="Approve this user"
                      className="py-1.5 px-3 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      Approved
                    </button>
                    <button
                      onClick={() => setRejectConfirmUid(u.uid)}
                      title="Reject this user"
                      className="py-1.5 px-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      Rejected
                    </button>
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
