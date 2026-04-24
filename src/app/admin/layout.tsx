'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChange, signOutUser } from '@/lib/auth'
import { User } from '@/types'
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'

declare global {
  interface Window {
    __setAdminPendingCount?: (n: number) => void
  }
}

type ActiveTab = 'overview' | 'users' | 'admins' | 'settings'

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!current || !next || !confirm) { setError('Please fill in all fields.'); return }
    if (next.length < 8)               { setError('New password must be at least 8 characters.'); return }
    if (next !== confirm)              { setError('New passwords do not match.'); return }

    setSaving(true)
    try {
      const auth = getAuth()
      const firebaseUser = auth.currentUser
      if (!firebaseUser || !firebaseUser.email) throw new Error('Not authenticated.')
      const credential = EmailAuthProvider.credential(firebaseUser.email, current)
      await reauthenticateWithCredential(firebaseUser, credential)
      await updatePassword(firebaseUser, next)
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 2000)
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential') {
        setError('This admin account is disabled.')
      } else if (e.code === 'auth/wrong-password') {
        setError('Current password is incorrect.')
      } else {
        setError(e.message || 'Failed to update password.')
      }
    } finally {
      setSaving(false)
    }
  }

  const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        {show
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
        }
      </svg>
    </button>
  )

  const Field = ({ label, value, onChange, show, onToggle, placeholder }: {
    label: string; value: string; onChange: (v: string) => void
    show: boolean; onToggle: () => void; placeholder?: string
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
        />
        <EyeToggle show={show} onToggle={onToggle} />
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Change Password</h2>
            <p className="text-xs text-gray-400 mt-0.5">Update your admin account password.</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none mt-0.5">✕</button>
        </div>
        <div className="border-t border-gray-100" />
        <div className="px-6 py-5 space-y-4">
          <Field label="Current Password"     value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent(p => !p)} placeholder="Enter current password" />
          <Field label="New Password"          value={next}    onChange={setNext}    show={showNext}    onToggle={() => setShowNext(p => !p)}    placeholder="Min. 8 characters" />
          <Field label="Confirm New Password"  value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(p => !p)} placeholder="Re-enter new password" />
          {error   && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Password updated successfully!</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || success} className="flex-1 py-2.5 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors">
            {saving
              ? <span className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />Saving...</span>
              : 'Update Password'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({ user, onChangePassword, onSignOut }: {
  user: User | null
  onChangePassword: () => void
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-blue-900">
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-xs font-semibold text-gray-800 truncate">{user?.email}</p>
          <p className="text-[10px] text-gray-400">Administrator</p>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
          <button
            onClick={() => { setOpen(false); onChangePassword() }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change Password
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)
const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a2 2 0 11-4 0 2 2 0 014 0zM7 16a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)
const IconAdmins = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)
const IconSettings = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

// ─── Admin Layout ─────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]                             = useState<User | null>(null)
  const [loading, setLoading]                       = useState(true)
  const [pendingCount, setPendingCount]             = useState(0)
  const [sidebarOpen, setSidebarOpen]               = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  const activeTab: ActiveTab =
    pathname.startsWith('/admin/users')    ? 'users'    :
    pathname.startsWith('/admin/admins')   ? 'admins'   :
    pathname.startsWith('/admin/settings') ? 'settings' : 'overview'

  useEffect(() => {
    const unsub = onAuthStateChange((userData) => {
      if (!userData) { router.push('/auth'); return }
      if (userData.role !== 'admin') { router.push('/dashboard'); return }
      setUser(userData)
      setLoading(false)
    })
    return unsub
  }, [router])

  useEffect(() => {
    window.__setAdminPendingCount = (n: number) => setPendingCount(n)
    return () => { delete window.__setAdminPendingCount }
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const handleSignOut = async () => {
    await signOutUser()
    router.push('/auth')
  }

  const TABS = [
    { key: 'overview' as ActiveTab, label: 'Dashboard', href: '/admin',          icon: <IconDashboard /> },
    { key: 'users'    as ActiveTab, label: 'Users',     href: '/admin/users',    icon: <IconUsers /> },
    { key: 'admins'   as ActiveTab, label: 'Admins',    href: '/admin/admins',   icon: <IconAdmins /> },
    { key: 'settings' as ActiveTab, label: 'Settings',  href: '/admin/settings', icon: <IconSettings /> },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">Loading...</div>
  )

  const profileSection = (
    <ProfileDropdown
      user={user}
      onChangePassword={() => setShowChangePassword(true)}
      onSignOut={handleSignOut}
    />
  )

  return (
    <div className="bg-gray-50 min-h-screen">

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed top-0 left-0 h-[100dvh] w-64 bg-white border-r border-gray-200
        flex flex-col z-30 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>

        {/* Logo */}
        <div className="p-5 border-b flex items-center gap-3 flex-shrink-0">
          <img src="/MRU logo.png" alt="MRU Logo" className="w-10 h-10 object-contain flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-blue-900">Admin Panel</h1>
            <p className="text-[10px] text-gray-500">MRU Roadmap</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close sidebar"
          >✕</button>
        </div>

        {/* Nav + Profile */}
        <div className="flex flex-col flex-1 min-h-0">

          {/* Nav items */}
          <nav className="p-3 space-y-1 flex-shrink-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => router.push(t.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                  activeTab === t.key
                    ? 'bg-blue-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={activeTab === t.key ? 'text-white' : 'text-gray-400'}>{t.icon}</span>
                {t.label}
                {t.key === 'overview' && pendingCount > 0 && (
                  <span className="ml-auto bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* ── Mobile: profile appears right below nav ── */}
          <div className="lg:hidden px-3 pb-3">
            <div className="border-t border-gray-100 pt-3">
              {profileSection}
            </div>
          </div>

          {/* Spacer — only on desktop, pushes profile to bottom */}
          <div className="hidden lg:block flex-1" />

          {/* ── Desktop: profile pinned to bottom ── */}
          <div className="hidden lg:block flex-shrink-0 border-t border-gray-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {profileSection}
          </div>

        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="lg:ml-64 flex flex-col h-screen overflow-hidden">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-blue-900 transition"
            aria-label="Open sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/MRU logo.png" alt="MRU Logo" className="w-7 h-7 object-contain" />
          <h1 className="text-sm font-bold text-blue-900">Admin Panel</h1>
          {pendingCount > 0 && (
            <span className="ml-auto bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </header>

        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>

    </div>
  )
}