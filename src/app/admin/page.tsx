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

const REJECTION_REASONS = [
  'Wrong certificate (not Sun Life)',
  "Name on certificate doesn't match profile",
  'Certificate appears edited or tampered',
  'Incomplete certificate (cut off or missing details)',
  'Certificate is blurry or unreadable',
]

// ── Certificate Review Modal ──────────────────────────────────────────────────
interface CertModalProps {
  user: User & { certDoc?: any }
  onClose: () => void
  onApprove: (uid: string) => Promise<void>
  onReject: (uid: string, reason: string) => Promise<void>
}

function CertReviewModal({ user, onClose, onApprove, onReject }: CertModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

  const certUrl = user.certDoc?.url || ''
  const isPdf =
    certUrl.toLowerCase().includes('.pdf') ||
    (user.certDoc?.fileName || '').toLowerCase().endsWith('.pdf')

  const handleApprove = async () => {
    setAction('approve')
    setLoading(true)
    await onApprove(user.uid)
    setLoading(false)
    onClose()
  }

  const handleReject = async () => {
    if (!selectedReason) return
    setAction('reject')
    setLoading(true)
    await onReject(user.uid, selectedReason)
    setLoading(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
              Level 2 · Certificate Review
            </p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {user.lastName}
              {user.firstName ? `, ${user.firstName}` : ''}
              {user.middleName ? ` ${user.middleName}` : ''}
            </p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Certificate preview */}
        <div className="flex-1 overflow-y-auto">
          <div
            className="bg-gray-50 border-b border-gray-100 flex items-center justify-center"
            style={{ minHeight: 280 }}
          >
            {!certUrl ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-2">📄</p>
                <p className="text-sm text-gray-400">No certificate file found</p>
              </div>
            ) : isPdf ? (
              <div className="w-full h-80">
                <iframe src={certUrl} className="w-full h-full" title="Certificate PDF" />
              </div>
            ) : (
              <img
                src={certUrl}
                alt="Certificate"
                className="max-w-full max-h-80 object-contain p-4"
              />
            )}
          </div>

          {certUrl && (
            <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-mono truncate flex-1 mr-3">
                {user.certDoc?.fileName || 'certificate'}
              </span>
              <a
                href={certUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Open full view
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-5">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold rounded-xl transition-colors text-sm mb-4"
            >
              {loading && action === 'approve' ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Approving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve Certificate
                </>
              )}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or reject with reason</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-2 mb-4">
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason === selectedReason ? '' : reason)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    selectedReason === reason
                      ? 'border-red-400 bg-red-50 text-red-800 font-semibold'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        selectedReason === reason ? 'border-red-500 bg-red-500' : 'border-gray-300'
                      }`}
                    >
                      {selectedReason === reason && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <circle cx="6" cy="6" r="3" />
                        </svg>
                      )}
                    </span>
                    {reason}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleReject}
              disabled={!selectedReason || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-colors text-sm"
            >
              {loading && action === 'reject' ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Rejecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {selectedReason ? 'Reject Certificate' : 'Select a reason to reject'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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
  const [usersWithCerts, setUsersWithCerts] = useState<(User & { certDoc?: any })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [certModalUser, setCertModalUser] = useState<(User & { certDoc?: any }) | null>(null)
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

      const withCerts = await Promise.all(
        allUsers.map(async (u) => {
          try {
            const res = await fetch(`/api/user/documents?uid=${u.uid}`)
            if (!res.ok) return u
            const docs = await res.json()
            const certDoc = docs.find((d: any) => d.level === 2 && d.type === 'certificate')
            return { ...u, certDoc }
          } catch {
            return u
          }
        })
      )
      setUsersWithCerts(withCerts)
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

  // ── Level 2 cert approval ─────────────────────────────────────────────────
  const handleCertApprove = async (uid: string) => {
    try {
      const getRes = await fetch(`/api/user/documents?uid=${uid}`)
      const allDocs: any[] = getRes.ok ? await getRes.json() : []
      const updatedDocs = allDocs.map((d: any) =>
        d.level === 2 && d.type === 'certificate'
          ? { ...d, status: 'approved', approvedAt: new Date().toISOString() }
          : d
      )
      await fetch('/api/user/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, documents: updatedDocs }),
      })
      setUsersWithCerts((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, certDoc: { ...u.certDoc, status: 'approved' } } : u
        )
      )
      setSuccess('Certificate approved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError('Failed to approve: ' + e.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleCertReject = async (uid: string, reason: string) => {
    try {
      const getRes = await fetch(`/api/user/documents?uid=${uid}`)
      const allDocs: any[] = getRes.ok ? await getRes.json() : []
      const updatedDocs = allDocs.map((d: any) =>
        d.level === 2 && d.type === 'certificate'
          ? { ...d, status: 'rejected', rejectionReason: reason, rejectedAt: new Date().toISOString() }
          : d
      )
      await fetch('/api/user/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, documents: updatedDocs }),
      })
      setUsersWithCerts((prev) =>
        prev.map((u) =>
          u.uid === uid
            ? { ...u, certDoc: { ...u.certDoc, status: 'rejected', rejectionReason: reason } }
            : u
        )
      )
      setSuccess('Certificate rejected and user notified.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError('Failed to reject: ' + e.message)
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
  const pendingCertUsers = usersWithCerts.filter(
    (u) =>
      u.certDoc?.status === 'pending' &&
      u.certDoc?.type === 'certificate' &&
      u.certDoc?.level === 2
  )

  const rejectConfirmUser = rejectConfirmUid
    ? users.find((u) => u.uid === rejectConfirmUid) ?? null
    : null

  return (
    <div className="h-screen overflow-hidden bg-black-100">

      {/* Certificate review modal */}
      {certModalUser && (
        <CertReviewModal
          user={certModalUser}
          onClose={() => setCertModalUser(null)}
          onApprove={handleCertApprove}
          onReject={handleCertReject}
        />
      )}

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

            {/* ── Level 2 Certificate Approvals ── */}
            <div className="bg-white rounded-xl shadow-lg border border-black-200 overflow-hidden flex-shrink-0">
              <div className="px-5 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
                  Level 2 Certificates
                </h3>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    pendingCertUsers.length > 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {pendingCertUsers.length}
                </span>
              </div>

              {loading ? (
                <div className="py-10 flex items-center justify-center">
                  <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : pendingCertUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="text-sm font-medium">No pending certificates</p>
                  <p className="text-xs mt-1">All submissions have been reviewed</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingCertUsers.map((u, idx) => (
                    <div
                      key={u.uid}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50/40 transition-colors"
                    >
                      <p className="text-xs font-semibold text-gray-400 w-5 flex-shrink-0">{idx + 1}</p>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {u.lastName}
                          {u.firstName ? `, ${u.firstName}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <div className="hidden sm:block flex-shrink-0">
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {u.certDoc?.uploadedAt ? formatDate(u.certDoc.uploadedAt) : '—'}
                        </p>
                      </div>
                      <button
                        onClick={() => setCertModalUser(u)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>{/* end left */}

          {/* ══ RIGHT 60% — Pending Account Approvals ══ */}
          <div className="w-full lg:w-[60%] flex flex-col min-h-0 flex-1">
            <div className="bg-white rounded-xl shadow-lg border border-black-200 overflow-hidden flex flex-col h-full">

              {/* Header */}
              <div className="px-5 py-4 bg-yellow-50 border-b border-yellow-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-bold text-black-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block" />
                  Pending Approvals
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
          </div>

        </div>
      </main>
    </div>
  )
}