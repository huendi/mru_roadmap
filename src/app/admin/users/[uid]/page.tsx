'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getUserByUid, updateUserStatus, deleteUser, onAuthStateChange } from '@/lib/auth'
import { User } from '@/types'

interface ExamAttempt {
  examId: number
  score: number
  correctAnswers: number
  totalQuestions: number
  passed: boolean
  dateTaken: string
}

interface UserDocument {
  type: string
  fileName?: string
  url: string
  level: number
  status?: 'pending' | 'approved' | 'rejected'
  uploadedAt?: string
  id?: string
  name?: string
}

interface UserDetail {
  documents: UserDocument[]
}

const getFilenameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname
    const decoded = decodeURIComponent(pathname)
    let filename = decoded.split('/').pop() || 'Document'
    filename = filename.replace(/(\.[a-zA-Z0-9]+)\1$/i, '$1')
    return filename
  } catch {
    return 'Document'
  }
}

const formatDate = (date: any): string => {
  if (!date) return 'N/A'
  let d: Date
  if (typeof date === 'string') d = new Date(date)
  else if (date?.toDate) d = date.toDate()
  else d = date as Date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const calculateAge = (birthday?: string): string => {
  if (!birthday) return 'N/A'
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return `${age} yrs`
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Basic Requirements',
  2: 'Sun Life Training Course',
  3: 'Review for IC/IIAP Exam',
  4: 'Mock Exam',
  5: 'Pay & Take Licensure Exam',
  6: 'Submit CA Forms & Requirements',
  7: 'Contract Signing & Coding',
}

const LEVEL1_DOC_LABELS: Record<string, string> = {
  resume:        'Resume or CV',
  birth_cert:    'Birth Certificate (PSA Copy)',
  id_pictures:   '1×1 ID Photo',
  sss:           'SSS',
  tin:           'Tax Identification Number (TIN)',
  nbi_clearance: 'NBI or Police Clearance',
  itr:           'Income Tax Return (ITR)',
}

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  pending:  'bg-yellow-100 text-yellow-700',
  disabled: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-600',
  approved: 'bg-blue-100 text-blue-700',
}

const DOC_STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700 border-yellow-300',
  approved: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-600 border-red-300',
}

type RightTab = 'overview' | 'documents'

export default function UserDetailPage() {
  const { uid } = useParams<{ uid: string }>()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [currentAdmin, setCurrentAdmin] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<RightTab>('overview')
  const [detail, setDetail] = useState<UserDetail>({ documents: [] })
  const [levelProgress, setLevelProgress] = useState<any>(null)
  const [level5Receipt, setLevel5Receipt] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [viewDoc, setViewDoc] = useState<UserDocument | null>(null)

  useEffect(() => {
    if (!uid) return
    getUserByUid(uid)
      .then(u => setUser(u))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [uid])

  useEffect(() => {
    const unsub = onAuthStateChange((userData) => {
      if (userData && userData.role === 'admin') {
        setCurrentAdmin(userData)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!uid) return
    const load = async () => {
      try {
        const [docsRes, progressRes, level5Res] = await Promise.all([
          fetch(`/api/user/documents?uid=${uid}`),
          fetch(`/api/admin/user/level-progress?uid=${uid}`),
          fetch(`/api/admin/user/level5-receipt?uid=${uid}`),
        ])
        const docsData = docsRes.ok ? await docsRes.json() : []
        const progressData = progressRes.ok ? await progressRes.json() : null
        const level5Data = level5Res.ok ? await level5Res.json() : null

        setDetail({
          documents: Array.isArray(docsData) ? docsData : [],
        })
        setLevelProgress(progressData)
        setLevel5Receipt(level5Data)
      } catch { /* silent */ }
      finally { setDetailLoading(false) }
    }
    load()
  }, [uid])

  const handleStatus = async (newStatus: any) => {
    if (!user || !currentAdmin) return
    setActionLoading(true)
    try {
      await updateUserStatus(user.uid, newStatus, currentAdmin.email)
      setUser(prev => prev ? { ...prev, status: newStatus } : prev)
      setSuccess(`User ${newStatus} successfully`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError('Failed: ' + e.message)
      setTimeout(() => setError(''), 3000)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !currentAdmin) return
    setDeleting(true)
    try {
      await deleteUser(user.uid, currentAdmin.email)
      router.push('/admin/users')
    } catch (e: any) {
      setError('Failed: ' + e.message)
      setTimeout(() => setError(''), 3000)
      setDeleting(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-900 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-red-500 text-sm">User not found.</p>
        <button onClick={() => router.push('/admin/users')} className="mt-3 text-sm text-blue-900 hover:underline">← Back to Users</button>
      </div>
    )
  }

  // Derived
  const fullName    = [user.lastName, user.firstName, user.middleName].filter(Boolean).join(', ')
  const initials    = [(user.firstName || user.name || '?')[0], (user.lastName || '')[0]].filter(Boolean).join('').toUpperCase()
  const currentLevel = user.currentLevel ?? 1
  const totalLevels  = 7

  const fullAddress = [user.houseStreet, user.barangay, user.municipalityCity, user.province, user.zipCode]
    .filter(Boolean).join(', ') || user.address || 'N/A'

  // Shared action buttons — rendered once, reused in both layouts
  const ActionButtons = () => (
    <>
      {user.status === 'pending' && (<>
        <button
          onClick={() => handleStatus('active')}
          disabled={actionLoading}
          className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-semibold transition-colors disabled:opacity-50"
        >✓ Approve</button>
        <button
          onClick={() => handleStatus('rejected')}
          disabled={actionLoading}
          className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs font-semibold transition-colors disabled:opacity-50"
        >✗ Reject</button>
      </>)}
      {user.status === 'active' && (
        <button
          onClick={() => handleStatus('disabled')}
          disabled={actionLoading}
          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-semibold transition-colors disabled:opacity-50 border border-gray-200"
        >⊘ Disable</button>
      )}
      {(user.status === 'disabled' || user.status === 'rejected') && (
        <button
          onClick={() => handleStatus('active')}
          disabled={actionLoading}
          className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-semibold transition-colors disabled:opacity-50"
        >✓ Enable</button>
      )}
      <button
        onClick={() => setConfirmDelete(true)}
        className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-semibold transition-colors"
      >🗑 Delete</button>
    </>
  )

  return (
    /*
     * LAYOUT STRATEGY
     * ───────────────
     * Mobile  : normal document flow — page scrolls, no fixed heights
     * Desktop : the wrapper fills the viewport height (h-screen or h-full
     *           depending on parent), then each column scrolls independently.
     *
     * The wrapper uses:
     *   flex flex-col          → stacks header + body vertically on mobile
     *   lg:h-full              → fills parent height on desktop
     *
     * The two-column body uses:
     *   flex flex-col          → vertical on mobile (natural height)
     *   lg:flex-row lg:flex-1 lg:min-h-0   → side-by-side on desktop,
     *                                         constrained to remaining height
     * Each column uses lg:overflow-y-auto to scroll independently.
     */
    <div className="flex flex-col p-4 sm:p-6 lg:h-full">

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full border-2 border-red-500">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Permanently delete <span className="font-semibold text-gray-800">{fullName || user.email}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-3 border-b flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700 truncate">
                {getFilenameFromUrl(viewDoc.url)}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const filename = viewDoc.fileName || getFilenameFromUrl(viewDoc.url)
                    const proxyUrl = `/api/download?url=${encodeURIComponent(viewDoc.url)}&name=${encodeURIComponent(filename)}`
                    const link = document.createElement('a')
                    link.href = proxyUrl
                    link.download = filename
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 font-semibold"
                >
                  Download
                </button>
                <button onClick={() => setViewDoc(null)} className="text-gray-500 hover:text-red-500 text-sm px-1">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto" style={{ maxHeight: '80vh' }}>
              {/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(viewDoc.url) ? (
                <div className="flex items-center justify-center p-4 bg-gray-50 min-h-[300px]">
                  <img
                    src={viewDoc.url}
                    alt={getFilenameFromUrl(viewDoc.url)}
                    className="max-w-full max-h-[75vh] object-contain rounded shadow"
                  />
                </div>
              ) : (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewDoc.url)}&embedded=true`}
                  className="w-full"
                  style={{ height: '75vh' }}
                  title={getFilenameFromUrl(viewDoc.url)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex-shrink-0">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex-shrink-0">{success}</div>}

      {/*
       * ── TOP BAR (mobile only) ──────────────────────────────────────────
       * Single row: [← Back to User List]   [action buttons]
       * Hidden on desktop (lg:hidden)
       */}
      <div className="flex lg:hidden items-center justify-between gap-2 mb-4 flex-shrink-0">
        {/* Back button — left */}
        <button
          onClick={() => router.push('/admin/users')}
          className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 hover:text-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to User List
        </button>

        {/* Action buttons — right, wrapping */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <ActionButtons />
        </div>
      </div>

      {/*
       * ── TWO-COLUMN BODY ────────────────────────────────────────────────
       * Mobile  : flex-col → stacked, natural height, page scrolls
       * Desktop : flex-row → side-by-side, constrained height, each col scrolls
       */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ══ LEFT COLUMN (40%) ══════════════════════════════════════════ */}
        <div className="w-full lg:w-[40%] flex flex-col gap-4 flex-shrink-0">

          {/* Back button — desktop only */}
          <button
            onClick={() => router.push('/admin/users')}
            className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-blue-900 hover:text-blue-700 transition-colors w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to User List
          </button>

          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col items-center text-center gap-3">
            {user.photoURL || user.profileImage ? (
              <img
                src={user.photoURL || user.profileImage}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-yellow-400"
                alt={fullName}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-yellow-400">
                {initials || '?'}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">{fullName || user.name || '—'}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
              {user.contact && <p className="text-xs text-gray-400 mt-0.5">{user.contact}</p>}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[user.status || 'active'] ?? 'bg-gray-100 text-gray-600'}`}>
                {user.status || 'active'}
              </span>
              <span className="bg-blue-50 text-blue-900 text-xs font-semibold px-3 py-1 rounded-full capitalize">
                {user.role || 'user'}
              </span>
            </div>
          </div>

          {/* Account details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Account Details</h3>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                { label: 'First Name',   value: user.firstName || '—' },
                { label: 'Middle Name',  value: user.middleName || '—' },
                { label: 'Last Name',    value: user.lastName || '—' },
                { label: 'Gender',       value: user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '—' },
                { label: 'Birthday',     value: user.birthday ? formatDate(user.birthday) : '—' },
                { label: 'Age',          value: user.birthday ? calculateAge(user.birthday) : '—' },
                { label: 'Civil Status', value: user.civilStatus || '—' },
                { label: 'Education',    value: user.educationalAttainment || '—' },
                { label: 'Current Job',  value: user.currentJob || '—' },
                { label: 'Address',      value: fullAddress },
                { label: 'Joined',       value: formatDate(user.createdAt) },
                { label: 'Profile',      value: user.profileCompleted ? 'Completed' : 'Incomplete' },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-400 font-medium w-24 flex-shrink-0">{row.label}</span>
                  <span className="text-xs text-gray-800 font-semibold text-right break-words max-w-[180px]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* bottom padding */}
          <div className="h-4 flex-shrink-0" />
        </div>

        {/* ══ RIGHT COLUMN (60%) ═════════════════════════════════════════ */}
        <div className="w-full lg:w-[60%] flex flex-col">

          {/* Action buttons — desktop only */}
          <div className="hidden lg:flex items-center justify-end gap-2 mb-4 flex-shrink-0 flex-wrap">
            <ActionButtons />
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4 flex-shrink-0">
            {(['overview', 'documents'] as RightTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  tab === t ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pb-8">
            {detailLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Loading...</p>
              </div>
            ) : (
              <>
                {/* ── OVERVIEW ── */}
                {tab === 'overview' && (
                  <div className="space-y-4">

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Level Progress</h3>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-center mb-4 overflow-x-auto py-1">
                          {Array.from({ length: totalLevels }, (_, i) => {
                            const lvl = i + 1
                            const progress = levelProgress?.[`level${lvl}`]?.progress || 0
                            const done = progress === 100
                            const active = progress > 0 && progress < 100
                            
                            // Returnee skip logic
                            const isReturnee = user.advisorType === 'returnee'
                            const RETURNEE_SKIP = [3, 4, 5]
                            const isSkipped = isReturnee && RETURNEE_SKIP.includes(lvl)
                            
                            // Determine if level is unlocked
                            const isUnlocked = lvl <= currentLevel || done || active
                            
                            let circleClass = 'bg-white border-gray-200 text-gray-300'
                            let circleContent: string | number = lvl
                            
                            if (isSkipped) {
                              circleClass = 'bg-purple-100 border-purple-700 text-purple-700'
                              circleContent = '⊘'
                            } else if (done) {
                              circleClass = 'bg-blue-900 border-blue-900 text-white'
                              circleContent = '✓'
                            } else if (active) {
                              circleClass = 'bg-white border-blue-900 text-blue-900'
                              circleContent = lvl
                            } else if (isUnlocked && progress === 0) {
                              circleClass = 'bg-yellow-100 border-yellow-600 text-yellow-700'
                              circleContent = lvl
                            }
                            
                            return (
                              <div key={lvl} className="flex items-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all flex-shrink-0 ${circleClass}`}>
                                  {circleContent}
                                </div>
                                {lvl < totalLevels && (
                                  <div className={`h-0.5 w-4 sm:w-7 flex-shrink-0 ${progress === 100 || isSkipped ? 'bg-blue-900' : 'bg-gray-200'}`} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <div className="border-t border-gray-100 divide-y divide-gray-100">
                          {Array.from({ length: totalLevels }, (_, i) => {
                            const lvl = i + 1
                            const progress = levelProgress?.[`level${lvl}`]?.progress || 0
                            const done = progress === 100
                            const active = progress > 0 && progress < 100
                            
                            // Returnee skip logic
                            const isReturnee = user.advisorType === 'returnee'
                            const RETURNEE_SKIP = [3, 4, 5]
                            const isSkipped = isReturnee && RETURNEE_SKIP.includes(lvl)
                            
                            // Determine if level is unlocked (not locked)
                            // A level is unlocked if it's less than or equal to current level
                            // or if all previous levels are complete
                            const isUnlocked = lvl <= currentLevel || done || active
                            
                            let statusLabel = 'Locked'
                            let statusClass = 'bg-gray-100 text-gray-400'
                            let iconClass = 'bg-gray-100 text-gray-400'
                            let iconContent: string | number = lvl
                            
                            if (isSkipped) {
                              statusLabel = 'Skipped'
                              statusClass = 'bg-purple-100 text-purple-700'
                              iconClass = 'bg-purple-100 text-purple-700'
                              iconContent = '⊘'
                            } else if (done) {
                              statusLabel = 'Complete'
                              statusClass = 'bg-green-100 text-green-700'
                              iconClass = 'bg-green-500 text-white'
                              iconContent = '✓'
                            } else if (active) {
                              statusLabel = `${progress}%`
                              statusClass = 'bg-blue-100 text-blue-900'
                              iconClass = 'bg-blue-900 text-white'
                              iconContent = lvl
                            } else if (isUnlocked && progress === 0) {
                              statusLabel = '0%'
                              statusClass = 'bg-yellow-100 text-yellow-700'
                              iconClass = 'bg-yellow-100 text-yellow-700'
                              iconContent = lvl
                            }
                            
                            return (
                              <div key={lvl} className="flex items-center gap-3 px-4 py-2.5">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${iconClass}`}>
                                  {iconContent}
                                </div>
                                <p className={`text-xs font-medium flex-1 ${done || active || isSkipped || (isUnlocked && progress === 0) ? 'text-gray-800' : 'text-gray-400'}`}>
                                  Level {lvl} — {LEVEL_LABELS[lvl] ?? `Level ${lvl}`}
                                </p>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                  </div>
                )}


                {/* ── DOCUMENTS ── */}
                {tab === 'documents' && (() => {
                  const byLevel = detail.documents.reduce<Record<number, typeof detail.documents>>(
                    (acc, d) => {
                      const lvl = d.level ?? 0
                      if (!acc[lvl]) acc[lvl] = []
                      acc[lvl].push(d)
                      return acc
                    }, {}
                  )

                  // Add level 5 receipt if available
                  if (level5Receipt?.receiptUrl) {
                    if (!byLevel[5]) byLevel[5] = []
                    byLevel[5].push({
                      type: 'level5_receipt',
                      fileName: level5Receipt.fileName || 'Level 5 Exam Receipt',
                      url: level5Receipt.receiptUrl,
                      level: 5,
                      uploadedAt: level5Receipt.uploadedAt,
                    })
                  }

                  const levelOrder = Object.keys(byLevel).map(Number).sort((a, b) => a - b)

                  const DocRow = ({ doc }: { doc: typeof detail.documents[0] }) => {
                    const filename = doc.fileName || getFilenameFromUrl(doc.url)
                    const status   = doc.status
                    const type     = doc.type
                    const level    = doc.level
                    const label    = level === 1
                      ? (LEVEL1_DOC_LABELS[type] ?? type.replace(/_/g, ' '))
                      : filename

                    return (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={label}>{label}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {doc.uploadedAt && (
                              <p className="text-xs text-gray-400">{formatDate(doc.uploadedAt)}</p>
                            )}
                            {status && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${DOC_STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                {status}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setViewDoc(doc)}
                          className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors flex-shrink-0"
                        >
                          View
                        </button>
                      </div>
                    )
                  }

                  const levelTitle = (lvl: number) => {
                    if (lvl === 1) return 'Basic Requirements (Level 1)'
                    if (lvl === 2) return 'Training Certificate (Level 2)'
                    if (lvl === 5) return 'Pay & Take Licensure Exam (Level 5)'
                    return `${LEVEL_LABELS[lvl] ? `${LEVEL_LABELS[lvl]} ` : ''}(Level ${lvl})`
                  }

                  return (
                    <div className="space-y-5">
                      {detail.documents.length > 0 && (
                        <button
                          onClick={async () => {
                            try {
                              const JSZip = (await import('jszip')).default
                              const zip = new JSZip()
                              await Promise.all(
                                detail.documents.map(async (doc) => {
                                  const name = doc.fileName || getFilenameFromUrl(doc.url)
                                  const proxyUrl = `/api/download?url=${encodeURIComponent(doc.url)}&name=${encodeURIComponent(name)}`
                                  const res = await fetch(proxyUrl)
                                  const blob = await res.blob()
                                  zip.file(name, blob)
                                })
                              )
                              const zipBlob = await zip.generateAsync({ type: 'blob' })
                              const blobUrl = URL.createObjectURL(zipBlob)
                              const link = document.createElement('a')
                              link.href = blobUrl
                              link.download = `${user?.lastName ?? 'user'}_documents.zip`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                              URL.revokeObjectURL(blobUrl)
                            } catch {
                              setError('Failed to download ZIP')
                              setTimeout(() => setError(''), 3000)
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 font-semibold"
                        >
                          ↓ Download All as ZIP ({detail.documents.length})
                        </button>
                      )}

                      {detail.documents.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center text-center">
                          <p className="text-3xl mb-3">📄</p>
                          <p className="text-sm font-semibold text-gray-700">No documents submitted</p>
                          <p className="text-xs text-gray-400 mt-1">Documents uploaded by this user will appear here.</p>
                        </div>
                      )}

                      {levelOrder.map(lvl => (
                        <div key={lvl}>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{levelTitle(lvl)}</p>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
                              {byLevel[lvl].length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {byLevel[lvl].map((doc, i) => <DocRow key={`${doc.type}-${i}`} doc={doc} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </>
            )}
          </div>{/* end tab content */}
        </div>{/* end right column */}
      </div>{/* end two-column */}
    </div>
  )
}