'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

// ── Video settings loaded dynamically from Firestore ─────────────────────────
const REQUIREMENT_IDS: Record<string, string> = {
  v1: 'watched_video_1',
  v2: 'watched_video_2',
  v3: 'watched_video_3',
  v4: 'watched_video_4',
  v5: 'watched_video_5',
  v6: 'watched_video_6',
}

interface VideoSettings {
  videos: { id: string; title: string; date: string; embedUrl: string }[]
  formColumns: { label: string; value: string; isPassword?: boolean }[]
}

// ── YouTube URL converter ───────────────────────────────────────────────────────
function convertToEmbedUrl(url: string): string {
  if (!url) return url
  
  // Handle YouTube URLs
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/
  const match = url.match(youtubeRegex)
  
  if (match) {
    const videoId = match[1]
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autohide=1&showinfo=0&controls=1`
  }
  
  return url
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ value, variant = 'yellow' }: { value: string; variant?: 'yellow' | 'gray' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const base = 'flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-all flex-shrink-0'
  const idle = variant === 'yellow'
    ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
  return (
    <button onClick={handleCopy} className={`${base} ${copied ? 'bg-green-500 text-white' : idle}`}>
      {copied ? (
        <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
      ) : (
        <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
      )}
    </button>
  )
}

export default function Level2Page() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [watchedVideos, setWatchedVideos] = useState<string[]>([])

  const [settings, setSettings] = useState<VideoSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [modalState, setModalState] = useState<'closed' | 'player'>('closed')
  const [activeVideo, setActiveVideo] = useState<{ id: string; title: string; date: string; embedUrl: string } | null>(null)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (userData) => {
      if (!userData) { router.push('/auth'); return }
      if (userData.status === 'pending') { router.push('/waiting-for-approval'); return }
      if (userData.status === 'rejected') {
        setError('Your account has been rejected. Please contact support.')
        setLoading(false)
        return
      }
      if (!userData.profileCompleted) { router.push('/complete-profile'); return }

      try {
        const res = await fetch(`/api/user/documents?uid=${userData.uid}`)
        if (res.ok) {
          const allDocs = await res.json()
          const level1Docs = allDocs.filter((doc: any) => doc.level === 1)
          const requirements = userData.requirementsCompleted || []
          const introRead = requirements.includes('read_intro')
          if (!introRead || level1Docs.length < 3) { router.push('/dashboard'); return }

          // Load watched videos from DB requirements (source of truth for dashboard)
          const watchedFromDB = Object.entries(REQUIREMENT_IDS)
            .filter(([, reqId]) => requirements.includes(reqId))
            .map(([videoId]) => videoId)
          setWatchedVideos(watchedFromDB)
        } else {
          router.push('/dashboard'); return
        }
      } catch {
        router.push('/dashboard'); return
      }

      setUser(userData)
      setLoading(false)
    })
    return unsubscribe
  }, [router])

  // Fetch Level 3 settings from Firestore via API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/level3-settings')
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
        }
      } catch (err) {
        console.error('Failed to fetch level2 settings:', err)
      } finally {
        setSettingsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Save a watched video to DB requirements so dashboard progress reflects it
  const markRequirementComplete = async (requirementId: string) => {
    if (!user) return
    try {
      await fetch('/api/user/requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, requirementId }),
      })
      setUser(prev => prev ? {
        ...prev,
        requirementsCompleted: [...(prev.requirementsCompleted || []), requirementId],
      } : prev)
    } catch (err) {
      console.error('Failed to mark requirement:', err)
    }
  }

  const markVideoWatched = async (video: { id: string; title: string; date: string; embedUrl: string }) => {
    if (!user) return
    const alreadyWatched = watchedVideos.includes(video.id)
    if (!alreadyWatched) {
      const updated = [...watchedVideos, video.id]
      setWatchedVideos(updated)
      // Persist to DB so dashboard can compute progress
      const requirementId = REQUIREMENT_IDS[video.id]
      if (requirementId) await markRequirementComplete(requirementId)
    }
  }

  const handleWatchVideo = async (video: { id: string; title: string; date: string; embedUrl: string }) => {
    await markVideoWatched(video)
    setActiveVideo(video)
    setModalState('player')
  }

  const handleNextLevel = async () => {
    if (!canProceedToNext) return
    // Update user level to 4 if not already
    if (user && user.currentLevel < 4) {
      try {
        await fetch('/api/user/level', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, level: 4 }),
        })
      } catch (err) {
        setError('Failed to update level. Please try again.')
        return
      }
    }
    router.push('/level/4')
  }

  const closeModal = () => { setModalState('closed'); setActiveVideo(null) }

  const reviewVideos = settings?.videos ?? []
  const watchedCount = reviewVideos.filter(v => watchedVideos.includes(v.id)).length
  const allWatched = reviewVideos.length > 0 && watchedCount === reviewVideos.length
  // Overall progress: each video = 33.33%, rounded
  const progressPct = reviewVideos.length > 0 ? Math.round((watchedCount / reviewVideos.length) * 100) : 0
  const canProceedToNext = allWatched

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Level 3...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
      <Navbar />

      {/* ══════════════════════════════════════════════
          VIDEO MODAL
      ══════════════════════════════════════════════ */}
      {modalState === 'player' && activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-950 border-b border-gray-800">
              <div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">Level 3 · Review Video</p>
                <p className="text-sm font-semibold text-white">{activeVideo.title}</p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Credential strip */}
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex flex-wrap gap-x-5 gap-y-1 items-center">
              {(settings?.formColumns ?? []).map((column) => (
                <span key={column.label} className="text-[11px] text-gray-400">
                  <span className="text-gray-300 font-semibold">{column.label}: </span>
                  <span className="font-mono text-gray-200 select-all">{column.value}</span>
                </span>
              ))}
            </div>

            {/* Video iframe */}
            <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={convertToEmbedUrl(activeVideo.embedUrl)}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                title={activeVideo.title}
              />
            </div>

            {/* Fallback link */}
            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Video not playing? Try opening directly:</p>
              <a
                href={activeVideo.embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit Video Link
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          PAGE BODY
      ══════════════════════════════════════════════ */}
      <main className="w-[90%] mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 justify-center w-full max-w-7xl mx-auto">

          {/* ── Left Panel (30%) ── */}
          <div className="lg:w-[30%] w-full">

            {/* Dashboard + Next Level buttons — exactly like Level 1 */}
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={handleNextLevel}
                disabled={!canProceedToNext}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                  canProceedToNext
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next Level
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Level 3 – Reviewer</h2>
              <p className="text-sm text-gray-500 mb-5">
                Watch all review videos to prepare for the mock exam in Level 3.
              </p>

              {/* ── Progress Summary (mirrors Level 1 style) ── */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Videos Watched: {watchedCount}/{reviewVideos.length}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Overall Progress:</span>
                    <span className={`text-sm font-bold ${allWatched ? 'text-green-600' : 'text-blue-600'}`}>
                      {progressPct}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${allWatched ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Next Level Eligibility:</span>
                  <span className={`text-sm font-medium ${canProceedToNext ? 'text-green-600' : 'text-orange-600'}`}>
                    {canProceedToNext
                      ? '✓ Ready'
                      : `${reviewVideos.length - watchedCount} more video${reviewVideos.length - watchedCount !== 1 ? 's' : ''} needed`
                    }
                  </span>
                </div>
              </div>

              {/* Study Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h4 className="text-xs font-semibold text-blue-900 mb-1">📌 Study Tips</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Watch each video in order</li>
                  <li>• Take notes while watching</li>
                  <li>• Re-watch topics you find difficult</li>
                  <li>• Complete all videos before Level 3</li>
                </ul>
              </div>

              {allWatched && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-800">✅ All videos watched! You're ready for Level 3.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel (60%) ── */}
          <div className="lg:w-[60%] w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Review Videos</h2>
                <span className="text-sm text-gray-500">{reviewVideos.length} videos</span>
              </div>

              <div className="space-y-3">
                {reviewVideos.map((video, index) => {
                  const isWatched = watchedVideos.includes(video.id)
                  return (
                    <div
                      key={video.id}
                      className={`border rounded-lg p-4 transition-all ${
                        isWatched ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isWatched ? 'bg-green-200' : 'bg-blue-100'
                        }`}>
                          {isWatched ? (
                            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-gray-400">Video {index + 1}</span>
                            {isWatched && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Watched</span>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">{video.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{video.date}</p>
                        </div>

                        <button
                          onClick={() => handleWatchVideo(video)}
                          className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                            isWatched
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          {isWatched ? 'Rewatch' : 'Watch'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}