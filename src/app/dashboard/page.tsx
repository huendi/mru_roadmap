'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { getNextUnlockedLevel, getLevelProgress, LEVELS_DATA, LEVEL_REQUIREMENTS } from '@/lib/levels'
import { User, Level } from '@/types'
import Navbar from '@/components/Navbar'

const FORMS_CONFIG = {
  ca: {
    title: 'Certificate of Authority CA License Application Form',
    src: '/forms/Certificate-of-Authority-CA-License-Application-Form-Quick-Quide.pdf',
    file: 'Certificate-of-Authority-CA-License-Application-Form-Quick-Quide.pdf',
    iconColor: 'blue',
  },
  life: {
    title: 'Life CA Application Form',
    src: '/forms/LIFE-CA-APPLICATION-FORM.pdf',
    file: 'LIFE-CA-APPLICATION-FORM.pdf',
    iconColor: 'green',
  },
  vul: {
    title: 'VUL CA Application Form',
    src: '/forms/VUL-CA-APPLICATION-FORM.pdf',
    file: 'VUL-CA-APPLICATION-FORM.pdf',
    iconColor: 'purple',
  },
} as const

type FormKey = keyof typeof FORMS_CONFIG

// Level 2 has 3 review videos — each worth 33.33% of progress
const LEVEL2_VIDEO_REQUIREMENTS = ['watched_video_1', 'watched_video_2', 'watched_video_3']

function getLevel2Progress(requirements: string[]): number {
  const watched = LEVEL2_VIDEO_REQUIREMENTS.filter(r => requirements.includes(r)).length
  return Math.round((watched / LEVEL2_VIDEO_REQUIREMENTS.length) * 100)
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [levels, setLevels] = useState<Level[]>(LEVELS_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [level1Documents, setLevel1Documents] = useState(0)
  const [showFormModal, setShowFormModal] = useState<FormKey | null>(null)
  const [level3Progress, setLevel3Progress] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      if (userData) {
        if (userData.role === 'admin') {
          router.push('/admin')
          return
        }
        if (userData.status === 'pending') {
          router.push('/waiting-for-approval')
          return
        }
        if (userData.status === 'rejected') {
          setError('Your account has been rejected. Please contact support.')
          setLoading(false)
          return
        }
        if (userData.status === 'disabled') {
          setError('Your account has been disabled. Please contact admin.')
          setLoading(false)
          return
        }
        if (!userData.profileCompleted) {
          router.push('/complete-profile')
          return
        }
        setUser(userData)
        setLoading(false)
      } else {
        router.push('/auth')
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (user) {
      fetchLevel1Documents(user.uid)
      updateLevels(user)
    }
  }, [user])

  useEffect(() => {
    if (user) updateLevels(user)
  }, [level1Documents, user, level3Progress])

  useEffect(() => {
  if (!user) return
  const fetchLevel3Progress = async () => {
    try {
      const res = await fetch(`/api/user/level3-exams?uid=${user.uid}`)
      if (res.ok) {
        const data = await res.json()
        const exams: Array<{ passed: boolean; attempts: any[] }> = data.exams || []
        const pct = exams.reduce((sum, r) => {
          if (r.passed) return sum + 25
          if (r.attempts.length > 0) return sum + 12
          return sum
        }, 0)
        setLevel3Progress(pct)
      }
    } catch (e) {
      console.error('Failed to fetch level3 progress', e)
    }
  }
  fetchLevel3Progress()
}, [user])

  const fetchLevel1Documents = async (uid: string) => {
    try {
      const response = await fetch(`/api/user/documents?uid=${uid}`)
      if (response.ok) {
        const allDocuments = await response.json()
        const level1Docs = allDocuments.filter((doc: any) => doc.level === 1)
        setLevel1Documents(level1Docs.length)
      }
    } catch (error) {
      console.error('Error fetching Level 1 documents:', error)
    }
  }

  const updateLevels = (userData: User) => {
    const requirements = userData.requirementsCompleted || []

    const updatedLevels = LEVELS_DATA.map((level) => {
      const isUnlocked = level.id <= getNextUnlockedLevel(
        userData.currentLevel,
        requirements,
        level1Documents
      )

      let progress: number

      if (level.id === 1) {
        const introComplete = requirements.includes('read_intro')
        const introProgress = introComplete ? 50 : 0
        const docProgress = (Math.min(level1Documents, 7) / 7) * 50
        progress = Math.round(introProgress + docProgress)
      } else if (level.id === 2) {
        // ── Level 2: progress based on watched review videos ──
        progress = getLevel2Progress(requirements)
      } else if (level.id === 3) {
        // Level 3: fetch exam records to compute real progress
        // We use level3Progress state computed separately
        progress = level3Progress
      } else if (level.id === 3) {
        progress = level3Progress
      } else {
        progress = getLevelProgress(level.id, requirements)
      }

      const isCompleted = progress === 100 && level.id <= userData.currentLevel && isUnlocked
      return { ...level, isUnlocked, progress, isCompleted }
    })

    setLevels(updatedLevels)
  }

  const handleLevelClick = (level: Level) => {
    if (!level.isUnlocked) return
    router.push(`/level/${level.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center px-4">
        <div className="text-center bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">Please sign in to access your dashboard</p>
          <button
            onClick={() => router.push('/auth')}
            className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors w-full sm:w-auto"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const overallProgress = Math.round((user.currentLevel / 7) * 100)
  const fullName = user.name || user.displayName || user.email.split('@')[0]
  const activeForm = showFormModal ? FORMS_CONFIG[showFormModal] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">

          {/* ── Left Column (Welcome + Forms) ── */}
          <div className="w-full lg:w-[40%] flex flex-col gap-4 sm:gap-6">

            {/* Welcome / Progress card */}
            <div className="bg-blue-900 rounded-xl p-4 sm:p-6 text-white border-2 border-white-800">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2 break-words">
                  Welcome back, {fullName}!
                </h2>
                <p className="text-yellow-100 text-xs sm:text-sm mb-3 sm:mb-4">
                  Your Financial Advisor Journey Progress
                </p>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                  <div>
                    <p className="text-xs text-yellow-100">Current Level</p>
                    <p className="text-base sm:text-lg font-bold">{user.currentLevel} / 7</p>
                  </div>
                  <div>
                    <p className="text-xs text-yellow-100">Overall Progress</p>
                    <p className="text-base sm:text-lg font-bold">{overallProgress}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-yellow-100">Status</p>
                    <p className="text-base sm:text-lg font-bold">Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Downloadable Forms */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Downloadable Forms</h3>
              <div className="space-y-2 sm:space-y-3">

                <button
                  onClick={() => setShowFormModal('ca')}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-700 flex-1 leading-snug">
                    Certificate of Authority CA License Application Form
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-800 flex-shrink-0">View</span>
                </button>

                <button
                  onClick={() => setShowFormModal('life')}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-green-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-700 flex-1 leading-snug">Life CA Application Form</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-50 text-green-800 flex-shrink-0">View</span>
                </button>

                <button
                  onClick={() => setShowFormModal('vul')}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-700 flex-1 leading-snug">VUL CA Application Form</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-800 flex-shrink-0">View</span>
                </button>

              </div>
            </div>
          </div>

          {/* ── Right Column (All Levels) ── */}
          <div className="w-full lg:w-[60%]">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">All Levels</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {levels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => handleLevelClick(level)}
                    disabled={!level.isUnlocked}
                    className={`p-3 sm:p-4 rounded-lg text-left transition-colors ${
                      level.isUnlocked
                        ? level.isCompleted
                          ? 'bg-green-50 border-2 border-green-200 text-green-800 hover:bg-green-100'
                          : 'bg-blue-50 border-2 border-blue-200 text-blue-800 hover:bg-blue-100'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">Level {level.id}</p>
                        <p className="text-xs opacity-75 truncate">{level.title}</p>
                      </div>

                      {level.isUnlocked && level.progress !== undefined && (
                        <span className={`text-sm font-bold flex-shrink-0 ${
                          level.isCompleted ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {level.progress}%
                        </span>
                      )}

                      {!level.isUnlocked && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </div>

                    {level.isUnlocked && level.progress !== undefined && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all duration-300 ${
                            level.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${level.progress}%` }}
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Form Modal */}
      {activeForm && (
        <div
          className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowFormModal(null) }}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 w-full max-w-5xl flex flex-col p-4 sm:p-5"
            style={{ height: '90vh', maxHeight: '90vh' }}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4 flex-shrink-0">
              <p className="text-xs sm:text-sm font-medium text-gray-900 flex-1 pr-3 leading-snug">
                {activeForm.title}
              </p>
              <button
                onClick={() => setShowFormModal(null)}
                className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-lg overflow-hidden mb-3 sm:mb-4 border border-gray-200 flex-1">
              <iframe
                src={`${activeForm.src}#toolbar=1&navpanes=0`}
                className="w-full h-full"
                title={activeForm.title}
              />
            </div>

            <button
              onClick={() => {
                const link = document.createElement('a')
                link.href = activeForm.src
                link.download = activeForm.file
                link.click()
                setShowFormModal(null)
              }}
              className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}