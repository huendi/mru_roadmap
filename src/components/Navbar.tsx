'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChange, signOutUser } from '@/lib/auth'
import { User } from '@/types'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      if (!userData) {
        setUser(null)
        setLoading(false)
        return
      }
      setUser(userData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOutUser()
      setUser(null)
      setShowDropdown(false)
      router.push('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (pathname === '/auth') return null

  if (loading) {
    return (
      <nav className="bg-white shadow-md border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  if (!user) return null

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname.startsWith('/level/')) return `Level ${pathname.split('/')[2]}`
    if (pathname === '/profile') return 'Settings'
    return 'MRU Roadmap'
  }

  const fullName = user.displayName || user.name || user.email?.split('@')[0] || 'User'
  const avatarLetter = fullName.charAt(0).toUpperCase()

  return (
    <>
      <nav className="bg-white shadow-md border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Left Side — Logo only on mobile, Logo + page name on sm+ */}
            <div className="flex items-center space-x-3">
              <img
                src="/MRU logo.png"
                alt="MRU Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
              />
              {/* Page title: hidden on mobile, visible on sm+ */}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">MRU Roadmap</h1>
                <p className="text-xs text-gray-600">{getPageTitle()}</p>
              </div>
              {/* On mobile: show only the page title (no "MRU Roadmap" text) */}
              <div className="block sm:hidden">
                <p className="text-sm font-semibold text-gray-800">{getPageTitle()}</p>
              </div>
            </div>

            {/* Right Side — Avatar only on mobile, Avatar + name on sm+ */}
            <div className="flex items-center">
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 rounded-lg hover:bg-gray-100 p-2 transition-colors"
                >
                  {/* Avatar — always visible */}
                  <div className="h-8 w-8 rounded-full bg-yellow-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.photoURL || user.profileImage ? (
                      <img
                        className="h-8 w-8 rounded-full object-cover"
                        src={user.photoURL || user.profileImage}
                        alt={fullName}
                      />
                    ) : (
                      <span className="text-white font-medium text-sm">{avatarLetter}</span>
                    )}
                  </div>

                  {/* Name — hidden on mobile, visible on sm+ */}
                  <span className="hidden sm:block font-medium text-gray-900 text-sm">{fullName}</span>

                  {/* Dropdown arrow — hidden on mobile, visible on sm+ */}
                  <svg
                    className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        router.push('/profile')
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </button>

                    <div className="border-t border-gray-200 my-1"></div>

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </nav>

      <div className="h-16"></div>
    </>
  )
}