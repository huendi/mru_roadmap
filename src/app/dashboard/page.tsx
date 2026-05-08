'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { authenticatedFetch } from '@/lib/api'
import { getNextUnlockedLevel, getLevelProgress, LEVELS_DATA, LEVEL_REQUIREMENTS } from '@/lib/levels'
import { User, Level } from '@/types'
import Navbar from '@/components/Navbar'

// Helper function to safely check if user has sufficient progress
const hasUserProgress = (user: User | null, minLevel: number): boolean => {
  return user ? user.currentLevel >= minLevel : false
}

// Level 2 has 3 steps: Training Guide (33.33%), SLTC Link (33.33%), Certificate Upload (33.34%)
function getLevel2Progress(requirements: string[], hasCertificate: boolean, certStatus?: string): number {
  const trainingGuideCompleted = requirements.includes('training_guide_completed')
  const sltcLinkClicked = requirements.includes('sltc_link_clicked')
  
  let progress = 0
  if (trainingGuideCompleted) progress += 33.33
  if (sltcLinkClicked) progress += 33.33
  if (hasCertificate) {
    progress += certStatus === 'approved' ? 33.34 : 16.67
  }
  
  return Math.round(progress)
}

// Level 2 has 3 review videos — each worth 33.33% of progress
const LEVEL3_VIDEO_REQUIREMENTS = ['watched_video_1', 'watched_video_2', 'watched_video_3']

function getLevel3Progress(requirements: string[]): number {
  const watched = LEVEL3_VIDEO_REQUIREMENTS.filter(r => requirements.includes(r)).length
  return Math.round((watched / LEVEL3_VIDEO_REQUIREMENTS.length) * 100)
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [levels, setLevels] = useState<Level[]>(LEVELS_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [level1Documents, setLevel1Documents] = useState(0)
  const [level4Progress, setLevel4Progress] = useState(0)
  const [level1TotalDocs, setLevel1TotalDocs] = useState(7)
  const [level1MinDocsToPass, setLevel1MinDocsToPass] = useState(4)
  const [level2Cert, setLevel2Cert] = useState<any | null>(null)
  const [level5Progress, setLevel5Progress] = useState<any | null>(null)
  const [level4ExamUpdate, setLevel4ExamUpdate] = useState<any | null>(null)
  const [notificationPolling, setNotificationPolling] = useState(false)
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [levelProgressLoaded, setLevelProgressLoaded] = useState(false)

  const fetchUnifiedLevelProgress = useCallback(async () => {
    if (!user) return
    try {
      const res = await authenticatedFetch('/api/user/level-progress')
      if (!res.ok) return
      const data = await res.json()

      if (typeof data?.level1?.docsCount === 'number') setLevel1Documents(data.level1.docsCount)
      if (typeof data?.level1?.totalDocs === 'number') setLevel1TotalDocs(data.level1.totalDocs)
      if (typeof data?.level1?.minDocsToPass === 'number') setLevel1MinDocsToPass(data.level1.minDocsToPass)
      if (typeof data?.level4?.progress === 'number') setLevel4Progress(data.level4.progress)
      if (data?.level2?.certificateStatus) {
        setLevel2Cert({ status: data.level2.certificateStatus, level: 2, type: 'certificate' })
      } else {
        setLevel2Cert(null)
      }
      if (data?.level5?.raw) setLevel5Progress(data.level5.raw)
      setLevelProgressLoaded(true)
    } catch (e) {
      console.error('Failed to fetch unified level progress', e)
    }
  }, [user])

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
      fetchUnifiedLevelProgress()
    }
  }, [user?.uid, fetchUnifiedLevelProgress])

  useEffect(() => {
    if (user) {
      console.log('🔍 updateLevels triggered:', {
        userCurrentLevel: user.currentLevel,
        userRequirements: user.requirementsCompleted,
        level1Documents,
        level4Progress,
        level2Cert,
        level5Progress
      })
      updateLevels(user, level1Documents, level1TotalDocs, level1MinDocsToPass, level2Cert)
    }
  }, [level4Progress, level2Cert, level5Progress, level1Documents, user?.currentLevel, user?.requirementsCompleted])

  // ── Real-time notification polling ───────────────────────────────────────────
const pollNotifications = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setNotificationPolling(true)
    try {
      await fetchUnifiedLevelProgress()

      const level4Res = await authenticatedFetch('/api/user/level4-exam-updates')
      if (level4Res.ok) {
        const level4Data = await level4Res.json()
        setLevel4ExamUpdate(level4Data)
      }

      const profileRes = await authenticatedFetch('/api/user/profile')
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setUser(prev => prev ? {
          ...prev,
          requirementsCompleted: profileData.user?.requirementsCompleted ?? prev.requirementsCompleted,
          currentLevel: profileData.user?.currentLevel ?? prev.currentLevel,
        } : prev)
      }
    } catch (e) {
      console.error('Failed to poll notifications:', e)
    } finally {
      setNotificationPolling(false)
    }
  }, [user, fetchUnifiedLevelProgress])

  // Start polling when user is loaded
  useEffect(() => {
    if (!user?.uid) return
    
    pollNotifications(false)
    notificationIntervalRef.current = setInterval(() => pollNotifications(true), 10_000)
    
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current)
      }
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user || levelProgressLoaded) return
    fetchUnifiedLevelProgress()
  }, [user?.uid, levelProgressLoaded, fetchUnifiedLevelProgress])

  const updateLevels = (userData: User, docCount?: number, totalDocs?: number, minDocsToPass?: number, level2Certificate?: any) => {
    // Preserve existing requirements if the user data is corrupted
    const existingRequirements = user?.requirementsCompleted || []
    const newRequirements = userData.requirementsCompleted || []
    const requirements = newRequirements.length > 0 ? newRequirements : existingRequirements
    
    const advisorType = userData.advisorType
    // Defensive: ensure we never lose the document count if it's already been fetched
    const count = docCount !== undefined ? docCount : level1Documents
    const total = totalDocs ?? level1TotalDocs
    const minPass = minDocsToPass ?? level1MinDocsToPass
    
    console.log('🔍 updateLevels requirements:', {
      existingRequirements,
      newRequirements,
      finalRequirements: requirements,
      level1Documents: count
    })

    // Pass 1: compute progress + isUnlocked only
    const levelsWithProgress = LEVELS_DATA.map((level) => {
      const RETURNEE_SKIP = [3, 4, 5]
      
      if (advisorType === 'returnee' && RETURNEE_SKIP.includes(level.id)) {
        return { ...level, isUnlocked: false, progress: 0, isCompleted: false, skipped: true }
      }

      // Special unlock logic for returnee advisors
      let isUnlocked = level.id <= getNextUnlockedLevel(
        userData.currentLevel,
        requirements,
        count,         
        advisorType,
        minPass,
        level5Progress
      )
      
      // For returnee advisors, if level 2 is completed, unlock level 6
      if (advisorType === 'returnee' && level.id === 6) {
        const level2Req = LEVEL_REQUIREMENTS[2] || []
        const level2Completed = level2Req.every(req => requirements.includes(req.id))
        const hasLevel2Cert = !!level2Certificate && level2Certificate.status === 'approved'
        if (level2Completed && hasLevel2Cert) {
          isUnlocked = true
        }
      }

      let progress: number

      if (level.id === 1) {
        progress = Math.round((Math.min(count, total) / total) * 100)
      } else if (level.id === 2) {
        let hasLevel2Cert = !!level2Certificate
        let certStatus = level2Certificate?.status
        if (!hasLevel2Cert && requirements.includes('sltc_link_clicked') && requirements.includes('training_guide_completed')) {
          hasLevel2Cert = true
          certStatus = 'approved'
        }
        progress = getLevel2Progress(requirements, hasLevel2Cert, certStatus)
      } else if (level.id === 3) {
        progress = getLevel3Progress(requirements)
      } else if (level.id === 4) {
        progress = typeof level4Progress === 'number' ? level4Progress : 0
      } else if (level.id === 5) {
        if (level5Progress) {
          const currentStep = level5Progress.currentStep || 0
          if (level5Progress.adminDecision === 'passed') {
            progress = 100
          } else if (level5Progress.receiptUploaded || currentStep >= 4) {
            progress = 75
          } else if (level5Progress.scheduleId || currentStep >= 3) {
            progress = 50
          } else if (level5Progress.examType || currentStep >= 2) {
            progress = 25
          } else if (currentStep >= 1) {
            progress = 10
          } else {
            progress = 0
          }
        } else {
          progress = 0
        }
      } else {
        progress = getLevelProgress(level.id, requirements)
      }

      progress = typeof progress === 'number' && !isNaN(progress) ? progress : 0

      return { ...level, isUnlocked, progress }
    })

    // Pass 2: now compute isCompleted — full levelsWithProgress is available
    const updatedLevels = levelsWithProgress.map((level) => {
      if ((level as any).skipped) return level  // returnee skipped levels, leave as-is

      const allPreviousCompleted = levelsWithProgress
        .filter((l: any) => l.id < level.id)
        .every((l: any) => l.progress === 100)

      // ✅ Level 1 is only truly complete when intro read + min docs uploaded (based on admin settings)
      // But progress is 100% based on documents only
      const isCompleted = level.id === 1
        ? requirements.includes('read_intro') && count >= minPass
        : level.progress === 100 && level.isUnlocked && allPreviousCompleted

      return { ...level, isCompleted }
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
                <p className="text-yellow-100 text-xs sm:text-sm mb-1">
                  Your Financial Advisor Journey Progress
                </p>
                {user?.advisorType && (
                  <span className={`inline-block mb-3 sm:mb-4 px-3 py-0.5 rounded-full text-xs font-semibold ${
                    user.advisorType === 'new'
                      ? 'bg-green-400/20 text-green-200 border border-green-400/40'
                      : 'bg-blue-400/20 text-blue-200 border border-blue-400/40'
                  }`}>
                    {user.advisorType === 'new' ? '🟢 New Financial Advisor' : '🔵 Returnee Financial Advisor'}
                  </span>
                )}
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

            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Notifications</h3>
                {notificationPolling && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Syncing...
                  </div>
                )}
              </div>
              <div className="space-y-3">
                
                {/* Level 2 Certificate Decision - show only final decision */}
                {hasUserProgress(user, 2) && level2Cert && (level2Cert?.status === 'approved' || level2Cert?.status === 'rejected') && (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        level2Cert?.status === 'approved' ? 'bg-green-50' :
                        level2Cert?.status === 'rejected' ? 'bg-red-50' : 'bg-blue-50'
                      }`}>
                        <svg className={`w-4 h-4 ${
                          level2Cert?.status === 'approved' ? 'text-green-700' :
                          level2Cert?.status === 'rejected' ? 'text-red-700' : 'text-blue-700'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">Level 2 Certificate</p>
                        <p className="text-xs text-gray-500">Certificate review decision</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${
                        level2Cert?.status === 'approved' ? 'text-green-700' :
                        level2Cert?.status === 'rejected' ? 'text-red-700' : 'text-blue-800'
                      }`}>
                        {level2Cert?.status === 'approved' ? 'Approved' :
                         level2Cert?.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                      <button
                        onClick={() => router.push('/level/2')}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                )}

                {/* Level 5 Exam Decision - show final decision and pending */}
                {hasUserProgress(user, 4) && level5Progress && (level5Progress.adminDecision === 'passed' || level5Progress.adminDecision === 'failed' || level5Progress.adminDecision === 'pending') && (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        level5Progress.adminDecision === 'passed' ? 'bg-green-50' :
                        level5Progress.adminDecision === 'failed' ? 'bg-red-50' :
                        level5Progress.adminDecision === 'pending' ? 'bg-blue-50' : 'bg-gray-50'
                      }`}>
                        <svg className={`w-4 h-4 ${
                          level5Progress.adminDecision === 'passed' ? 'text-green-700' :
                          level5Progress.adminDecision === 'failed' ? 'text-red-700' :
                          level5Progress.adminDecision === 'pending' ? 'text-blue-700' : 'text-gray-700'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">Level 5 Exam</p>
                        <p className="text-xs text-gray-500">
                          Licensure exam final result
                          {level5Progress.examScore && (
                            <span className="ml-1 font-medium">
                              - {level5Progress.examScore}%
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${
                        level5Progress.adminDecision === 'passed' ? 'text-green-700' :
                        level5Progress.adminDecision === 'failed' ? 'text-red-700' :
                        level5Progress.adminDecision === 'pending' ? 'text-blue-800' :
                        (level5Progress.currentStep && level5Progress.currentStep >= 1) ? 'text-orange-800' : 'text-gray-800'
                      }`}>
                        {level5Progress.adminDecision === 'passed' ? 'Passed' : 
                         level5Progress.adminDecision === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                      {level5Progress.examScore && level5Progress.adminDecision !== 'pending' && (
                        <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${
                          level5Progress.examScore >= 75 ? 'bg-green-100 text-green-800' :
                          level5Progress.examScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {level5Progress.examScore}%
                        </span>
                      )}
                      <button
                        onClick={() => router.push('/level/5')}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                )}

                {/* Level 4 Exam Update Notification - Only show if user is level 4+ and has exam updates */}
                {hasUserProgress(user, 4) && level4ExamUpdate && level4ExamUpdate.hasUpdate && (
                  <div className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-orange-100">
                        <svg className="w-4 h-4 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">Level 4 Exam Updated</p>
                        <p className="text-xs text-gray-500">New questions uploaded by admin</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-1 rounded flex-shrink-0 text-orange-800 bg-orange-100">
                        Reset Required
                      </span>
                      <button
                        onClick={() => router.push('/level/4')}
                        className="text-xs px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty state when no notifications */}
                {(!hasUserProgress(user, 2) || !level2Cert || (level2Cert.status !== 'approved' && level2Cert.status !== 'rejected')) &&
                 (!level5Progress || !hasUserProgress(user, 4) || (level5Progress.adminDecision !== 'passed' && level5Progress.adminDecision !== 'failed' && level5Progress.adminDecision !== 'pending')) &&
                 (!level4ExamUpdate || !level4ExamUpdate.hasUpdate) && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">No notifications</p>
                    <p className="text-xs text-gray-400 mt-1">Complete levels to see status updates here</p>
                  </div>
                )}

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
                        ? level.progress === 100
                          ? 'bg-blue-50 border-2 border-blue-200 text-blue-800 hover:bg-blue-100'
                          : 'bg-green-50 border-2 border-green-200 text-green-800 hover:bg-green-100'
                        : (level as any).skipped
                          ? 'bg-blue-50 border-2 border-blue-200 text-blue-600 cursor-not-allowed'
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
                          level.progress === 100 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {level.progress}%
                        </span>
                      )}

                      {/* Inside the level card button, replace the lock icon section */}
                      {!level.isUnlocked && (
                        (level as any).skipped ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-600 flex-shrink-0">
                            Skipped
                          </span>
                        ) : (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )
                      )}
                    </div>

                    {level.isUnlocked && level.progress !== undefined && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all duration-300 ${
                            level.progress === 100 ? 'bg-blue-500' : 'bg-green-500'
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

    </div>
  )
}