'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers } from '@/lib/auth'
import { User } from '@/types'
import * as XLSX from 'xlsx'

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

const downloadXLSX = (users: User[]) => {
  // ── 1. Build rows with ALL profile fields ──────────────────────────────────
  const rows = users.map((u, idx) => ({
    '#':                      idx + 1,
    // Personal
    'Last Name':              u.lastName              || '',
    'First Name':             u.firstName             || '',
    'Middle Name':            u.middleName            || '',
    'Email':                  u.email                 || '',
    'Gender':                 u.gender                || '',
    'Birthday':               u.birthday              || '',
    'Age':                    calculateAge(u.birthday),
    'Birthplace':             u.birthplace            || '',
    'Civil Status':           u.civilStatus           || '',
    // Contact
    'Contact No.':            u.contact               || '',
    // Address (split fields)
    'House No. / Street':     u.houseStreet           || '',
    'Barangay':               u.barangay              || '',
    'Municipality / City':    u.municipalityCity      || '',
    'Province':               u.province              || '',
    'ZIP Code':               u.zipCode               || '',
    // Education & Work
    'Educational Attainment': u.educationalAttainment || '',
    'Current Job':            u.currentJob            || '',
    // Account info
    'Status':                 u.status                || 'active',
    'Role':                   u.role                  || 'user',
    'Level':                  u.currentLevel          ?? 1,
    'Joined':                 formatDate(u.createdAt),
    'Last Updated':           formatDate(u.updatedAt),
    'UID':                    u.uid                   || '',
  }))

  // ── 2. Create worksheet ────────────────────────────────────────────────────
  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths (same order as fields above)
  ws['!cols'] = [
    { wch: 4  },  // #
    { wch: 16 },  // Last Name
    { wch: 16 },  // First Name
    { wch: 16 },  // Middle Name
    { wch: 28 },  // Email
    { wch: 10 },  // Gender
    { wch: 13 },  // Birthday
    { wch: 5  },  // Age
    { wch: 20 },  // Birthplace
    { wch: 14 },  // Civil Status
    { wch: 14 },  // Contact No.
    { wch: 22 },  // House No./Street
    { wch: 20 },  // Barangay
    { wch: 20 },  // Municipality/City
    { wch: 18 },  // Province
    { wch: 9  },  // ZIP Code
    { wch: 24 },  // Educational Attainment
    { wch: 22 },  // Current Job
    { wch: 11 },  // Status
    { wch: 8  },  // Role
    { wch: 7  },  // Level
    { wch: 14 },  // Joined
    { wch: 14 },  // Last Updated
    { wch: 30 },  // UID
  ]

  // ── 3. Style header row ────────────────────────────────────────────────────
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!ws[ref]) continue
    ws[ref].s = {
      font:      { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 10 },
      fill:      { patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top:    { style: 'thin', color: { rgb: '1E3A5F' } },
        bottom: { style: 'thin', color: { rgb: '1E3A5F' } },
        left:   { style: 'thin', color: { rgb: '1E3A5F' } },
        right:  { style: 'thin', color: { rgb: '1E3A5F' } },
      },
    }
  }

  // ── 4. Style data rows (alternating white / light blue-gray) ──────────────
  for (let row = 1; row <= rows.length; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const ref = XLSX.utils.encode_cell({ r: row, c: col })
      if (!ws[ref]) ws[ref] = { t: 's', v: '' }
      ws[ref].s = {
        font:      { name: 'Arial', sz: 10 },
        fill:      { patternType: 'solid', fgColor: { rgb: row % 2 === 0 ? 'EEF3FB' : 'FFFFFF' } },
        alignment: { vertical: 'center' },
        border: {
          bottom: { style: 'hair', color: { rgb: 'D0D0D0' } },
          right:  { style: 'hair', color: { rgb: 'D0D0D0' } },
        },
      }
    }
  }

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }

  // ── 5. Summary sheet ──────────────────────────────────────────────────────
  const summaryData = [
    ['USER LIST SUMMARY'],
    [],
    ['Total Users',  users.length],
    ['Active',       users.filter(u => u.status === 'active').length],
    ['Disabled',     users.filter(u => u.status === 'disabled').length],
    ['Rejected',     users.filter(u => u.status === 'rejected').length],
    [],
    ['Generated On', new Date().toLocaleString()],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  summaryWs['!cols'] = [{ wch: 18 }, { wch: 20 }]

  // ── 6. Write file ─────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Users')
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `users_${date}.xlsx`, { bookType: 'xlsx', cellStyles: true })
}

type StatusFilter = 'all' | 'active' | 'disabled' | 'rejected'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
    } catch (e: any) {
      setError('Failed to load users: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async (uid: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled'
      // await updateUserStatus(uid, newStatus)
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u))
      setSuccess(`User ${newStatus === 'disabled' ? 'disabled' : 're-enabled'} successfully`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError('Failed: ' + e.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleDelete = async (uid: string) => {
    try {
      // await deleteUser(uid)
      setUsers(prev => prev.filter(u => u.uid !== uid))
      setSuccess('User deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError('Failed: ' + e.message)
      setTimeout(() => setError(''), 3000)
    } finally {
      setConfirmDelete(null)
    }
  }

  const nonAdminUsers = users.filter(u => u.role !== 'admin' && u.status !== 'pending')

  const filteredUsers = nonAdminUsers
    .filter(u => {
      const matchSearch = !search || `${u.lastName} ${u.firstName} ${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || u.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => (a.lastName || a.name || '').localeCompare(b.lastName || b.name || ''))

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: `All (${nonAdminUsers.length})` },
    { key: 'active',   label: `Active (${nonAdminUsers.filter(u => u.status === 'active').length})` },
    { key: 'disabled', label: `Disabled (${nonAdminUsers.filter(u => u.status === 'disabled').length})` },
    { key: 'rejected', label: `Rejected (${nonAdminUsers.filter(u => u.status === 'rejected').length})` },
  ]

  if (loading) {
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

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone. The user and all their data will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">User List</h2>
          <p className="text-sm text-gray-500">{nonAdminUsers.length} users total</p>
        </div>
        <button
          onClick={() => downloadXLSX(nonAdminUsers)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Excel
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
        />
      </div>

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

      {/* Table */}
      <div className="bg-white rounded-xl border-2 border-yellow-600 overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
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
                <th className="px-4 py-3" />
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
                  className="hover:bg-yellow-50/40 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/users/${u.uid}`)}
                >
                  <td className="px-4 py-3 text-xs font-semibold text-gray-400 w-10">{idx + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-gray-900">{u.lastName || u.name || '—'}</p>
                    {u.firstName && <p className="text-xs text-gray-400">{u.firstName}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap hidden sm:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs hidden sm:table-cell">
                    <span className="bg-blue-50 text-blue-900 font-semibold px-2 py-0.5 rounded-full text-[11px]">Lvl {u.currentLevel ?? 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.status === 'active'   ? 'bg-green-100 text-green-800' :
                      u.status === 'disabled' ? 'bg-gray-100 text-gray-600' :
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
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {u.status === 'disabled' ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u.uid)}
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

    </div>
  )
}