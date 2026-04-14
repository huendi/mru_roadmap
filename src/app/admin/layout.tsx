'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChange, signOutUser } from '@/lib/auth'
import { User } from '@/types'

declare global {
  interface Window {
    __setAdminPendingCount?: (n: number) => void
  }
}

type ActiveTab = 'overview' | 'users' | 'settings'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeTab: ActiveTab =
    pathname.startsWith('/admin/users')    ? 'users' :
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
    // @ts-ignore
    window.__setAdminPendingCount = (n: number) => setPendingCount(n)
    return () => { /* @ts-ignore */ delete window.__setAdminPendingCount }
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    await signOutUser()
    router.push('/auth')
  }


  const TABS = [
    { key: 'overview' as ActiveTab, label: 'Overview',  href: '/admin',          icon: '📊' },
    { key: 'users'    as ActiveTab, label: 'Users',     href: '/admin/users',    icon: '👥' },
    { key: 'settings' as ActiveTab, label: 'Settings',  href: '/admin/settings', icon: '⚙️' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      Loading...
    </div>
  )

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200
        flex flex-col z-30 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>

        {/* Logo + Title */}
        <div className="p-5 border-b flex items-center gap-3">
          <img
            src="/MRU logo.png"
            alt="MRU Logo"
            className="w-10 h-10 object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-blue-900">Admin Panel</h1>
            <p className="text-[10px] text-gray-500">MRU Roadmap</p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
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
              <span>{t.icon}</span>
              {t.label}
              {t.key === 'overview' && pendingCount > 0 && (
                <span className="ml-auto bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom user */}
        <div className="p-4 border-t">
          <p className="text-sm font-medium text-gray-800 truncate">{user?.email}</p>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full text-sm text-red-600 hover:underline text-left"
          >
            Logout
          </button>
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
            {/* Hamburger icon */}
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

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>

    </div>
  )
}