'use client'

import { useState, useEffect } from 'react'
import { getAllUsers, updateUserStatus } from '@/lib/auth'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createNewAdmin } from '@/lib/adminSetup'
import { User } from '@/types'

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

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Step = 'verify' | 'newadmin' | 'pin'

type PendingAction =
  | { type: 'toggle'; admin: User }
  | { type: 'delete'; admin: User }

// ─────────────────────────────────────────────────────────────
// Confirm Modal (matches user page style)
// ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  title: string
  description: string
  confirmLabel: string
  confirmClass: string
  onCancel: () => void
  onConfirm: () => void
}

function ConfirmModal({ title, description, confirmLabel, confirmClass, onCancel, onConfirm }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PIN Modal
// ─────────────────────────────────────────────────────────────
function PinModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCheck()}
          className="w-full border border-gray-200 p-3 text-center text-xl tracking-widest rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
          placeholder="••••••"
          autoFocus
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
// Add Admin Modal
// ─────────────────────────────────────────────────────────────
function AddAdminModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<Step>('verify')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [yourPassword, setYourPassword] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pin, setPin] = useState('')

  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const stepLabels = ['Verify', 'Details', 'PIN']
  const stepIndex = step === 'verify' ? 0 : step === 'newadmin' ? 1 : 2

  const verifyAdmin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL!
      await signInWithEmailAndPassword(auth, adminEmail, yourPassword)
      setStep('newadmin')
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('This admin account is disabled.')
      } else {
        setError('Wrong admin password.')
      }
    } finally {
      setLoading(false)
    }
  }

  const nextStep = (e: any) => {
    e.preventDefault()
    setError('')
    if (!email) return setError('Email is required')
    if (password !== confirm) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setStep('pin')
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      const users = await getAllUsers()
      if (users.some(u => u.email === email)) {
        setError('An account with this email already exists.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (!data.success) {
        setError('Wrong PIN.')
        setLoading(false)
        return
      }

      const result = await createNewAdmin(email, password, pin)
      if (!result.success) throw new Error(result.message)

      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Add Admin Account</h2>
            <p className="text-sm text-gray-500 mt-0.5">Step {stepIndex + 1} of 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                i < stepIndex ? 'bg-green-500 text-white' :
                i === stepIndex ? 'bg-blue-900 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < stepIndex ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === stepIndex ? 'text-blue-900' : 'text-gray-400'}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < stepIndex ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Step: Verify */}
        {step === 'verify' && (
          <form onSubmit={verifyAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Admin Password</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter your admin password"
                className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                onChange={e => setYourPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !yourPassword}
              className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        )}

        {/* Step: New Admin Details */}
        {step === 'newadmin' && (
          <form onSubmit={nextStep} autoComplete="off" className="space-y-4">
            {/* Hidden honeypot fields — tricks Chrome into filling these instead */}
            <input type="email" style={{ display: 'none' }} autoComplete="off" />
            <input type="password" style={{ display: 'none' }} autoComplete="off" />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
              <input
                type="email"
                autoComplete="new-password"
                placeholder="admin@example.com"
                className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 pr-16"
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className="w-full border border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 pr-16"
                  onChange={e => setConfirm(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('verify')}
                className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
              >
                Next
              </button>
            </div>
          </form>
        )}

        {/* Step: PIN */}
        {step === 'pin' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 text-center">Enter PIN to confirm creation</label>
              <input
                type="password"
                autoComplete="one-time-code"
                placeholder="••••••"
                className="w-full border border-gray-200 p-3 text-center text-xl tracking-widest rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                onChange={e => setPin(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('newadmin')}
                className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !pin}
                className="flex-1 bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showAdd, setShowAdd] = useState(false)

  // Unified pending action — PIN gate
  const [pending, setPending] = useState<PendingAction | null>(null)
  // After PIN is verified, run this
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 4000) }
  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  useEffect(() => {
    setCurrentUserEmail(auth.currentUser?.email ?? null)
    load()
  }, [])

  // Add this useEffect in the main AdminPage component
  useEffect(() => {
    if (pending || pendingCallback || showAdd) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [pending, pendingCallback, showAdd])

  const load = async () => {
    setLoading(true)
    try {
      const all = await getAllUsers()
      setAdmins(all.filter(u => u.role === 'admin'))
    } catch (e: any) {
      showError('Failed to load admins: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Toggle Status ────────────────────────────────────────────
  const doToggleStatus = async (admin: User) => {
    const isActive = admin.status === 'active' || !admin.status
    const newStatus = isActive ? 'disabled' : 'active'
    try {
      await updateUserStatus(admin.uid, newStatus as any)
      setAdmins(prev =>
        prev.map(a => a.uid === admin.uid ? { ...a, status: newStatus } : a)
      )
      showSuccess(`Admin ${newStatus === 'disabled' ? 'disabled' : 'enabled'} successfully.`)
    } catch (e: any) {
      showError('Failed to update status: ' + e.message)
    }
  }

  // ── Delete ───────────────────────────────────────────────────
  const doDeleteAdmin = async (admin: User) => {
    if (admin.email === currentUserEmail) {
      showError('You cannot delete your own account.')
      return
    }
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: admin.uid }),
      })

      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()

      // API returns { message: '...' } on success, { error: '...' } on failure
      if (!res.ok) throw new Error(data.error || 'Failed to delete admin')

      setAdmins(prev => prev.filter(a => a.uid !== admin.uid))
      showSuccess('Admin account permanently deleted.')
    } catch (e: any) {
      showError('Delete failed: ' + e.message)
    }
  }

  // ── Confirm modal config ─────────────────────────────────────
  const modalConfig = pending
    ? pending.type === 'toggle'
      ? {
          title: (pending.admin.status === 'active' || !pending.admin.status) ? 'Disable Admin?' : 'Enable Admin?',
          description: (pending.admin.status === 'active' || !pending.admin.status)
            ? `"${pending.admin.email}" will be disabled and lose access.`
            : `"${pending.admin.email}" will be re-enabled and regain access.`,
          confirmLabel: (pending.admin.status === 'active' || !pending.admin.status) ? 'Disable' : 'Enable',
          confirmClass: (pending.admin.status === 'active' || !pending.admin.status)
            ? 'bg-yellow-600 hover:bg-yellow-700'
            : 'bg-green-600 hover:bg-green-700',
        }
      : {
          title: 'Delete Admin Account?',
          description: `"${pending.admin.email}" will be permanently deleted from Firebase Auth and Firestore. This cannot be undone.`,
          confirmLabel: 'Delete Forever',
          confirmClass: 'bg-red-600 hover:bg-red-700',
        }
    : null

  // ── Filter ───────────────────────────────────────────────────
  const filteredAdmins = admins
    .filter(a =>
      !search ||
      (a.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.name || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.email === currentUserEmail) return -1
      if (b.email === currentUserEmail) return 1
      return (a.email || '').localeCompare(b.email || '')
    })

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-900 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading admins...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">

      {/* ── Confirm Modal ── */}
      {pending && modalConfig && (
        <ConfirmModal
          {...modalConfig}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            // After confirm click → open PIN gate
            const action = pending
            setPending(null)
            setPendingCallback(() => () => {
              if (action.type === 'toggle') doToggleStatus(action.admin)
              else doDeleteAdmin(action.admin)
            })
          }}
        />
      )}

      {/* ── PIN Modal ── */}
      {pendingCallback && (
        <PinModal
          onClose={() => setPendingCallback(null)}
          onSuccess={() => {
            pendingCallback()
            setPendingCallback(null)
          }}
        />
      )}

      {/* ── Add Admin Modal ── */}
      {showAdd && (
        <AddAdminModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { load(); showSuccess('New admin account created successfully.') }}
        />
      )}

      {/* ── Alerts ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Admin Accounts</h2>
          <p className="text-sm text-gray-500">{admins.length} admin{admins.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Admin
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          autoComplete="off"
          name="admin-search"  
          placeholder="Search by email or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border-2 border-blue-900 overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                    {search ? 'No admins match your search.' : 'No admin accounts found.'}
                  </td>
                </tr>
              ) : filteredAdmins.map((a, i) => {
                const isActive = a.status === 'active' || !a.status
                const isYou = a.email === currentUserEmail

                return (
                  <tr
                    key={a.uid}
                    className={`transition-colors ${
                      isYou
                        ? 'bg-yellow-50 hover:bg-yellow-100/50'
                        : !isActive
                          ? 'bg-gray-100/60 hover:bg-gray-200/50'
                          : 'hover:bg-blue-50/30'
                    }`}
                  >
                    <td className="px-4 py-3 text-xs font-semibold text-gray-400">{i + 1}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(a.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {a.email}
                            {isYou && (
                              <span className="ml-2 text-[10px] font-bold bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded-full">You</span>
                            )}
                          </p>
                          {a.name && <p className="text-xs text-gray-400">{a.name}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap hidden sm:table-cell">
                      {a.createdAt ? formatDate(a.createdAt) : '—'}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Disable / Enable */}
                        <button
                          onClick={() => setPending({ type: 'toggle', admin: a })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {isActive ? 'Disable' : 'Enable'}
                        </button>

                        {/* Delete — disabled for self */}
                        <button
                          onClick={() => {
                            if (isYou) {
                              showError('You cannot delete your own account.')
                              return
                            }
                            setPending({ type: 'delete', admin: a })
                          }}
                          disabled={isYou}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isYou
                              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}