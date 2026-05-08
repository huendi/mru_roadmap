'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, onAuthStateChange } from '@/lib/auth'
import { User, UserWithCertDoc } from '@/types'
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

const REJECTION_REASONS = [
  'Wrong certificate (not Sun Life)',
  "Name on certificate doesn't match profile",
  'Certificate appears edited or tampered',
  'Incomplete certificate (cut off or missing details)',
  'Certificate is blurry or unreadable',
]

// ── Certificate Review Modal ──────────────────────────────────────────────────
interface CertModalProps {
  user: UserWithCertDoc
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Level2CertPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [usersWithCerts, setUsersWithCerts] = useState<UserWithCertDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [certModalUser, setCertModalUser] = useState<UserWithCertDoc | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [polling, setPolling] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<User | null>(null)

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setPolling(true)
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)

      const withCerts: UserWithCertDoc[] = await Promise.all(
        allUsers.map(async (u): Promise<UserWithCertDoc> => {
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

      // Update notification count for level 2 certificates
      const pendingLevel2Count = withCerts.filter(
        (u) => u.certDoc?.status === 'pending' && u.certDoc?.type === 'certificate' && u.certDoc?.level === 2
      ).length
      // @ts-ignore
      if (window.__setApprovalCounts) {
        // Get current counts to preserve other values
        // @ts-ignore
        const currentCounts = window.__getCurrentApprovalCounts?.() || { userPending: 0, level2Cert: 0, level5Exam: 0 }
        // @ts-ignore
        window.__setApprovalCounts({
          ...currentCounts,
          level2Cert: pendingLevel2Count
        })
      }
    } catch (e: any) {
      if (!silent) setError('Failed to load users: ' + e.message)
    } finally {
      setLoading(false)
      setPolling(false)
    }
  }, [])

  // Initial load + realtime updates
  useEffect(() => {
    loadUsers(false)
    const unsubscribeRealtime = onSnapshot(collection(db, 'users'), () => {
      loadUsers(true)
    })
    
    // Track current admin
    const unsub = onAuthStateChange((userData) => {
      if (userData && userData.role === 'admin') {
        setCurrentAdmin(userData)
      }
    })
    
    return () => {
      unsubscribeRealtime()
      unsub()
    }
  }, [loadUsers])

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
      
      // Log the approval action
      const approvedUser = usersWithCerts.find(u => u.uid === uid)
      if (approvedUser && currentAdmin) {
        try {
          const { createAdminLog } = await import('@/lib/admin-logs')
          await createAdminLog(
            currentAdmin.displayName || currentAdmin.email || 'Unknown Admin',
            approvedUser.displayName || approvedUser.email || 'Unknown User',
            'Level 2 Certificate Approval Request',
            'Approved',
            approvedUser.email
          )
        } catch (logError) {
          console.warn('Failed to create admin log for certificate approval:', logError)
        }
      }
      
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
      
      // Log the rejection action
      const rejectedUser = usersWithCerts.find(u => u.uid === uid)
      if (rejectedUser && currentAdmin) {
        try {
          const { createAdminLog } = await import('@/lib/admin-logs')
          await createAdminLog(
            currentAdmin.displayName || currentAdmin.email || 'Unknown Admin',
            rejectedUser.displayName || rejectedUser.email || 'Unknown User',
            'Level 2 Certificate Approval Request',
            `Rejected - ${reason}`,
            rejectedUser.email
          )
        } catch (logError) {
          console.warn('Failed to create admin log for certificate rejection:', logError)
        }
      }
      
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
  const pendingCertUsers = usersWithCerts.filter(
    (u) =>
      u.certDoc?.status === 'pending' &&
      u.certDoc?.type === 'certificate' &&
      u.certDoc?.level === 2
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black-100">

      {/* Certificate review modal */}
      {certModalUser && (
        <CertReviewModal
          user={certModalUser}
          onClose={() => setCertModalUser(null)}
          onApprove={handleCertApprove}
          onReject={handleCertReject}
        />
      )}

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 h-full flex flex-col">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Level 2 Certificate Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve Sun Life training certificates</p>
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

        {/* Level 2 Certificate Approvals */}
        <div className="bg-white rounded-xl shadow-lg border border-black-200 overflow-hidden flex-shrink-0">
          <div className="px-5 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
              Pending Certificates
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

      </main>
    </div>
  )
}
