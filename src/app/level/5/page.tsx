'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { authenticatedFetch, authenticatedUpload } from '@/lib/api'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamProgress {
  currentStep: number
  examType?: 'ic' | 'iiap'
  icMode?: 'trad' | 'vul' | 'both' | null
  iiapMode?: 'trad' | 'vul' | 'both' | null
  examModes?: { [key: string]: 'face-to-face' | 'online' | null }
  selectedExams?: string[]
  level4Category?: 'IIAP' | 'IC' | null
  level4DeliveryModes?: any[]
  scheduleId?: string
  scheduleDate?: string
  receiptUploaded?: boolean
  receiptUrl?: string
  receiptFileName?: string
  adminDecision?: 'passed' | 'failed' | 'pending' | 'not_started'
  adminNotes?: string
  examScore?: number
  userId?: string
  reviewedAt?: string
}

interface ExamConfig {
  examTypes: {
    ic: {
      trad: { faceToFacePrice: number; onlinePrice: number }
      vul:  { faceToFacePrice: number; onlinePrice: number }
      enabled: boolean
    }
    iiap: {
      trad: { faceToFacePrice: number; onlinePrice: number }
      vul:  { faceToFacePrice: number; onlinePrice: number }
      enabled: boolean
    }
  }
  schedules: ExamSchedule[]
}

interface ExamSchedule {
  id: string
  examType: 'ic' | 'iiap'
  mode: 'trad-face-to-face' | 'trad-online' | 'vul-face-to-face' | 'vul-online'
  date: string
  time: string
  location: string
  maxSlots: number
  currentSlots: number
  status: 'active' | 'full' | 'cancelled'
}

interface Level4Exam {
  id?: string
  name?: string
  deliveryMode?: string
  category?: string
  [key: string]: any
}

function getExamName(exam: string | Level4Exam): string {
  if (typeof exam === 'string') return exam
  return exam.deliveryMode || exam.name || ''
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Level5Page() {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser]         = useState<User | null>(null)
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)

  const [progress, setProgress] = useState<ExamProgress>({ currentStep: 1 })
  const [config, setConfig]     = useState<ExamConfig | null>(null)

  // Level 4 carried data
  const [level4Category, setLevel4Category]           = useState<'IIAP' | 'IC' | null>(null)
  const [level4DeliveryModes, setLevel4DeliveryModes] = useState<(string | Level4Exam)[]>([])

  // Step 1
  const [selectedExamType, setSelectedExamType] = useState<'ic' | 'iiap' | null>(null)
  const [selectedExams, setSelectedExams]       = useState<string[]>([])
  const [examModes, setExamModes]               = useState<{ [key: string]: 'face-to-face' | 'online' | null }>({})

  // Step 2
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null)

  // Step 3
  const [receiptFile, setReceiptFile]       = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChange((userData) => {
      if (!userData) { router.push('/auth'); return }
      if (userData.currentLevel < 5) { router.push('/dashboard'); return }
      setUser(userData)
      setLoading(false)
    })
    return unsub
  }, [router])

  useEffect(() => {
    if (user) {
      Promise.allSettled([
        fetchProgress(),
        fetchConfig(),
        fetchLevel4Selection(),
      ]).catch((error) => {
        console.error('Failed to initialize Level 5 data:', error)
      })
    }
  }, [user])

  // Restore selectedSchedule once config + progress are both loaded
  useEffect(() => {
    if (config && progress.scheduleId) {
      const s = config.schedules.find(s => s.id === progress.scheduleId)
      if (s) setSelectedSchedule(s)
    }
  }, [config, progress.scheduleId])

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchProgress = async () => {
    try {
      const res = await authenticatedFetch('/api/user/level5-exam')
      if (!res.ok) return
      const data: ExamProgress = await res.json()
      setProgress(data)
      if (data.examType)            setSelectedExamType(data.examType)
      if (data.examModes)           setExamModes(data.examModes)
      if (data.selectedExams)       setSelectedExams(data.selectedExams)
      if (data.level4Category)      setLevel4Category(data.level4Category ?? null)
      if (data.level4DeliveryModes) setLevel4DeliveryModes(data.level4DeliveryModes)
    } catch (e) { console.error(e) }
  }

  const fetchConfig = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/level5-settings')
      if (res.ok) setConfig(await res.json())
    } catch (e) { console.error(e) }
  }

  const fetchLevel4Selection = async () => {
    try {
      const res = await authenticatedFetch(`/api/user/level4-exam-types?uid=${user?.uid}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.examSelection) return
      const cat = data.examSelection.selectedCategory
      setLevel4Category(cat)
      const normalized = (data.examSelection.confirmedExams || []).map((e: any) => ({
        ...e,
        deliveryMode: e.deliveryMode?.toUpperCase(),
      }))
      setLevel4DeliveryModes(normalized)
      setSelectedExamType(cat === 'IIAP' ? 'iiap' : cat === 'IC' ? 'ic' : null)
    } catch (e) { console.error(e) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const getPrice = (examName: string, mode: 'face-to-face' | 'online'): number => {
    if (!config || !level4Category) return 0
    const cat     = level4Category.toLowerCase() as 'ic' | 'iiap'
    const examKey = examName.toLowerCase() as 'trad' | 'vul'
    const pricing = config.examTypes[cat]?.[examKey]
    if (!pricing) return 0
    return mode === 'online' ? pricing.onlinePrice : pricing.faceToFacePrice
  }

  const calculateTotal = (): number => {
    if (!config || !level4Category || selectedExams.length === 0) return 0
    return selectedExams.reduce((sum, examName) => {
      const mode = examModes[examName]
      if (!mode) return sum
      return sum + getPrice(examName, mode)
    }, 0)
  }

  const getAvailableSchedules = (): ExamSchedule[] => {
    if (!config || !selectedExamType || selectedExams.length === 0) return []
    return config.schedules.filter(s =>
      s.examType === selectedExamType &&
      s.status === 'active' &&
      s.currentSlots < s.maxSlots &&
      selectedExams.some(examName =>
        s.mode === `${examName.toLowerCase()}-${examModes[examName]}`
      )
    )
  }

  const canProceedStep1 =
    !!selectedExamType &&
    selectedExams.length > 0 &&
    selectedExams.every(e => !!examModes[e])

  // Debug: Log the state to help troubleshoot
  useEffect(() => {
    console.log('Level 5 Debug State:', {
      currentStep: progress.currentStep,
      selectedExamType,
      selectedExams,
      examModes,
      level4Category,
      level4DeliveryModes,
      canProceedStep1
    })
  }, [progress.currentStep, selectedExamType, selectedExams, examModes, level4Category, level4DeliveryModes, canProceedStep1])

  // Resolve schedule from state OR from progress.scheduleId + config
  // This fixes the Step 3 bug after page reload
  const resolvedSchedule: ExamSchedule | null =
    selectedSchedule ??
    (config && progress.scheduleId
      ? config.schedules.find(s => s.id === progress.scheduleId) ?? null
      : null)

  const progressPct =
    progress.adminDecision === 'passed' ? 100
    : progress.currentStep >= 4 ? 75
    : progress.currentStep >= 3 ? 50
    : progress.currentStep >= 2 ? 25
    : 0

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleExamToggle = (examName: string) =>
    setSelectedExams(prev =>
      prev.includes(examName) ? prev.filter(e => e !== examName) : [...prev, examName]
    )

  const handleModeSelect = (examName: string, mode: 'face-to-face' | 'online') =>
    setExamModes(prev => ({ ...prev, [examName]: mode }))

  const handleStep1Continue = async () => {
    if (!canProceedStep1 || !selectedExamType) return
    const icMode: 'trad' | 'vul' | 'both' | null =
      selectedExamType === 'ic'
        ? selectedExams.includes('TRAD') && selectedExams.includes('VUL') ? 'both'
          : selectedExams.includes('TRAD') ? 'trad' : 'vul'
        : null
    const iiapMode: 'trad' | 'vul' | 'both' | null =
      selectedExamType === 'iiap'
        ? selectedExams.includes('TRAD') && selectedExams.includes('VUL') ? 'both'
          : selectedExams.includes('TRAD') ? 'trad' : 'vul'
        : null
    try {
      const res = await authenticatedFetch('/api/user/level5-exam', {
        method: 'POST',
        body: JSON.stringify({
          examType: selectedExamType,
          icMode,
          iiapMode,
          examModes: { ...examModes },
          selectedExams: [...selectedExams],
          level4Category,
          level4DeliveryModes: [...level4DeliveryModes],
          currentStep: 2,
        }),
      })
      if (res.ok) {
        await fetchProgress()
      } else {
        console.error('Failed to save Step 1 progress:', await res.text())
        setProgress(prev => ({ 
          ...prev, 
          currentStep: 2, 
          examType: selectedExamType, 
          icMode, 
          iiapMode,
          examModes: { ...examModes },
          selectedExams: [...selectedExams],
          level4Category,
          level4DeliveryModes: [...level4DeliveryModes]
        }))
      }
    } catch (error) {
      console.error('Error saving Step 1 progress:', error)
      setProgress(prev => ({ 
        ...prev, 
        currentStep: 2,
        examType: selectedExamType, 
        icMode, 
        iiapMode,
        examModes: { ...examModes },
        selectedExams: [...selectedExams],
        level4Category,
        level4DeliveryModes: [...level4DeliveryModes]
      }))
    }
  }

  const handleStep2Continue = async () => {
    if (!selectedSchedule) return
    try {
      const res = await authenticatedFetch('/api/user/level5-exam', {
        method: 'POST',
        body: JSON.stringify({
          scheduleId: selectedSchedule.id,
          scheduleDate: selectedSchedule.date,
          currentStep: 3,
        }),
      })
      if (res.ok) {
        await fetchProgress()
      } else {
        console.error('Failed to save Step 2 progress:', await res.text())
        setProgress(prev => ({ 
          ...prev, 
          currentStep: 3,
          scheduleId: selectedSchedule.id
        }))
        setSelectedSchedule(selectedSchedule)
      }
    } catch (error) {
      console.error('Error saving Step 2 progress:', error)
      setProgress(prev => ({ 
        ...prev, 
        currentStep: 3,
        scheduleId: selectedSchedule.id
      }))
      setSelectedSchedule(selectedSchedule)
    }
  }

  const handleFileSelect = (file: File) => {
    setReceiptFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setReceiptPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setReceiptPreview(null)
    }
  }

  const handleStep3Upload = async () => {
    if (!receiptFile || !selectedExamType || !resolvedSchedule) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', receiptFile)
    formData.append('examType', selectedExamType)
    formData.append('scheduleId', resolvedSchedule.id)
    try {
      const res = await authenticatedUpload('/api/user/level5-receipt', formData)
      if (res.ok) {
        setReceiptFile(null)
        setReceiptPreview(null)
        await fetchProgress()
      }
    } catch (e) { console.error(e) }
    finally { setUploading(false) }
  }

  // Reset functions for failed exam result
  const handleFullResetToLevel4 = async () => {
    try {
      const res = await authenticatedFetch('/api/user/level4-full-reset', {
        method: 'POST',
      })
      if (res.ok) router.push('/level/4')
    } catch (e) { console.error(e) }
  }

  const handleLevel5OnlyReset = async () => {
    try {
      const res = await authenticatedFetch('/api/user/level5-reset', {
        method: 'POST',
      })
      if (res.ok) {
        setProgress({ currentStep: 1 })
        setSelectedExamType(null)
        setSelectedSchedule(null)
        setReceiptFile(null)
        setReceiptPreview(null)
        setSelectedExams([])
        setExamModes({})
      }
    } catch (e) { console.error(e) }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Level 5...</p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
      <Navbar />

      <main className="w-[90%] mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 justify-center w-full max-w-7xl mx-auto">

          {/* ── Left Panel ── */}
          <div className="lg:w-[30%] w-full">

            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/level/6')}
                disabled={progress.adminDecision !== 'passed'}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                  progress.adminDecision === 'passed'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next Level
              </button>
            </div>

            <div className="lg:sticky lg:top-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Level 5 – Licensure Exam</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Register and pay for your licensure exam to unlock Level 6.
                </p>

                {/* Progress bar */}
                <div className="bg-gray-50 rounded-lg p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-semibold text-blue-600">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        progressPct === 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Status:</span>
                    <span className={`text-xs font-semibold ${
                      progress.adminDecision === 'passed'  ? 'text-green-600'
                      : progress.adminDecision === 'pending' ? 'text-yellow-600'
                      : progress.adminDecision === 'failed'  ? 'text-red-600'
                      : progress.currentStep >= 3 ? 'text-blue-600'
                      : progress.currentStep >= 2 ? 'text-blue-600'
                      : 'text-gray-500'
                    }`}>
                      {progress.adminDecision === 'passed'  ? 'Ready for Level 6'
                      : progress.adminDecision === 'pending' ? 'Waiting for Licensure Exam Result'
                      : progress.adminDecision === 'failed'  ? 'Not approved'
                      : progress.currentStep >= 3 ? 'Upload receipt'
                      : progress.currentStep >= 2 ? 'Choose schedule'
                      : 'Select exam type'}
                    </span>
                  </div>
                </div>

                {/* Step indicators */}
                <div className="space-y-2.5">
                  {[
                    { n: 1, done: progress.currentStep > 1, title: 'Select Exam & Mode',  desc: 'Choose exam type and delivery mode.' },
                    { n: 2, done: progress.currentStep > 2 && progress.receiptUploaded, title: 'Choose Schedule', desc: progress.currentStep > 2 && !progress.receiptUploaded ? 'Schedule can be changed.' : 'Pick an available exam date.' },
                    { n: 3, done: progress.currentStep > 3, title: 'Upload Receipt',      desc: 'Submit payment proof.' },
                    { n: 4, done: progress.adminDecision === 'passed', title: 'Exam Results', desc: 'Waiting for licensure exam result.' },
                  ].map(step => (
                    <div
                      key={step.n}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        step.done
                          ? 'border-green-200 bg-green-50'
                          : progress.currentStep === step.n
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
                        step.done
                          ? 'bg-green-500 text-white'
                          : progress.currentStep === step.n
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {step.done ? '✓' : step.n}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{step.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Instructions</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Complete all 4 steps to finish the licensure exam process. Admin approval is required to proceed to Level 6.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="lg:w-[60%] w-full space-y-5">

            {/* ═══ STEP 1 ═══ */}
            <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${
              progress.adminDecision === 'failed' ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Step 1: Select Exam &amp; Mode</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Choose your exams and delivery mode</p>
                </div>
                {progress.currentStep > 1 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                )}
              </div>

              <div className="p-6 space-y-4">

                {/* Exam type display */}
                <div className="grid grid-cols-2 gap-3">
                  {(['IC', 'IIAP'] as const).map(cat => (
                    <div
                      key={cat}
                      className={`border-2 rounded-xl p-4 ${
                        level4Category === cat
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 bg-gray-50 opacity-40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          level4Category === cat ? 'border-blue-500' : 'border-gray-300'
                        }`}>
                          {level4Category === cat && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        </div>
                        <span className="text-sm font-bold text-gray-800">{cat} Exam</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-5">
                        {cat === 'IC' ? 'Insurance Commission' : 'Inv. Advisers of PH'}
                      </p>
                      {level4Category === cat && (
                        <span className="mt-2 inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          From Level 4
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Exam checkboxes + mode selection */}
                {level4Category && level4DeliveryModes.length > 0 ? (
                  <div className="space-y-3">
                    {level4DeliveryModes.map((exam, i) => {
                      const examName  = getExamName(exam)
                      const isChecked = selectedExams.includes(examName)
                      return (
                        <div
                          key={i}
                          className={`border-2 rounded-xl overflow-hidden transition-colors ${
                            isChecked ? 'border-blue-300' : 'border-gray-200'
                          }`}
                        >
                          <label className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                            isChecked ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleExamToggle(examName)}
                              className="w-4 h-4 accent-blue-600"
                            />
                            <div>
                              <span className="text-sm font-semibold text-gray-800">{examName}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {examName === 'TRAD' ? 'Traditional Life Insurance' : 'Variable Universal Life'}
                              </span>
                            </div>
                          </label>

                          {isChecked && (
                            <div className="px-4 pb-3 pt-2 bg-white grid grid-cols-2 gap-2">
                              {(['face-to-face', 'online'] as const).map(mode => (
                                <label
                                  key={mode}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                                    examModes[examName] === mode
                                      ? 'border-green-400 bg-green-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`mode-${examName}`}
                                      checked={examModes[examName] === mode}
                                      onChange={() => handleModeSelect(examName, mode)}
                                      className="w-3.5 h-3.5 accent-green-600"
                                    />
                                    <span className="text-xs font-semibold text-gray-700">
                                      {mode === 'face-to-face' ? 'Face-to-face' : 'Online'}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-green-700">
                                    ₱{getPrice(examName, mode).toLocaleString()}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">Level 4 Data Required</p>
                    <p className="text-xs text-yellow-800 mb-3">
                      Please complete Level 4 first to select your exam types for Level 5.
                    </p>
                    <button
                      onClick={() => router.push('/level/4')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700 transition-colors"
                    >
                      Go to Level 4
                    </button>
                  </div>
                )}

                {/* Total */}
                {selectedExams.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-800">Total Amount</span>
                      <span className="text-xl font-bold text-blue-600">
                        ₱{calculateTotal().toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {selectedExams.map(examName => {
                        const mode = examModes[examName]
                        if (!mode) return (
                          <p key={examName} className="text-xs text-gray-400">
                            • {examName} — select a mode above
                          </p>
                        )
                        return (
                          <p key={examName} className="text-xs text-gray-600">
                            • {examName} ({mode}): ₱{getPrice(examName, mode).toLocaleString()}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                )}

                {progress.currentStep <= 1 && (
                  <div className="space-y-3">
                    <button
                      onClick={handleStep1Continue}
                      disabled={!canProceedStep1}
                      className={`w-full py-3 rounded-xl font-semibold transition-colors text-sm ${
                        canProceedStep1 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {canProceedStep1 ? 'Continue to Schedule Selection' : 'Complete Step 1 Requirements'}
                    </button>
                    
                    {!canProceedStep1 && (
                      <div className="text-xs text-gray-500 space-y-1">
                        {!selectedExamType && <p>• Exam type not selected</p>}
                        {selectedExams.length === 0 && <p>• No exams selected</p>}
                        {selectedExams.some(e => !examModes[e]) && <p>• Some exams missing delivery mode</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ STEP 2 ═══ */}
            <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${
              progress.currentStep >= 2 ? '' : 'opacity-50 pointer-events-none'
            }`}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Step 2: Choose Schedule</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Select an available exam date</p>
                </div>
                {progress.currentStep > 2 && !progress.receiptUploaded && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Can be changed
                  </span>
                )}
                {progress.currentStep > 2 && progress.receiptUploaded && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                )}
              </div>

              <div className="p-6 space-y-4">

                {progress.currentStep >= 2 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700">
                      {progress.examType?.toUpperCase()}
                      {progress.icMode   && ` — ${progress.icMode   === 'both' ? 'TRAD & VUL' : progress.icMode.toUpperCase()}`}
                      {progress.iiapMode && ` — ${progress.iiapMode === 'both' ? 'TRAD & VUL' : progress.iiapMode.toUpperCase()}`}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700">
                      ₱{calculateTotal().toLocaleString()}
                    </span>
                    {progress.currentStep === 2 && (
                      <button
                        onClick={async () => {
                          setProgress(prev => ({ ...prev, currentStep: 1 }))
                          try {
                            await authenticatedFetch('/api/user/level5-exam', {
                              method: 'POST',
                              body: JSON.stringify({ currentStep: 1 })
                            })
                          } catch (e) { console.error('Failed to update step on server:', e) }
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        Change
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {progress.currentStep === 2 ? (
                    // Show all available schedules when user is still selecting (Step 2)
                    getAvailableSchedules().length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <p className="text-sm font-semibold text-gray-500">No schedules available</p>
                        <p className="text-xs text-gray-400 mt-1">Please contact admin or check back later.</p>
                      </div>
                    ) : (
                      getAvailableSchedules().map(schedule => {
                        const slotsLeft    = schedule.maxSlots - schedule.currentSlots
                        const slotsPct     = (schedule.currentSlots / schedule.maxSlots) * 100
                        const isAlmostFull = slotsLeft <= 5
                        const isSelected   = selectedSchedule?.id === schedule.id

                        return (
                          <div
                            key={schedule.id}
                            onClick={() => progress.currentStep === 2 && setSelectedSchedule(schedule)}
                            className={`border-2 rounded-xl p-4 transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : progress.currentStep === 2
                                ? 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  isSelected ? 'border-blue-500' : 'border-gray-300'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-800">
                                      {schedule.examType.toUpperCase()} — {(schedule.mode as string).replace(/-/g, ' ').toUpperCase()}
                                    </span>
                                    {isAlmostFull && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                                        Almost full
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-0.5 text-xs text-gray-500">
                                    <p>{new Date(schedule.date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    <p>{schedule.time} &nbsp;·&nbsp; {schedule.location}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-right min-w-[70px]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Slots</p>
                                <p className={`text-sm font-bold ${isAlmostFull ? 'text-red-600' : 'text-gray-700'}`}>
                                  {slotsLeft} <span className="text-xs font-normal text-gray-400">left</span>
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                  <div
                                    className={`h-1 rounded-full ${slotsPct >= 80 ? 'bg-red-500' : slotsPct >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${slotsPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )
                  ) : (
                    // Show only the selected schedule after proceeding to Step 3+
                    resolvedSchedule ? (
                      <div
                        className="border-2 border-blue-500 bg-blue-50 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-semibold text-gray-800">
                                  {resolvedSchedule.examType.toUpperCase()} — {(resolvedSchedule.mode as string).replace(/-/g, ' ').toUpperCase()}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-semibold">
                                  Selected
                                </span>
                              </div>
                              <div className="space-y-0.5 text-xs text-gray-500">
                                <p>{new Date(resolvedSchedule.date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                <p>{resolvedSchedule.time} &nbsp;·&nbsp; {resolvedSchedule.location}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right min-w-[70px]">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Slots</p>
                            <p className="text-sm font-bold text-gray-700">
                              {resolvedSchedule.maxSlots - resolvedSchedule.currentSlots} <span className="text-xs font-normal text-gray-400">left</span>
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                              <div
                                className={`h-1 rounded-full ${(resolvedSchedule.currentSlots / resolvedSchedule.maxSlots) >= 80 ? 'bg-red-500' : (resolvedSchedule.currentSlots / resolvedSchedule.maxSlots) >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${(resolvedSchedule.currentSlots / resolvedSchedule.maxSlots) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <p className="text-sm font-semibold text-gray-500">No schedule selected</p>
                        <p className="text-xs text-gray-400 mt-1">Please go back and select a schedule.</p>
                      </div>
                    )
                  )}
                </div>

                {progress.currentStep === 2 && (
                  <button
                    onClick={handleStep2Continue}
                    disabled={!selectedSchedule}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Continue to Receipt Upload
                  </button>
                )}
              </div>
            </div>

            {/* ═══ STEP 3 ═══ */}
            <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${
              progress.currentStep >= 3 ? '' : 'opacity-50 pointer-events-none'
            }`}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Step 3: Upload Payment Receipt</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Submit proof of payment</p>
                </div>
                {progress.currentStep > 3 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                )}
              </div>

              <div className="p-6 space-y-4">

                {/* Exam summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1.5">
                      <p className="text-gray-600">
                        <span className="font-medium text-gray-800">Exam: </span>
                        {progress.examType?.toUpperCase()}
                        {progress.icMode   && ` — ${progress.icMode   === 'both' ? 'TRAD & VUL' : progress.icMode.toUpperCase()}`}
                        {progress.iiapMode && ` — ${progress.iiapMode === 'both' ? 'TRAD & VUL' : progress.iiapMode.toUpperCase()}`}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium text-gray-800">Schedule: </span>
                        {resolvedSchedule
                          ? new Date(resolvedSchedule.date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                          : '—'}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium text-gray-800">Location: </span>
                        {resolvedSchedule?.location || '—'}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium text-gray-800">Amount to Pay: </span>
                        <span className="font-bold text-blue-600">₱{calculateTotal().toLocaleString()}</span>
                      </p>
                    </div>
                    {progress.currentStep === 3 && (
                      <button
                        onClick={async () => {
                          setProgress(prev => ({ ...prev, currentStep: 2 }))
                          try {
                            await authenticatedFetch('/api/user/level5-exam', {
                              method: 'POST',
                              body: JSON.stringify({ currentStep: 2 })
                            })
                          } catch (e) { console.error('Failed to update step on server:', e) }
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>

                {/* Already uploaded */}
                {progress.receiptUploaded && progress.receiptUrl && !receiptFile && (
                  <div className="border border-green-200 bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-green-800 font-medium">Receipt uploaded successfully</span>
                    <button
                      onClick={() => setShowReceiptModal(true)}
                      className="text-xs text-green-700 underline font-semibold"
                    >
                      View
                    </button>
                  </div>
                )}

                {/* Dropzone */}
                {progress.currentStep === 3 && (
                  <>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f) }}
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        dragOver      ? 'border-blue-500 bg-blue-50'
                        : receiptFile ? 'border-green-400 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                      />
                      {receiptFile ? (
                        <div>
                          {receiptPreview
                            ? <img src={receiptPreview} alt="Preview" className="w-28 h-28 object-contain mx-auto mb-3 rounded-lg shadow-sm" />
                            : (
                              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <svg className="w-7 h-7 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )
                          }
                          <p className="text-sm font-semibold text-gray-800">{receiptFile.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                        </div>
                      ) : (
                        <div>
                          <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-gray-700">Click to upload or drag &amp; drop</p>
                          <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF · Max 5MB</p>
                        </div>
                      )}
                    </div>

                    {receiptFile && (
                      <button
                        onClick={handleStep3Upload}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {uploading ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Uploading...
                          </>
                        ) : 'Submit Receipt for Review'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ═══ STEP 4 ═══ */}
            <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${
              progress.currentStep >= 4 || !!progress.adminDecision ? '' : 'opacity-50 pointer-events-none'
            }`}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Step 4: Exam Results</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Waiting for licensure exam result</p>
                </div>
                {progress.adminDecision === 'passed' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                )}
              </div>

              <div className="p-6">

                {/* Pending */}
                {progress.adminDecision === 'pending' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                      <p className="text-sm font-semibold text-green-900 mb-2">🎉 Congratulations! 🎉</p>
                      <p className="text-xs text-green-800 leading-relaxed">
                        You've successfully registered for your licensure exam! Your submission has been received and is now being reviewed. Check back here for your results.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                )}

                {/* Passed */}
                {progress.adminDecision === 'passed' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-lg font-bold text-green-900 mb-1">🎉 Congratulations! 🎉</p>
                      <p className="text-sm text-green-800 font-medium mb-2">
                        You have successfully passed the licensure exam!
                      </p>
                      {progress.examScore && (
                        <div className="mb-3">
                          <p className="text-2xl font-bold text-green-900">{progress.examScore}%</p>
                          <p className="text-xs text-green-600">Your Exam Score</p>
                        </div>
                      )}
                      <p className="text-sm text-green-700 leading-relaxed">
                        Outstanding achievement! Your hard work and dedication have paid off. You are now officially licensed and ready to advance to Level 6. Keep up the excellent work on your journey to becoming a successful financial advisor!
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/level/6')}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm"
                    >
                      Proceed to Level 6
                    </button>
                  </div>
                )}

                {/* Failed */}
                {progress.adminDecision === 'failed' && (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                      <p className="text-lg font-bold text-red-900 mb-2">Exam Result: Failed</p>
                      {progress.examScore && (
                        <div className="mb-2">
                          <p className="text-2xl font-bold text-red-900">{progress.examScore}%</p>
                          <p className="text-xs text-red-600">Your Exam Score</p>
                        </div>
                      )}
                      <p className="text-sm text-gray-600">
                        Don't let this setback define your journey. Choose how you'd like to proceed:
                      </p>
                    </div>

                    {/* Option 1: Go Back to Level 4 */}
                    <button
                      onClick={handleFullResetToLevel4}
                      className="w-full p-4 border-2 border-orange-200 rounded-xl hover:bg-orange-50 transition-colors text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Go Back to Level 4</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Full reset to retake mock exams and ensure you're fully prepared
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Retry Level 5 Only */}
                    <button
                      onClick={handleLevel5OnlyReset}
                      className="w-full p-4 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Retry Level 5 Only</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Keep your Level 4 progress, but redo fee, schedule, and payment receipt
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

              </div>
            </div>

          </div>{/* end right panel */}
        </div>
      </main>

      {/* Receipt Modal */}
      {showReceiptModal && progress.receiptUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Payment Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {progress.receiptUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img 
                  src={progress.receiptUrl} 
                  alt="Receipt" 
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <iframe
                  src={progress.receiptUrl}
                  className="w-full h-[600px] rounded-lg"
                  title="Receipt"
                />
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <a
                href={progress.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
              >
                Download
              </a>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
