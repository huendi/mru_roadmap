'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers } from '@/lib/auth'
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

/** Persist status change to Firestore */
async function updateUserStatus(uid: string, status: string) {
  await setDoc(doc(db, 'users', uid), { status }, { merge: true })
}

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
  await setDoc(doc(db, 'users', user.uid), rest)
  await deleteDoc(doc(db, 'deletedUsers', user.uid))
}

/** Permanently delete from `deletedUsers` */
async function hardDeleteUser(uid: string) {
  const res = await fetch('/api/admin/delete-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid }),
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

  // ── Load active users ────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const allUsers = await getAllUsers()
        setUsers(allUsers)
      } catch (e: any) {
        showError('Failed to load users: ' + e.message)
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
      await updateUserStatus(uid, newStatus) // ← persist to Firestore
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u))
      showSuccess(`User ${newStatus === 'disabled' ? 'disabled' : 're-enabled'} successfully`)
    } catch (e: any) {
      showError('Failed: ' + e.message)
    }
  }

  // ── Confirm dispatcher ───────────────────────────────────────
  const handleConfirm = async (reason?: string) => {
    if (!pending) return
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

      } else if (pending.type === 'restore') {
        await restoreUser(pending.user)
        setDeletedUsers(prev => prev.filter(u => u.uid !== pending.user.uid))
        setUsers(prev => [...prev, pending.user])
        showSuccess('User restored successfully')

      } else if (pending.type === 'hard-delete') {
        await hardDeleteUser(pending.user.uid)
        setDeletedUsers(prev => prev.filter(u => u.uid !== pending.user.uid))
        showSuccess('User permanently deleted')
      }
    } catch (e: any) {
      showError('Action failed: ' + e.message)
    } finally {
      setPending(null)
    }
  }

  // ── Derived lists ────────────────────────────────────────────
  const nonAdminUsers = users.filter(u => u.role !== 'admin' && u.status !== 'pending')

  const filteredUsers = nonAdminUsers
    .filter(u => {
      const matchSearch = !search || `${u.lastName} ${u.firstName} ${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || u.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => (a.lastName || a.name || '').localeCompare(b.lastName || b.name || ''))

  const filteredBin = deletedUsers
    .filter(u => !search || `${u.lastName} ${u.firstName} ${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
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
    <div className="p-6 space-y-4">

      {/* Confirmation Modal */}
      {pending && modalConfig && (
        <ConfirmModal
          {...modalConfig}
          showRemarks={pending.type === 'soft-delete'}  // ← only show for delete
          onCancel={() => setPending(null)}
          onConfirm={handleConfirm}
        />
      )}

      {/* Alerts */}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Header */}
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

      {/* Tabs */}
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

      {/* Search */}
      <div className="relative">
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={activeTab === 'users' ? 'Search by name or email...' : 'Search deleted users...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
        />
      </div>

      {/* ── USER LIST TAB ── */}
      {activeTab === 'users' && (
        <>
          {/* Status filter pills */}
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

          <div className="bg-white rounded-xl border-2 border-yellow-600 overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
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
                      // ✅ Gray background highlight for disabled rows
                      className={`transition-colors cursor-pointer ${
                        u.status === 'disabled'
                          ? 'bg-gray-100 hover:bg-gray-200 opacity-70'
                          : 'hover:bg-yellow-50/40'
                      }`}
                      onClick={() => router.push(`/admin/users/${u.uid}`)}
                    >
                      <td className="px-4 py-3 text-xs font-semibold text-gray-400 w-10">{idx + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className={`font-semibold ${u.status === 'disabled' ? 'text-gray-400' : 'text-gray-900'}`}>
                          {u.lastName || u.name || '—'}
                        </p>
                        {u.firstName && (
                          <p className="text-xs text-gray-400">{u.firstName}</p>
                        )}
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
          </div>
        </>
      )}

      {/* ── RECYCLE BIN TAB ── */}
      {activeTab === 'recycle' && (
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

              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
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
                          <p className="font-semibold text-gray-700">{u.lastName || u.name || '—'}</p>
                          {u.firstName && <p className="text-xs text-gray-400">{u.firstName}</p>}
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
      )}

    </div>
  )
}