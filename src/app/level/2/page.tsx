'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Level2Settings {
  trainingUrl: string
  trainingTitle: string
  trainingDescription: string
  instructionSlides: { url: string; caption?: string }[]
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' | null }) {
  if (!status) return null
  const map = {
    pending:  { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500', label: 'Pending Review' },
    approved: { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500',  label: 'Approved' },
    rejected: { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500',    label: 'Rejected' },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Instruction Slideshow ─────────────────────────────────────────────────────
function InstructionSlideshow({ slides, onSlideChange, onLastSlideReached }: { 
  slides: { url: string; caption?: string }[] 
  onSlideChange?: (index: number) => void
  onLastSlideReached?: () => void
}) {
  const [current, setCurrent] = useState(0)
  const [fading, setFading]   = useState(false)

  if (!slides || slides.length === 0) return null

  const goTo = (idx: number) => {
    if (fading) return
    setFading(true)
    setTimeout(() => { 
      setCurrent(idx)
      setFading(false)
      onSlideChange?.(idx)
      // Check if this is the last slide
      if (idx === slides.length - 1) {
        onLastSlideReached?.()
      }
    }, 180)
  }
  const prev = () => goTo((current - 1 + slides.length) % slides.length)
  const next = () => goTo((current + 1) % slides.length)

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">📋 How to Complete the Training</h3>
          <p className="text-xs text-gray-400 mt-0.5">Follow these steps to finish the course</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
          {current + 1} / {slides.length}
        </span>
      </div>

      {/* Image */}
      <div className="relative bg-gray-50 flex items-center justify-center" style={{ minHeight: 260 }}>
        <img
          src={slides[current].url}
          alt={slides[current].caption || `Step ${current + 1}`}
          className={`w-full object-contain max-h-80 transition-opacity duration-200 ${fading ? 'opacity-0' : 'opacity-100'}`}
        />
        {slides.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white shadow rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white shadow rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Caption */}
      {slides[current].caption && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-sm text-gray-600 text-center">{slides[current].caption}</p>
        </div>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 py-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-200 ${i === current ? 'w-5 h-2 bg-blue-600' : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Level2Page() {
  const router = useRouter()
  const [user, setUser]                       = useState<User | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState('')
  const [settings, setSettings]               = useState<Level2Settings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  const [certDoc, setCertDoc]             = useState<any | null>(null)
  const [certStatus, setCertStatus]       = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [preview, setPreview]             = useState<string | null>(null)
  const [uploading, setUploading]         = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [dragOver, setDragOver]           = useState(false)
  const fileInputRef                      = useRef<HTMLInputElement>(null)

  // Progress tracking states
  const [trainingGuideCompleted, setTrainingGuideCompleted] = useState(false)
  const [sltcLinkClicked, setSltcLinkClicked] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Helper functions to save progress
  const saveProgressRequirement = async (requirement: string) => {
    if (!user) return
    try {
      await fetch('/api/user/requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, requirementId: requirement }),
      })
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }

  // ── Auth + gate check ──────────────────────────────────────────────────────
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
          if (!requirements.includes('read_intro') || level1Docs.length < 3) {
            router.push('/dashboard'); return
          }
          const existingCert = allDocs.find((doc: any) => doc.level === 2)
          if (existingCert) {
            setCertDoc(existingCert)
            setCertStatus(existingCert.status ?? 'pending')
          }
          // Load existing progress state
          setTrainingGuideCompleted(requirements.includes('training_guide_completed'))
          setSltcLinkClicked(requirements.includes('sltc_link_clicked'))
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

  // ── Fetch settings ─────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/level2-settings')
        if (res.ok) setSettings(await res.json())
      } catch (err) {
        console.error('Failed to fetch level2 settings:', err)
      } finally {
        setSettingsLoading(false)
      }
    })()
  }, [])

  // ── File helpers ───────────────────────────────────────────────────────────
  const processFile = (file: File) => {
    setSelectedFile(file)
    setUploadSuccess(false)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile || !user) return
    setUploading(true)
    setError('')
    try {
      // Step 1: Upload to Cloudinary (client-side, same pattern as Level 1)
      const secureUrl = await uploadToCloudinary(
        selectedFile,
        'mru-roadmap',
        user.uid,
        (user as any).displayName || (user as any).email || undefined,
        'certificate'
      )

      // Step 2: Build certificate doc entry
      const newCertEntry = {
        url: secureUrl,
        type: 'certificate',
        level: 2,
        status: 'pending',
        fileName: selectedFile.name,
        uploadedAt: new Date().toISOString(),
      }

      // Step 3: Save to Firestore — send only the new cert as a single-item array.
      // The POST route merges with existing docs (filtering level !== 1),
      // so we DELETE the old level 2 cert first to avoid duplicates, then POST.
      await fetch('/api/user/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, type: 'certificate', level: 2 }),
      })

      const saveRes = await fetch('/api/user/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, documents: [newCertEntry] }),
      })
      if (!saveRes.ok) throw new Error((await saveRes.json()).error || 'Failed to save document')

      // Step 4: Update local state
      setCertDoc(newCertEntry)
      setCertStatus('pending')
      setSelectedFile(null)
      setPreview(null)
      setUploadSuccess(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setError(err.message || 'Failed to upload. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // ── Next level ─────────────────────────────────────────────────────────────
  const handleNextLevel = async () => {
    if (!canProceedToNext || !user) return
    
    // Determine next level based on advisor type
    const nextLevel = user.advisorType === 'returnee' ? 6 : 3
    
    if (user.currentLevel < nextLevel) {
      try {
        await fetch('/api/user/level', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, level: nextLevel }),
        })
      } catch {
        setError('Failed to update level. Please try again.')
        return
      }
    }
    router.push(`/level/${nextLevel}`)
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const canProceedToNext = certStatus === 'approved'
  const hasCert    = !!certDoc
  const isApproved = certStatus === 'approved'
  const isPending  = certStatus === 'pending'
  const isRejected = certStatus === 'rejected'

  // Calculate progress based on 3 steps
  const step1Progress = trainingGuideCompleted ? 33.33 : 0
  const step2Progress = sltcLinkClicked ? 33.33 : 0
  const step3Progress = hasCert ? (isApproved ? 33.34 : 16.67) : 0
  const progressPct = step1Progress + step2Progress + step3Progress

  const slides = settings?.instructionSlides ?? []

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Level 2...</p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
      <Navbar />

      <main className="w-[90%] mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 justify-center w-full max-w-7xl mx-auto">

          {/* ══ LEFT — sticky progress sidebar ══ */}
          <div className="lg:w-[30%] w-full">

            {/* Nav buttons */}
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={handleNextLevel}
                disabled={!canProceedToNext}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                  canProceedToNext ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next Level
              </button>
            </div>

            <div className="lg:sticky lg:top-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Level 2 – Training Course</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Complete the Sun Life training and upload your certificate to unlock {user?.advisorType === 'returnee' ? 'Level 6' : 'Level 3'}.
                </p>

                {/* Progress bar */}
                <div className="bg-gray-50 rounded-lg p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-semibold text-blue-600">{progressPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        progressPct === 100 ? 'bg-green-500' : progressPct >= 66.66 ? 'bg-blue-500' : progressPct >= 33.33 ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Status:</span>
                    <span className={`text-xs font-semibold ${
                      canProceedToNext ? 'text-green-600' : 
                      progressPct >= 83.33 ? 'text-yellow-600' :
                      progressPct >= 66.66 ? 'text-blue-600' :
                      progressPct >= 33.33 ? 'text-orange-500' :
                      'text-gray-500'
                    }`}>
                      {canProceedToNext ? `✓ Ready for Level ${user?.advisorType === 'returnee' ? '6' : '3'}`
                        : progressPct >= 83.33 ? '⏳ Pending approval'
                        : progressPct >= 66.66 ? '📄 Upload certificate'
                        : progressPct >= 33.33 ? '🔗 Click SLTC link'
                        : '📖 View training guide'}
                    </span>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2.5">
                  {[
                    { n: 1, done: trainingGuideCompleted, title: 'Training Guide',  desc: 'View all training guide pictures.' },
                    { n: 2, done: sltcLinkClicked, title: 'SLTC Training',    desc: 'Click the SLTC training link.' },
                    { n: 3, done: isApproved, title: 'Certificate Upload', desc: 'Upload certificate and get admin approval.' },
                  ].map((step) => (
                    <div key={step.n} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${step.done ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${step.done ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {step.done ? '✓' : step.n}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{step.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status banners */}
                {!hasCert && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tips</p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Complete all modules in the training course</li>
                      <li>• Download your certificate after finishing</li>
                      <li>• Make sure your full name is visible</li>
                    </ul>
                  </div>
                )}
                {isPending && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-800">⏳ Certificate under review</p>
                    <p className="text-xs text-yellow-700 mt-1">Please wait while an admin verifies your certificate.</p>
                  </div>
                )}
                {isRejected && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-800">❌ Certificate was rejected</p>
                    <p className="text-xs text-red-700 mt-1">{certDoc?.rejectionReason || 'Please upload the correct Sun Life training certificate.'}</p>
                  </div>
                )}
                {isApproved && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-800">✅ Approved! You're ready for Level {user?.advisorType === 'returnee' ? '6' : '3'}.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ RIGHT — scrollable content ══ */}
          <div className="lg:w-[60%] w-full space-y-6">

            {/* 1. Instruction slideshow — always shown, blank placeholder if no slides */}
            {slides.length > 0
              ? <InstructionSlideshow 
                  slides={slides} 
                  onSlideChange={setCurrentSlideIndex}
                  onLastSlideReached={() => {
                    setTrainingGuideCompleted(true)
                    saveProgressRequirement('training_guide_completed')
                  }}
                />
              : (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">📋 How to Complete the Training</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Step-by-step photo guide</p>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gray-50 py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Instruction slides coming soon</p>
                    <p className="text-xs text-gray-400 mt-1">Your admin will add step-by-step guide photos here.</p>
                  </div>
                </div>
              )
            }

            {/* 2. Training course link — compact inline style */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Training Course</p>
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z"/>
                  </svg>
                </div>
                {/* Title + URL */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    {settings?.trainingTitle || 'Sun Life Financial Advisor Training'}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5 font-mono">
                    {settings?.trainingUrl
                      ? new URL(settings.trainingUrl).hostname
                      : 'sunlife.csod.com'}
                  </p>
                </div>
                {/* Compact open button */}
                <a
                  href={
                    settings?.trainingUrl ||
                    'https://sunlife.csod.com/login/render.aspx?id=defaultclp&fbclid=IwY2xjawRFGaBleHRuA2FlbQIxMQBzcnRjBmFwcF9pZAEwAAEeHiAGcogpKoQksnPYD316jVKJOWEDYKe1vaDABm0LI3zVGSOhILvmx8_m9Og_aem_-OwywtKFmbUN-kS29WJrOg'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setSltcLinkClicked(true)
                    saveProgressRequirement('sltc_link_clicked')
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors text-xs shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open
                </a>
              </div>
            </div>

            {/* 3. Certificate upload */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-gray-900">Upload Your Certificate</h3>
                {certStatus && <StatusBadge status={certStatus} />}
              </div>
              <p className="text-sm text-gray-500 mb-5">
                After completing the training, upload your Sun Life certificate here for admin verification.
              </p>

              {/* Existing cert preview */}
              {hasCert && certDoc?.url && !selectedFile && (
                <div className="mb-5 border border-gray-200 rounded-lg overflow-hidden">
                  <div className={`px-4 py-2 flex items-center justify-between text-xs font-semibold border-b ${
                    isApproved ? 'bg-green-50 text-green-700 border-green-200'
                    : isPending ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    <span>
                      {isApproved ? '✅ Approved Certificate'
                        : isPending ? '⏳ Uploaded – Pending Review'
                        : '❌ Rejected – Please re-upload'}
                    </span>
                    <a href={certDoc.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">View</a>
                  </div>
                  {certDoc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                    <img src={certDoc.url} alt="Your certificate" className="w-full max-h-48 object-contain bg-gray-50 p-2" />
                  )}
                </div>
              )}

              {/* Success banner */}
              {uploadSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-green-700 font-medium">Certificate uploaded! Waiting for admin approval.</p>
                </div>
              )}

              {/* Dropzone — hidden when approved */}
              {!isApproved && (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragOver ? 'border-blue-500 bg-blue-50'
                      : selectedFile ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                    />

                    {selectedFile ? (
                      <div>
                        {preview
                          ? <img src={preview} alt="Preview" className="w-32 h-32 object-contain mx-auto mb-3 rounded-lg shadow-sm" />
                          : (
                            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )
                        }
                        <p className="text-sm font-semibold text-gray-800">{selectedFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                      </div>
                    ) : (
                      <div>
                        <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-700">
                          {hasCert ? 'Click to replace certificate' : 'Click to upload or drag & drop'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF · Max 10MB</p>
                      </div>
                    )}
                  </div>

                  {selectedFile && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors text-sm"
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          {hasCert ? 'Replace & Re-submit Certificate' : 'Submit Certificate'}
                        </>
                      )}
                    </button>
                  )}
                </>
              )}

              {/* Approved state */}
              {isApproved && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Certificate Verified ✓</p>
                    <p className="text-xs text-green-600 mt-0.5">You can now proceed to Level 3.</p>
                  </div>
                </div>
              )}
            </div>

          </div>{/* end right panel */}
        </div>
      </main>
    </div>
  )
}