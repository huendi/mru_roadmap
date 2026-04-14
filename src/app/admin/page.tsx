'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, updateUserStatus } from '@/lib/auth'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

const formatDate = (date: any): string => {
  if (!date) return 'N/A'
  let d: Date
  if (typeof date === 'string') d = new Date(date)
  else if (date?.toDate) d = date.toDate()
  else d = date as Date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      const pending = allUsers.filter(u => u.status === 'pending').length
      // @ts-ignore
      if (window.__setAdminPendingCount) window.__setAdminPendingCount(pending)
    } catch (e: any) {
      setError('Failed to load users: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (uid: string, newStatus: any) => {
    try {
      await updateUserStatus(uid, newStatus)
      const updated = users.map(u => u.uid === uid ? { ...u, status: newStatus } : u)
      setUsers(updated)
      setSuccess(`User ${newStatus} successfully`)
      setTimeout(() => setSuccess(''), 3000)
      const pending = updated.filter(u => u.status === 'pending').length
      // @ts-ignore
      if (window.__setAdminPendingCount) window.__setAdminPendingCount(pending)
    } catch (e: any) {
      setError('Failed: ' + e.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  const nonAdminUsers = users.filter(u => u.role !== 'admin')
  const pendingUsers  = users.filter(u => u.status === 'pending')

  return (
    <div className="h-screen overflow-hidden bg-black-100">
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 h-full flex flex-col">

        {/* Alerts */}
        {error   && <div className="mb-4 bg-red-50   border border-red-200   text-red-700   px-4 py-3 rounded-lg text-sm flex-shrink-0">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex-shrink-0">{success}</div>}

        {/* Two-column layout — fills remaining height */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 min-h-0">

          {/* ── Left 40% — Overview ── */}
          <div className="w-full lg:w-[40%] flex flex-col gap-4 sm:gap-6 flex-shrink-0">

            {/* Welcome card */}
            <div className="bg-blue-900 rounded-xl p-4 sm:p-6 text-white">
              <h2 className="text-lg sm:text-xl font-bold mb-1">Admin Dashboard</h2>
              <p className="text-blue-200 text-xs sm:text-sm">Manage users and monitor platform activity.</p>
            </div>

            {/* Stats grid */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-black-200">
              <h3 className="text-sm font-bold text-black-900 mb-3">Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Users', value: nonAdminUsers.length,                              color: 'text-blue-900' },
                  { label: 'Active',      value: users.filter(u => u.status === 'active').length,   color: 'text-green-600' },
                  { label: 'Pending',     value: pendingUsers.length,                               color: 'text-yellow-600' },
                  { label: 'Rejected',    value: users.filter(u => u.status === 'rejected').length, color: 'text-red-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl p-4 text-center border-2 border-yellow-600">
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-black-500 font-medium mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right 60% — Pending Approvals — fills full height ── */}
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

              {/* Rows — scrollable, fills remaining space */}
              <div className="overflow-y-auto flex-1">
                {pendingUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-black-400">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="text-sm font-medium">No pending approvals</p>
                    <p className="text-xs mt-1">All users have been reviewed</p>
                  </div>
                ) : pendingUsers.map((u, idx) => (
                  <div
                    key={u.uid}
                    className="grid grid-cols-[32px_1fr_auto] sm:grid-cols-[32px_2fr_1.5fr_1fr_auto] gap-2 items-center px-5 py-3 hover:bg-yellow-50/40 transition-colors border-b border-black-100 last:border-b-0"
                  >
                    {/* # */}
                    <p className="text-xs font-semibold text-black-400 text-left">{idx + 1}</p>

                    {/* Name: Last, First, Middle */}
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-semibold text-black-900 truncate">
                        {u.lastName || '—'}
                        {u.firstName ? `, ${u.firstName}` : ''}
                        {u.middleName ? ` ${u.middleName}` : ''}
                      </p>
                      {/* Show email below name on mobile */}
                      <p className="text-xs text-black-400 truncate sm:hidden">{u.email}</p>
                    </div>

                    {/* Email — hidden on mobile */}
                    <div className="hidden sm:block min-w-0 text-left">
                      <p className="text-xs text-black-500 truncate">{u.email}</p>
                    </div>

                    {/* Join date — hidden on mobile */}
                    <div className="hidden sm:block text-left">
                      <p className="text-xs text-black-400 whitespace-nowrap">{formatDate(u.createdAt)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleStatusChange(u.uid, 'active')}
                        title="Approve"
                        className="py-1.5 px-3 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-bold transition-colors"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleStatusChange(u.uid, 'rejected')}
                        title="Reject"
                        className="py-1.5 px-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold transition-colors"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}