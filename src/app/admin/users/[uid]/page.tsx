'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getUserByUid, updateUserStatus, deleteUser } from '@/lib/auth'
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
  id: string
  name: string
  level: number
  url: string
  uploadedAt: string
}

interface UserDetail {
  exams: ExamAttempt[]
  documents: UserDocument[]
}

const getFilenameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname
    const decoded = decodeURIComponent(pathname)
    let filename = decoded.split('/').pop() || 'Document'
    // Fix Cloudinary double-extension: e.g. file.pdf.pdf → file.pdf
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
  1: 'Requirements',
  2: 'Reviewer',
  3: 'Mock Exam',
  4: 'Level 4',
  5: 'Level 5',
  6: 'Level 6',
  7: 'Level 7',
}

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  pending:  'bg-yellow-100 text-yellow-700',
  disabled: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-600',
  approved: 'bg-blue-100 text-blue-700',
}

type RightTab = 'overview' | 'exams' | 'documents'

export default function UserDetailPage() {
  const { uid } = useParams<{ uid: string }>()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<RightTab>('overview')
  const [detail, setDetail] = useState<UserDetail>({ exams: [], documents: [] })
  const [detailLoading, setDetailLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [viewDoc, setViewDoc] = useState<UserDocument | null>(null)

  // Load user via getUserByUid
  useEffect(() => {
    if (!uid) return
    getUserByUid(uid)
      .then(u => setUser(u))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [uid])

  // Load exams + documents
  useEffect(() => {
    if (!uid) return
    const load = async () => {
      try {
        const [examsRes, docsRes] = await Promise.all([
          fetch(`/api/user/level3-exams?uid=${uid}`),  // ← CHANGED
          fetch(`/api/user/documents?uid=${uid}`),
        ])
        const examsData = examsRes.ok ? await examsRes.json() : { exams: [] }
        const docsData  = docsRes.ok  ? await docsRes.json()  : []

        // Flatten grouped → flat ExamAttempt[]
        const flatAttempts: ExamAttempt[] = (examsData.exams ?? []).flatMap(
          (record: { examId: number; attempts: ExamAttempt[] }) =>
            record.attempts.map(attempt => ({
              ...attempt,
              examId: record.examId,
            }))
        )

        setDetail({
          exams:     flatAttempts,
          documents: Array.isArray(docsData) ? docsData : [],
        })
      } catch { /* silent */ }
      finally { setDetailLoading(false) }
    }
    load()
  }, [uid])

  const handleStatus = async (newStatus: any) => {
    if (!user) return
    setActionLoading(true)
    try {
      await updateUserStatus(user.uid, newStatus)
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
    if (!user) return
    setDeleting(true)
    try {
      await deleteUser(user.uid)
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
      <div className="flex items-center justify-center h-full py-32">
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
  const progressPct  = Math.round(((currentLevel - 1) / (totalLevels - 1)) * 100)

  const videoReqs    = ['watched_video_1', 'watched_video_2', 'watched_video_3']
  const videosWatched = videoReqs.filter(r => user.requirementsCompleted?.includes(r)).length

  const bestScores: Record<number, number> = {}
  detail.exams.forEach(e => {
    if (!bestScores[e.examId] || e.score > bestScores[e.examId]) bestScores[e.examId] = e.score
  })
  const passedExams = Object.values(bestScores).filter(s => s >= 75).length

  const fullAddress = [user.houseStreet, user.barangay, user.municipalityCity, user.province, user.zipCode]
    .filter(Boolean).join(', ') || user.address || 'N/A'

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto flex flex-col">

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border-2 border-red-500">
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

      {/* View Document Modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white w-[90%] max-w-4xl rounded-xl shadow-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700 truncate">
                {getFilenameFromUrl(viewDoc.url)}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const filename = getFilenameFromUrl(viewDoc.url)
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

            {/* Content */}
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

      {/* Alerts */}
      {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

        {/* ══════════ LEFT 40% ══════════ */}
        <div className="w-full lg:w-[40%] flex flex-col gap-4 flex-shrink-0">

          {/* Back button */}
          <button
            onClick={() => router.push('/admin/users')}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 hover:text-blue-700 transition-colors w-fit"
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
                { label: 'First Name',    value: user.firstName || '—' },
                { label: 'Middle Name',   value: user.middleName || '—' },
                { label: 'Last Name',     value: user.lastName || '—' },
                { label: 'Gender',        value: user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '—' },
                { label: 'Birthday',      value: user.birthday ? formatDate(user.birthday) : '—' },
                { label: 'Age',           value: user.birthday ? calculateAge(user.birthday) : '—' },
                { label: 'Civil Status',  value: user.civilStatus || '—' },
                { label: 'Education',     value: user.educationalAttainment || '—' },
                { label: 'Current Job',   value: user.currentJob || '—' },
                { label: 'Address',       value: fullAddress },
                { label: 'Joined',        value: formatDate(user.createdAt) },
                { label: 'Profile',       value: user.profileCompleted ? 'Completed' : 'Incomplete' },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-400 font-medium w-24 flex-shrink-0">{row.label}</span>
                  <span className="text-xs text-gray-800 font-semibold text-right break-words max-w-[180px]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ══════════ RIGHT 60% ══════════ */}
        <div className="w-full lg:w-[60%] flex flex-col min-h-0 flex-1">

          {/* Action buttons — top right */}
          <div className="flex items-center justify-end gap-2 mb-4 flex-shrink-0 flex-wrap">
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
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4 flex-shrink-0">
            {(['overview', 'exams', 'documents'] as RightTab[]).map(t => (
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

          {/* Tab content — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-6">

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

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Current Level',  value: `Lvl ${currentLevel}`,       color: 'text-blue-900' },
                        { label: 'Videos Watched', value: `${videosWatched}/3`,         color: 'text-yellow-600' },
                        {
                          label: 'L3 Progress',
                          value: (() => {
                            const pct = Object.values(bestScores).reduce((sum, score) => {
                              if (score >= 75) return sum + 25
                              if (score > 0) return sum + 12
                              return sum
                            }, 0)
                            return `${pct}%`
                          })(),
                          color: passedExams >= 3 ? 'text-green-600' : 'text-amber-600'
                        },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border-2 border-yellow-600 p-3 text-center">
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Level progress */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Level Progress</h3>
                      </div>
                      <div className="p-4">
                        {/* Step dots */}
                        <div className="flex items-center justify-center mb-4">
                          {Array.from({ length: totalLevels }, (_, i) => {
                            const lvl    = i + 1
                            const done   = lvl < currentLevel
                            const active = lvl === currentLevel
                            return (
                              <div key={lvl} className="flex items-center">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                                  done   ? 'bg-blue-900 border-blue-900 text-white' :
                                  active ? 'bg-white border-blue-900 text-blue-900' :
                                           'bg-white border-gray-200 text-gray-300'
                                }`}>
                                  {done ? '✓' : lvl}
                                </div>
                                {lvl < totalLevels && (
                                  <div className={`h-0.5 w-5 sm:w-7 ${lvl < currentLevel ? 'bg-blue-900' : 'bg-gray-200'}`} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
                          <div className="bg-blue-900 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                        </div>
                        <p className="text-xs text-center text-gray-400 font-medium">Level {currentLevel} of {totalLevels}</p>
                      </div>

                      {/* Level rows */}
                      <div className="border-t border-gray-100 divide-y divide-gray-100">
                        {Array.from({ length: totalLevels }, (_, i) => {
                          const lvl    = i + 1
                          const done   = lvl < currentLevel
                          const active = lvl === currentLevel
                          return (
                            <div key={lvl} className="flex items-center gap-3 px-4 py-2.5">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                done ? 'bg-green-500 text-white' : active ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-400'
                              }`}>
                                {done ? '✓' : lvl}
                              </div>
                              <p className={`text-xs font-medium flex-1 ${done || active ? 'text-gray-800' : 'text-gray-400'}`}>
                                Level {lvl} — {LEVEL_LABELS[lvl] ?? `Level ${lvl}`}
                              </p>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                done ? 'bg-green-100 text-green-700' : active ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-400'
                              }`}>
                                {done ? 'Complete' : active ? 'In Progress' : 'Locked'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Completed requirements */}
                    {!!user.requirementsCompleted?.length && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
                          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Completed Requirements ({user.requirementsCompleted.length})
                          </h3>
                        </div>
                        <div className="p-4 flex flex-wrap gap-2">
                          {user.requirementsCompleted.map(r => (
                            <span key={r} className="px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                              ✓ {r.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* ── EXAMS ── */}
                {tab === 'exams' && (
                  <div className="space-y-3">

                    {/* Always show 4-exam grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map(id => {
                        const best = bestScores[id]
                        const contribution = best >= 75 ? 25 : best > 0 ? 12 : 0
                        return (
                          <div key={id} className={`rounded-xl p-3 text-center border-2 ${
                            best >= 75 ? 'bg-green-50 border-green-200' :
                            best > 0   ? 'bg-red-50 border-red-200' :
                                        'bg-gray-50 border-gray-200'
                          }`}>
                            <p className={`text-xl font-bold ${best >= 75 ? 'text-green-600' : best > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                              {best > 0 ? `${best}%` : '—'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">Exam {id}</p>
                            <p className={`text-xs font-semibold mt-1 ${
                              best >= 75 ? 'text-green-600' : best > 0 ? 'text-amber-600' : 'text-gray-300'
                            }`}>
                              +{contribution}%
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Always show L3 progress bar */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-600">Level 3 Progress</span>
                        <span className={`text-xs font-bold ${passedExams >= 3 ? 'text-green-600' : 'text-amber-600'}`}>
                          {Object.values(bestScores).reduce((sum, score) => {
                            if (score >= 75) return sum + 25
                            if (score > 0) return sum + 12
                            return sum
                          }, 0)}% / 100%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${passedExams >= 3 ? 'bg-green-500' : 'bg-amber-500'}`}
                          style={{
                            width: `${Object.values(bestScores).reduce((sum, score) => {
                              if (score >= 75) return sum + 25
                              if (score > 0) return sum + 12
                              return sum
                            }, 0)}%`
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {passedExams >= 3
                          ? `✓ Level 4 unlocked — ${passedExams} exam${passedExams !== 1 ? 's' : ''} passed`
                          : `${passedExams}/3 exams passed · ${3 - passedExams} more needed to unlock Level 4`
                        }
                      </p>
                    </div>

                    {/* Attempt history — only if there are attempts */}
                    {detail.exams.length === 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center text-center">
                        <p className="text-3xl mb-3">📝</p>
                        <p className="text-sm font-semibold text-gray-700">No exam attempts yet</p>
                        <p className="text-xs text-gray-400 mt-1">Exam results will appear here once the user takes an exam.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...detail.exams].reverse().map((e, i) => (
                          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                            e.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              e.passed ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                            }`}>
                              {e.passed ? '✓' : '✗'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">Exam {e.examId}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(e.dateTaken).toLocaleString('en-PH', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                  hour: 'numeric', minute: '2-digit', hour12: true,
                                  timeZone: 'Asia/Manila'
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${e.passed ? 'text-green-600' : 'text-red-500'}`}>{e.score}%</p>
                              <p className="text-xs text-gray-400">{e.correctAnswers}/{e.totalQuestions}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}

                {/* ── DOCUMENTS ── */}
                {tab === 'documents' && (
                  <div className="space-y-2">

                    {/* ✅ Download All button (only if may documents) */}
                    {detail.documents.length > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            const JSZip = (await import('jszip')).default
                            const zip = new JSZip()

                            await Promise.all(
                              detail.documents.map(async (doc) => {
                                const proxyUrl = `/api/download?url=${encodeURIComponent(doc.url)}&name=${encodeURIComponent(getFilenameFromUrl(doc.url))}`
                                const res = await fetch(proxyUrl)
                                const blob = await res.blob()
                                zip.file(getFilenameFromUrl(doc.url), blob)
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
                          } catch (e) {
                            setError('Failed to download ZIP')
                            setTimeout(() => setError(''), 3000)
                          }
                        }}
                        className="mb-3 px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                      >
                        ↓ Download All as ZIP ({detail.documents.length})
                      </button>
                    )}

                    {/* ✅ If NO documents */}
                    {detail.documents.length === 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center text-center">
                        <p className="text-3xl mb-3">📄</p>
                        <p className="text-sm font-semibold text-gray-700">No documents submitted</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Documents uploaded by this user will appear here.
                        </p>
                      </div>
                    ) : (
                      /* ✅ Document list */
                      detail.documents.map(doc => {
                        const filename = getFilenameFromUrl(doc.url)

                        return (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 rounded-xl border-2 border-yellow-200 bg-white hover:bg-yellow-50 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate" title={filename}>
                                {filename}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatDate(doc.uploadedAt)}
                              </p>
                            </div>

                            {/* ✅ View (Modal trigger) */}
                            <button
                              onClick={() => setViewDoc(doc)}
                              className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors flex-shrink-0"
                            >
                              View
                            </button>
                          </div>
                        )
                      })
                    )}

                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}