'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, updateUserStatus as updateUserStatusAuth, onAuthStateChange } from '@/lib/auth'
import { User } from '@/types'
import * as XLSX from 'xlsx'
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase' // ← adjust path if needed

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const formatDate = (date: any): string => {
  if (!date) return 'N/A'
  let d: Date
  if (typeof date === 'string') d = new Date(date)
  else if (date?.toDate) d = date.toDate()
  else d = date as Date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const calculateAge = (birthday?: string): number | string => {
  if (!birthday) return ''
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return age
}

// ─────────────────────────────────────────────────────────────
// Firestore helpers – status / soft-delete / restore / hard-delete
// ─────────────────────────────────────────────────────────────


/** Move a user document to the `deletedUsers` collection */
async function softDeleteUser(user: User, reason: string) {
  await setDoc(doc(db, 'deletedUsers', user.uid), {
    ...user,
    status: 'frozen',
    deleteReason: reason,
    deletedAt: serverTimestamp(),
  })
  await deleteDoc(doc(db, 'users', user.uid))
}

/** Restore from `deletedUsers` back to `users` */
async function restoreUser(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deletedAt, ...rest } = user as any
  // Set status back to 'active' when restoring from recycle bin
  await setDoc(doc(db, 'users', user.uid), { ...rest, status: 'active' })
  await deleteDoc(doc(db, 'deletedUsers', user.uid))
}

/** Permanently delete from `deletedUsers` */
async function hardDeleteUser(uid: string, adminEmail?: string) {
  const res = await fetch('/api/admin/delete-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, adminEmail }),
  })

  const contentType = res.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    throw new Error(`Server error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to delete user')
}

/** Fetch all soft-deleted users */
async function getDeletedUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'deletedUsers'))
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User))
}

// ─────────────────────────────────────────────────────────────
// XLSX export
// ─────────────────────────────────────────────────────────────
const downloadXLSX = (users: User[]) => {
  const rows = users.map((u, idx) => ({
    '#': idx + 1,
    'Last Name': u.lastName || '',
    'First Name': u.firstName || '',
    'Middle Name': u.middleName || '',
    'Email': u.email || '',
    'Gender': u.gender || '',
    'Birthday': u.birthday || '',
    'Age': calculateAge(u.birthday),
    'Birthplace': u.birthplace || '',
    'Civil Status': u.civilStatus || '',
    'Contact No.': u.contact || '',
    'House No. / Street': u.houseStreet || '',
    'Barangay': u.barangay || '',
    'Municipality / City': u.municipalityCity || '',
    'Province': u.province || '',
    'ZIP Code': u.zipCode || '',
    'Educational Attainment': u.educationalAttainment || '',
    'Current Job': u.currentJob || '',
    'Status': u.status || 'active',
    'Role': u.role || 'user',
    'Level': u.currentLevel ?? 1,
    'Joined': formatDate(u.createdAt),
    'Last Updated': formatDate(u.updatedAt),
    'UID': u.uid || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 4 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 28 },
    { wch: 10 }, { wch: 13 }, { wch: 5 }, { wch: 20 }, { wch: 14 },
    { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 18 },
    { wch: 9 }, { wch: 24 }, { wch: 22 }, { wch: 11 }, { wch: 8 },
    { wch: 7 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ]

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!ws[ref]) continue
    ws[ref].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 10 },
      fill: { patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { top: { style: 'thin', color: { rgb: '1E3A5F' } }, bottom: { style: 'thin', color: { rgb: '1E3A5F' } }, left: { style: 'thin', color: { rgb: '1E3A5F' } }, right: { style: 'thin', color: { rgb: '1E3A5F' } } },
    }
  }
  for (let row = 1; row <= rows.length; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const ref = XLSX.utils.encode_cell({ r: row, c: col })
      if (!ws[ref]) ws[ref] = { t: 's', v: '' }
      ws[ref].s = {
        font: { name: 'Arial', sz: 10 },
        fill: { patternType: 'solid', fgColor: { rgb: row % 2 === 0 ? 'EEF3FB' : 'FFFFFF' } },
        alignment: { vertical: 'center' },
        border: { bottom: { style: 'hair', color: { rgb: 'D0D0D0' } }, right: { style: 'hair', color: { rgb: 'D0D0D0' } } },
      }
    }
  }
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }

  const summaryData = [
    ['USER LIST SUMMARY'], [],
    ['Total Users', users.length],
    ['Active', users.filter(u => u.status === 'active').length],
    ['Disabled', users.filter(u => u.status === 'disabled').length],
    ['Rejected', users.filter(u => u.status === 'rejected').length],
    [], ['Generated On', new Date().toLocaleString()],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  summaryWs['!cols'] = [{ wch: 18 }, { wch: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Users')
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
  XLSX.writeFile(wb, `users_${new Date().toISOString().slice(0, 10)}.xlsx`, { bookType: 'xlsx', cellStyles: true })
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type StatusFilter = 'all' | 'active' | 'disabled' | 'rejected'
type Tab = 'users' | 'recycle'

// ─────────────────────────────────────────────────────────────
// PIN Modal
// ─────────────────────────────────────────────────────────────
function PinModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Clear PIN and error when modal opens
  useEffect(() => {
    setPin('')
    setError('')
  }, [onClose, onSuccess]) // Trigger when modal opens (new callbacks)

  const handleCheck = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!data.success) {
        setError('Wrong PIN. Please try again.')
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">PIN Verification</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter your PIN to confirm this action</p>
          </div>
        </div>

        <input
          type="password"
          autoComplete="one-time-code"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCheck()}
          onFocus={() => {
            // Clear PIN on focus to prevent browser autofill
            if (pin && pin.length > 0) {
              setPin('')
            }
          }}
          onBlur={() => {
            // Additional check on blur to clear any unwanted autofill
            if (pin && pin.length > 0 && /^\*+$/.test(pin)) {
              setPin('')
            }
          }}
          onInput={(e) => {
            const target = e.target as HTMLInputElement
            // Prevent setting to asterisks from browser autofill
            if (/^\*+$/.test(target.value)) {
              target.value = ''
              setPin('')
            }
          }}
          className="w-full border border-gray-200 p-3 text-center text-xl tracking-widest rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
          placeholder="••••••"
          autoFocus
          style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
        />

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCheck}
            disabled={loading || !pin}
            className="flex-1 bg-blue-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal: generic two-step confirmation
// ─────────────────────────────────────────────────────────────
const PRESET_REASONS = [
  'Inactive for 30 days',
  'Violation of company policy',
  'Duplicate account',
  'Request from user',
  'Other',
]

interface ConfirmModalProps {
  title: string
  description: string
  confirmLabel: string
  confirmClass: string
  showRemarks?: boolean
  onCancel: () => void
  onConfirm: (reason?: string) => void
}

function ConfirmModal({
  title, description, confirmLabel, confirmClass,
  showRemarks, onCancel, onConfirm
}: ConfirmModalProps) {
  const [selected, setSelected] = useState('')
  const [custom, setCustom] = useState('')

  const reason = selected === 'Other' ? custom.trim() : selected

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>

        {/* ✅ Remarks — only for soft-delete */}
        {showRemarks && (
          <div className="mb-4 space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Reason for freezing account
            </label>
            <div className="space-y-1.5">
              {PRESET_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => { setSelected(r); setCustom('') }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    selected === r
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {selected === 'Other' && (
              <textarea
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="Type your reason here..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none mt-1"
              />
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={showRemarks && !reason}
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const router = useRouter()

  // Current admin for logging
  const [currentAdmin, setCurrentAdmin] = useState<User | null>(null)

  // Active users
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Recycle bin
  const [deletedUsers, setDeletedUsers] = useState<User[]>([])
  const [loadingBin, setLoadingBin] = useState(false)

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  // Confirmation modals
  type PendingAction =
    | { type: 'soft-delete'; user: User; reason?: string }
    | { type: 'restore'; user: User }
    | { type: 'hard-delete'; user: User }

  const [pending, setPending] = useState<PendingAction | null>(null)
  
  // Unified pending action — PIN gate for hard-delete
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)

  // Track current admin for logging
  useEffect(() => {
    const unsub = onAuthStateChange((userData) => {
      if (userData && userData.role === 'admin') {
        setCurrentAdmin(userData)
      }
    })
    return unsub
  }, [])

  // Add this useEffect to handle body scroll lock when modals are open
  useEffect(() => {
    if (pending || pendingCallback) {
      document.body.style.overflow = 'hidden'
      // Clear search when any modal opens to prevent auto-filling
      setSearch('')
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [pending, pendingCallback])

  // ── Load active users ────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const allUsers = await getAllUsers()
        setUsers(allUsers)
      } catch (e: any) {
        console.error('Failed to load users:', e)
      } finally {
        setLoadingUsers(false)
      }
    })()
  }, [])

  // ── Load recycle bin when tab switches ───────────────────────
  useEffect(() => {
    if (activeTab !== 'recycle') return
    ;(async () => {
      setLoadingBin(true)
      try {
        setDeletedUsers(await getDeletedUsers())
      } catch (e: any) {
        showError('Failed to load recycle bin: ' + e.message)
      } finally {
        setLoadingBin(false)
      }
    })()
  }, [activeTab])

  // ── Alerts ───────────────────────────────────────────────────
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 4000) }
  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  // ── Toggle disable/enable — now persists to Firestore ────────
  const handleDisable = async (uid: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled'
      await updateUserStatusAuth(uid, newStatus, currentAdmin?.email) // ← persist to Firestore with logging
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u))
      showSuccess(`User ${newStatus === 'disabled' ? 'disabled' : 're-enabled'} successfully`)
    } catch (e: any) {
      showError('Failed: ' + e.message)
    }
  }

  // ── Confirm dispatcher ───────────────────────────────────────
  const handleConfirm = async (reason?: string) => {
    if (!pending) return
    
    // For hard-delete, require PIN verification
    if (pending.type === 'hard-delete') {
      const action = pending
      setPending(null)
      setPendingCallback(() => () => {
        executeHardDelete(action.user.uid)
      })
      return
    }
    
    // For other actions, proceed directly
    try {
      if (pending.type === 'soft-delete') {
        await softDeleteUser(pending.user, reason || 'No reason provided')
        setUsers(prev => prev.filter(u => u.uid !== pending.user.uid))
        setDeletedUsers(prev => [...prev, {
          ...pending.user,
          status: 'frozen',
          deleteReason: reason || 'No reason provided',
          deletedAt: new Date(),
        } as any])
        showSuccess('User moved to Recycle Bin')

        // Log the soft-delete action
        try {
          const { createAdminLog } = await import('@/lib/admin-logs')
          await createAdminLog(
            currentAdmin?.displayName || currentAdmin?.email || 'Admin',
            pending.user.displayName || pending.user.name || pending.user.email || 'Unknown User',
            'User Account Management',
            'Moved to Recycle Bin',
            pending.user.email || undefined
          )
        } catch (logError) {
          console.warn('Failed to create admin log for soft delete:', logError)
        }

      } else if (pending.type === 'restore') {
        await restoreUser(pending.user)
        setDeletedUsers(prev => prev.filter(u => u.uid !== pending.user.uid))
        setUsers(prev => [...prev, { ...pending.user, status: 'active' }])
        showSuccess('User restored successfully')

        // Log the restore action
        try {
          const { createAdminLog } = await import('@/lib/admin-logs')
          await createAdminLog(
            currentAdmin?.displayName || currentAdmin?.email || 'Admin',
            pending.user.displayName || pending.user.name || pending.user.email || 'Unknown User',
            'User Account Management',
            'Restored from Recycle Bin',
            pending.user.email || undefined
          )
        } catch (logError) {
          console.warn('Failed to create admin log for restore:', logError)
        }
      }
    } catch (e: any) {
      showError('Action failed: ' + e.message)
    } finally {
      setPending(null)
    }
  }

  // ── Execute hard delete after PIN verification ─────────────────────
  const executeHardDelete = async (uid: string) => {
    try {
      await hardDeleteUser(uid, currentAdmin?.email)
      setDeletedUsers(prev => prev.filter(u => u.uid !== uid))
      showSuccess('User permanently deleted')
    } catch (e: any) {
      showError('Action failed: ' + e.message)
    }
  }

  // ── Derived lists ────────────────────────────────────────────
  const nonAdminUsers = users.filter(u => u.role !== 'admin' && u.status !== 'pending')

  // Enhanced search function that searches across all user details
  const searchAcrossAllFields = (user: User, searchTerm: string): boolean => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    // Create a searchable string with all user details
    const searchableFields = [
      user.lastName || '',
      user.firstName || '',
      user.middleName || '',
      user.name || '',
      user.email || '',
      user.displayName || '',
      user.contact || '',
      user.birthplace || '',
      user.houseStreet || '',
      user.barangay || '',
      user.municipalityCity || '',
      user.province || '',
      user.region || '',
      user.zipCode || '',
      user.address || '',
      user.civilStatus || '',
      user.educationalAttainment || '',
      user.currentJob || '',
      user.gender || '',
      user.advisorType || '',
      user.role || '',
      user.status || '',
      (user.currentLevel ?? 1).toString(),
      user.birthday || '',
      formatDate(user.createdAt),
      formatDate(user.updatedAt),
      user.uid || ''
    ]
    
    // Use whole word matching to avoid 'male' matching 'female'
    return searchableFields.some(field => {
      const fieldLower = field.toLowerCase()
      // Create regex for whole word matching with word boundaries
      const regex = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      return regex.test(fieldLower)
    })
  }

  const filteredUsers = nonAdminUsers
    .filter(u => {
      const matchSearch = searchAcrossAllFields(u, search)
      const matchStatus = statusFilter === 'all' || u.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => (a.lastName || a.name || '').localeCompare(b.lastName || b.name || ''))

  const filteredBin = deletedUsers
    .filter(u => searchAcrossAllFields(u, search))
    .sort((a, b) => (a.lastName || a.name || '').localeCompare(b.lastName || b.name || ''))

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: `All (${nonAdminUsers.length})` },
    { key: 'active', label: `Active (${nonAdminUsers.filter(u => u.status === 'active').length})` },
    { key: 'disabled', label: `Disabled (${nonAdminUsers.filter(u => u.status === 'disabled').length})` },
    { key: 'rejected', label: `Rejected (${nonAdminUsers.filter(u => u.status === 'rejected').length})` },
  ]

  // ── Modal config per action ──────────────────────────────────
  const modalConfig = pending
    ? pending.type === 'soft-delete'
      ? {
          title: 'Move to Recycle Bin?',
          description: `"${pending.user.lastName || pending.user.name}" will be moved to the Recycle Bin. You can restore them later.`,
          confirmLabel: 'Move to Bin',
          confirmClass: 'bg-orange-600 hover:bg-orange-700',
        }
      : pending.type === 'restore'
      ? {
          title: 'Restore User?',
          description: `"${pending.user.lastName || pending.user.name}" will be restored and can log in again.`,
          confirmLabel: 'Restore',
          confirmClass: 'bg-green-600 hover:bg-green-700',
        }
      : {
          title: 'Permanently Delete?',
          description: `This will permanently erase "${pending.user.lastName || pending.user.name}" and all their data. This CANNOT be undone.`,
          confirmLabel: 'Delete Forever',
          confirmClass: 'bg-red-600 hover:bg-red-700',
        }
    : null

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-900 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Confirmation Modal */}
      {pending && modalConfig && (
        <ConfirmModal
          {...modalConfig}
          showRemarks={pending.type === 'soft-delete'}  // ← only show for delete
          onCancel={() => setPending(null)}
          onConfirm={handleConfirm}
        />
      )}

      {/* PIN Modal */}
      {pendingCallback && (
        <PinModal
          onClose={() => setPendingCallback(null)}
          onSuccess={() => {
            pendingCallback()
            setPendingCallback(null)
          }}
        />
      )}

      {/* Alerts */}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex-shrink-0">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex-shrink-0">{success}</div>}

      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500">{nonAdminUsers.length} users total</p>
          </div>
          {activeTab === 'users' && (
            <button
              onClick={() => downloadXLSX(nonAdminUsers)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Excel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 flex-shrink-0">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'users' ? 'bg-white shadow text-blue-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab('recycle')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'recycle' ? 'bg-white shadow text-orange-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🗑️ Recycle Bin
            {deletedUsers.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {deletedUsers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 sm:px-6 pt-3 flex-shrink-0">
        <div className="relative">
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={activeTab === 'users' ? 'Search all user details (name, email, gender, address, job, etc.)...' : 'Search deleted users...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"           // ← dagdag
            name="user-search-query" 
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
          />
        </div>
      </div>

      {/* ── USER LIST TAB ── */}
      {activeTab === 'users' && (
        <>
          {/* Status filter pills */}
          <div className="px-4 sm:px-6 pt-3 flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                    statusFilter === f.key
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-900 hover:text-blue-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                      {search || statusFilter !== 'all' ? 'No users match your filters.' : 'No users found.'}
                    </td>
                  </tr>
                ) : filteredUsers.map((u, idx) => (
                  <tr
                    key={u.uid}
                    className={`transition-colors cursor-pointer ${
                      u.status === 'disabled'
                        ? 'bg-gray-100 hover:bg-gray-200 opacity-70'
                        : 'hover:bg-yellow-50/40'
                    }`}
                    onClick={() => router.push(`/admin/users/${u.uid}`)}
                  >
                    <td className="px-4 py-3 text-xs font-semibold text-gray-400 w-10">{idx + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className={`font-semibold ${u.status === 'disabled' ? 'text-gray-400' : 'text-gray-900'}`}>
                            {u.lastName || u.name || '—'}
                          </p>
                          {u.firstName && (
                            <p className="text-xs text-gray-400">{u.firstName}</p>
                          )}
                        </div>
                        {u.advisorType && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            u.advisorType === 'new' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.advisorType === 'new' ? 'New' : 'Returnee'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{u.email}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap hidden sm:table-cell">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden sm:table-cell">
                      <span className="bg-blue-50 text-blue-900 font-semibold px-2 py-0.5 rounded-full text-[11px]">Lvl {u.currentLevel ?? 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        u.status === 'active'   ? 'bg-green-100 text-green-800' :
                        u.status === 'disabled' ? 'bg-gray-200 text-gray-500' :
                        u.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                      }`}>{u.status || 'active'}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => router.push(`/admin/users/${u.uid}`)}
                          className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDisable(u.uid, u.status || 'active')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            u.status === 'disabled'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {u.status === 'disabled' ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={() => setPending({ type: 'soft-delete', user: u })}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-semibold transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── RECYCLE BIN TAB ── */}
      {activeTab === 'recycle' && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 min-h-0">
          <div className="bg-white rounded-xl border-2 border-orange-300 overflow-hidden">
            {loadingBin ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-orange-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Loading recycle bin...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Bin header info */}
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-orange-700 font-medium">
                    {filteredBin.length} deleted user{filteredBin.length !== 1 ? 's' : ''}. You can restore them or permanently delete.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Deleted On</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredBin.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-16 text-center">
                            <div className="text-4xl mb-2">🗑️</div>
                            <p className="text-sm text-gray-400">Recycle bin is empty</p>
                          </td>
                        </tr>
                      ) : filteredBin.map((u, idx) => (
                        <tr key={u.uid} className="hover:bg-orange-50/30 transition-colors opacity-80">
                          <td className="px-4 py-3 text-xs font-semibold text-gray-400 w-10">{idx + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-semibold text-gray-700">{u.lastName || u.name || '—'}</p>
                                {u.firstName && <p className="text-xs text-gray-400">{u.firstName}</p>}
                              </div>
                              {u.advisorType && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  u.advisorType === 'new' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {u.advisorType === 'new' ? 'New' : 'Returnee'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{u.email}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap hidden sm:table-cell">
                            {formatDate((u as any).deletedAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setPending({ type: 'restore', user: u })}
                                className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-semibold transition-colors"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => setPending({ type: 'hard-delete', user: u })}
                                className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-semibold transition-colors"
                              >
                                Delete Forever
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}