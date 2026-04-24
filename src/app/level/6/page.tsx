'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

export default function Level6Page() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      if (!userData) { router.push('/auth'); return }
      // Allow access for both new advisors (completed level 5) and returnees (completed level 2)
      const canAccess = userData.currentLevel >= 6 || 
                      (userData.advisorType === 'returnee' && userData.currentLevel >= 2)
      if (!canAccess) { router.push('/dashboard'); return }
      setUser(userData)
      setLoading(false)
    })
    return unsubscribe
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Level 6...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
      <Navbar />
      
      <main className="w-[90%] mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Level 6 – Submit CA Forms & Requirements</h1>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 font-medium">🔧 This level is currently under maintenance</p>
                <p className="text-yellow-700 text-sm mt-1">We're working to bring you the best experience. Please check back soon!</p>
              </div>
              <p className="text-gray-600 mb-8">Content coming soon...</p>
              
              <div className="bg-gray-100 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">What to Expect</h2>
                <ul className="text-left text-gray-600 space-y-2 max-w-md mx-auto">
                  <li>• Submit CA application forms</li>
                  <li>• Upload licensing fee proof</li>
                  <li>• Complete rookie training requirements</li>
                  <li>• Submit caddying documentation</li>
                </ul>
              </div>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}