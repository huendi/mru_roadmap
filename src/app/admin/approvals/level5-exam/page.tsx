'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authenticatedFetch } from '@/lib/api'
import { onAuthStateChange } from '@/lib/auth'
import { User, UserWithExamSubmission } from '@/types'
import { collection, collectionGroup, onSnapshot } from 'firebase/firestore'
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

// ── Level 5 Exam Review Modal ─────────────────────────────────────────────────
interface ExamModalProps {
  user: UserWithExamSubmission
  onClose: () => void
  onApprove: (uid: string, examScore: string) => Promise<void>
  onReject: (uid: string, examScore: string) => Promise<void>
}

function Level5ExamModal({ user, onClose, onApprove, onReject }: ExamModalProps) {
  const [examScore, setExamScore] = useState('')
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

  const handleApprove = async () => {
    const score = parseFloat(examScore)
    if (!examScore || isNaN(score) || score < 0 || score > 100) {
      alert('Please enter a valid exam score between 0 and 100')
      return
    }
    setAction('approve')
    setLoading(true)
    await onApprove(user.uid, examScore)
    setLoading(false)
    onClose()
  }

  const handleReject = async () => {
    const score = parseFloat(examScore)
    if (!examScore || isNaN(score) || score < 0 || score > 100) {
      alert('Please enter a valid exam score between 0 and 100')
      return
    }
    setAction('reject')
    setLoading(true)
    await onReject(user.uid, examScore)
    setLoading(false)
    onClose()
  }

  const examSubmission = user.examSubmission || {}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
              Level 5 · Exam Review
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

        {/* Exam Details */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Exam Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Exam Information</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Exam Type:</p>
                  <p className="font-medium capitalize">{examSubmission.examType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Exam Mode:</p>
                  <p className="font-medium capitalize">
                    {examSubmission.icMode || examSubmission.iiapMode || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Schedule Date:</p>
                  <p className="font-medium">{examSubmission.scheduleDate ? formatDate(examSubmission.scheduleDate) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Submitted:</p>
                  <p className="font-medium">{examSubmission.submittedAt ? formatDate(examSubmission.submittedAt) : 'N/A'}</p>
                </div>
              </div>
              {examSubmission.selectedExams && examSubmission.selectedExams.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-gray-500 text-xs mb-1">Selected Exams:</p>
                  <div className="flex flex-wrap gap-1">
                    {examSubmission.selectedExams.map((exam: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        {exam}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Receipt */}
            {examSubmission.receiptUrl && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment Receipt</h4>
                <div className="flex items-center gap-3">
                  <a
                    href={examSubmission.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    View Receipt
                  </a>
                  <span className="text-xs text-gray-400">
                    {examSubmission.receiptFileName || 'receipt.pdf'}
                  </span>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {examSubmission.adminNotes && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Admin Notes</h4>
                <p className="text-sm text-gray-700">{examSubmission.adminNotes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-5 border-t border-gray-100">
            {/* Exam Score Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Exam Score (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={examScore}
                  onChange={(e) => setExamScore(e.target.value)}
                  placeholder="Enter exam percentage (e.g., 85.5)"
                  className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-lg text-gray-500 font-medium">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Enter the percentage score the user achieved in the licensure exam
              </p>
            </div>

            {/* Action Buttons - One Line */}
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={loading || !examScore}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
              >
                {loading && action === 'approve' ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  'PASSED'
                )}
              </button>

              <div className="flex items-center text-gray-400 font-medium">
                |
              </div>

              <button
                onClick={handleReject}
                disabled={loading || !examScore}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
              >
                {loading && action === 'reject' ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  'FAILED'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Level5ExamPage() {
  const router = useRouter()
  const [usersWithExams, setUsersWithExams] = useState<UserWithExamSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [examModalUser, setExamModalUser] = useState<UserWithExamSubmission | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [polling, setPolling] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<User | null>(null)

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setPolling(true)
    try {
      // Fetch pending exam approvals directly from the admin API
      const res = await authenticatedFetch('/api/admin/level5-exam-approvals?status=pending')
      if (!res.ok) throw new Error('Failed to fetch approvals')
      
      const approvals = await res.json()
      
      // Transform the approval data to match the expected structure
      const withExams = approvals.map((approval: any) => ({
        uid: approval.userId,
        email: approval.userEmail,
        displayName: approval.userName,
        lastName: approval.userName.split(', ')[0] || '',
        firstName: approval.userName.split(', ')[1] || '',
        examSubmission: {
          ...approval,
          status: approval.adminDecision
        }
      }))
      
      setUsersWithExams(withExams)
      setLastUpdated(new Date())

      // Update notification count for level 5 exams
      const pendingLevel5Count = withExams.filter(
        (u: UserWithExamSubmission) => u.examSubmission?.adminDecision === 'pending' || u.examSubmission?.status === 'pending'
      ).length
      // @ts-ignore
      if (window.__setApprovalCounts) {
        // Get current counts to preserve other values
        // @ts-ignore
        const currentCounts = window.__getCurrentApprovalCounts?.() || { userPending: 0, level2Cert: 0, level5Exam: 0 }
        // @ts-ignore
        window.__setApprovalCounts({
          ...currentCounts,
          level5Exam: pendingLevel5Count
        })
      }
    } catch (e: any) {
      if (!silent) setError('Failed to load approvals: ' + e.message)
    } finally {
      setLoading(false)
      setPolling(false)
    }
  }, [])

  // Initial load + realtime updates
  useEffect(() => {
    loadUsers(false)
    const unsubUsers = onSnapshot(collection(db, 'users'), () => {
      loadUsers(true)
    })
    const unsubLevelProgress = onSnapshot(collectionGroup(db, 'levelProgress'), () => {
      loadUsers(true)
    })
    
    // Track current admin
    const unsub = onAuthStateChange((userData) => {
      if (userData && userData.role === 'admin') {
        setCurrentAdmin(userData)
      }
    })
    
    return () => {
      unsubUsers()
      unsubLevelProgress()
      unsub()
    }
  }, [])

  // ── Level 5 exam approval ─────────────────────────────────────────────────
  const handleExamApprove = async (uid: string, examScore: string) => {
    try {
      const res = await authenticatedFetch('/api/admin/level5-exam-approvals', {
        method: 'POST',
        body: JSON.stringify({ uid, status: 'passed', examScore }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      
      // Log the approval action
      const approvedUser = usersWithExams.find(u => u.uid === uid)
      if (approvedUser && currentAdmin) {
        try {
          const { createAdminLog } = await import('@/lib/admin-logs')
          await createAdminLog(
            currentAdmin.displayName || currentAdmin.email || 'Unknown Admin',
            approvedUser.displayName || approvedUser.email || 'Unknown User',
            'Level 5 Exam Approval Request',
            'Approved',
            approvedUser.email
          )
        } catch (logError) {
          console.warn('Failed to create admin log for exam approval:', logError)
        }
      }
      
      // Remove the approved user from the list
      setUsersWithExams((prev) => prev.filter((u) => u.uid !== uid))
      setSuccess('Exam approved successfully! User marked as passed and can proceed to Level 6.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError('Failed to approve: ' + e.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleExamReject = async (uid: string, examScore: string) => {
    try {
      const res = await authenticatedFetch('/api/admin/level5-exam-approvals', {
        method: 'POST',
        body: JSON.stringify({ uid, status: 'failed', reason: 'Failed exam', examScore }),
      })
      if (!res.ok) throw new Error('Failed to reject')
      
      // Log the rejection action
      const rejectedUser = usersWithExams.find(u => u.uid === uid)
      if (rejectedUser && currentAdmin) {
        try {
          const { createAdminLog } = await import('@/lib/admin-logs')
          await createAdminLog(
            currentAdmin.displayName || currentAdmin.email || 'Unknown Admin',
            rejectedUser.displayName || rejectedUser.email || 'Unknown User',
            'Level 5 Exam Approval Request',
            `Rejected - score ${examScore}%`,
            rejectedUser.email
          )
        } catch (logError) {
          console.warn('Failed to create admin log for exam rejection:', logError)
        }
      }
      
      // Remove the rejected user from the pending list
      setUsersWithExams((prev) => prev.filter((u) => u.uid !== uid))
      setSuccess('Exam rejected. User can now retake the exam.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError('Failed to reject: ' + e.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  // ── Derived lists ─────────────────────────────────────────────────────────
  const pendingExamUsers = usersWithExams.filter(
    (u) => u.examSubmission?.adminDecision === 'pending' || u.examSubmission?.status === 'pending'
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black-100">

      {/* Exam review modal */}
      {examModalUser && (
        <Level5ExamModal
          user={examModalUser}
          onClose={() => setExamModalUser(null)}
          onApprove={handleExamApprove}
          onReject={handleExamReject}
        />
      )}

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 h-full flex flex-col">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Level 5 Exam Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve licensure exam submissions</p>
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

        {/* Level 5 Exam Approvals */}
        <div className="bg-white rounded-xl shadow-lg border border-black-200 overflow-hidden flex-shrink-0">
          <div className="px-5 py-4 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse inline-block" />
              Pending Exam Reviews
            </h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                pendingExamUsers.length > 0 ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {pendingExamUsers.length}
            </span>
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center">
              <svg className="animate-spin w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : pendingExamUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-sm font-medium">No pending exam reviews</p>
              <p className="text-xs mt-1">All exam submissions have been reviewed</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingExamUsers.map((u, idx) => (
                <div
                  key={u.uid}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50/40 transition-colors"
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
                      {u.examSubmission?.examType ? 
                        `${u.examSubmission.examType.toUpperCase()} - ${u.examSubmission.icMode || u.examSubmission.iiapMode || 'N/A'}` 
                        : 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => setExamModalUser(u)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
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
