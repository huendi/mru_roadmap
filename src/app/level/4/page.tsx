'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

interface ExamAttempt {
  id: string
  examId: string
  setNumber: number
  score: number
  correctAnswers: number
  totalQuestions: number
  passed: boolean
  dateTaken: string
  bankVersion: string
  durationMinutes?: number
}

interface ExamRecord {
  id: string
  attempts: ExamAttempt[]
  bestScore: number
  passed: boolean
  examType: string
}

interface ExamType {
  id: string
  name: string
  category: 'IIAP' | 'IC'
  deliveryMode: 'TRAD' | 'VUL'
  questionCount: number
  fileName: string
  uploadedAt: string
  questionsPerSet?: number
  minutesPerSet?: number
  passingScore?: number
  passingRequirement?: {
    type: 'all' | 'count'
    requiredPasses?: number
  }
}

interface ExamConfig {
  questionsPerSet: number
  minutesPerSet: number
  passingScore: number
  passingRequirement: {
    type: 'all' | 'count'
    requiredPasses?: number
  }
}

export default function Level4Page() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [loading, setLoading]         = useState(true)
  const [examTypes, setExamTypes]     = useState<ExamType[]>([])
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([])
  const [config, setConfig]           = useState<ExamConfig | null>(null)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [examAttempts, setExamAttempts] = useState<any[]>([])
  
  // Exam selection state
  const [selectedCategory, setSelectedCategory] = useState<'IIAP' | 'IC' | null>(null)
  const [selectedDeliveryModes, setSelectedDeliveryModes] = useState<string[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmedExams, setConfirmedExams] = useState<ExamType[]>([])
  
  // Exam sets visibility state
  const [showExamSets, setShowExamSets] = useState<{ [key: string]: boolean }>({})
  
  // Exam selection mode state
  const [isChangingSelection, setIsChangingSelection] = useState(false)
  
  // Reset warning state
  const [showResetWarning, setShowResetWarning] = useState(false)
  const [pendingCategory, setPendingCategory] = useState<'IIAP'|'IC'|null>(null)
  
  // Exam update notification state
  const [showExamUpdateNotification, setShowExamUpdateNotification] = useState(false)
  const [examUpdateInfo, setExamUpdateInfo] = useState<any>(null)

  
  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      if (!userData) { router.push('/auth'); return }
      if (userData.currentLevel < 4) { router.push('/dashboard'); return }
      setUser(userData)
      fetchAll(userData.uid)
    })
    return unsubscribe
  }, [router])

  // Refresh data when page becomes visible (after returning from exam)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('📱 Page became visible, refreshing data...')
        fetchAll(user.uid)
      }
    }

    const handleFocus = () => {
      if (user) {
        console.log('🎯 Page gained focus, refreshing data...')
        fetchAll(user.uid)
      }
    }

    console.log('🔧 Setting up event listeners for data refresh')
    // Listen for visibility changes (when user returns from exam tab)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Listen for window focus events
    window.addEventListener('focus', handleFocus)

    return () => {
      console.log('🔧 Cleaning up event listeners')
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, router])

  const fetchAll = async (uid: string) => {
    try {
      const [configRes, examTypesRes, examAttemptsRes, examUpdatesRes] = await Promise.all([
        fetch('/api/level4/config'),
        fetch(`/api/user/level4-exam-types?uid=${uid}`),
        fetch(`/api/user/level4-exams?uid=${uid}`),
        fetch(`/api/user/level4-exam-updates?uid=${uid}`)
      ])
      
      if (configRes.ok) setConfig(await configRes.json())
      if (examTypesRes.ok) {
        const data = await examTypesRes.json()
        setExamTypes(data.examTypes || [])
        setExamRecords(data.userExamRecords || [])
        setAvailableCategories(data.availableCategories || [])
        
        // Restore saved exam selection from Firestore
        if (data.examSelection) {
          setSelectedCategory(data.examSelection.selectedCategory)
          setConfirmedExams(data.examSelection.confirmedExams || [])
        }
      }
      if (examAttemptsRes.ok) {
        const attemptsData = await examAttemptsRes.json()
        // Store exam attempts for history display
        setExamAttempts(attemptsData.examAttempts || [])
      }
      if (examUpdatesRes.ok) {
        const updateData = await examUpdatesRes.json()
        if (updateData.hasUpdate) {
          setExamUpdateInfo(updateData)
          setShowExamUpdateNotification(true)
        }
      }
    } catch (e) {
      console.error('Failed to fetch level4 data', e)
    } finally {
      setLoading(false)
    }
  }

  const handleNextLevel = async () => {
    if (!allPassed || !user) return
    
    try {
      // Update user level to 5
      const res = await fetch('/api/user/level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, level: 5 }),
      })
      
      if (!res.ok) {
        console.error('Failed to update user level')
        return
      }
      
      // Add a small delay to ensure the API has updated the user level
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Navigate to Level 5
      router.push('/level/5')
    } catch (error) {
      console.error('Error updating user level:', error)
    }
  }

  const getExamRecord = (examTypeId: string): ExamRecord | null =>
    examRecords.find(r => r.id === examTypeId) || null

  // Calculate progress based on selected exams only
  const relevantExams = confirmedExams.length > 0 ? confirmedExams : examTypes
  
  // Calculate total sets from confirmed exams
  const totalSets = confirmedExams.length > 0 ? confirmedExams.reduce((total, exam) => {
    const examConfig = examTypes.find(e => e.id === exam.id)
    const questionsPerSet = examConfig?.questionsPerSet ?? config?.questionsPerSet ?? 50
    const examSets = examConfig ? Math.floor(examConfig.questionCount / questionsPerSet) + (examConfig.questionCount % questionsPerSet > 0 ? 1 : 0) : 0
    return total + examSets
  }, 0) : 0
  
  // Calculate required passes based on individual exam requirements (only after selection)
  const requiredPasses = confirmedExams.length > 0 ? confirmedExams.reduce((total, exam) => {
    const examConfig = examTypes.find(e => e.id === exam.id)
    const questionsPerSet = examConfig?.questionsPerSet ?? config?.questionsPerSet ?? 50
    const examSets = examConfig ? Math.floor(examConfig.questionCount / questionsPerSet) + (examConfig.questionCount % questionsPerSet > 0 ? 1 : 0) : 0
    const requiredForExam = examConfig?.passingRequirement?.type === 'count' 
      ? (examConfig.passingRequirement.requiredPasses ?? examSets)
      : examSets
    return total + requiredForExam
  }, 0) : 0
  
  // Count passed exam sets from exam attempts with partial progress
  const passedCount = confirmedExams.length > 0 ? confirmedExams.reduce((total, exam) => {
    const examConfig = examTypes.find(e => e.id === exam.id)
    const questionsPerSet = examConfig?.questionsPerSet ?? config?.questionsPerSet ?? 50
    const examSets = examConfig ? Math.floor(examConfig.questionCount / questionsPerSet) + (examConfig.questionCount % questionsPerSet > 0 ? 1 : 0) : 0
    const requiredForExam = examConfig?.passingRequirement?.type === 'count' 
      ? (examConfig.passingRequirement.requiredPasses ?? examSets)
      : examSets
    
    // Get attempts for this exam
    const examAttemptsForType = examAttempts.filter(attempt => attempt.examId === exam.id)
    
    // Count passed sets (best attempt per set, if passed at least once)
    const passedSets = new Set()
    // Count attempted sets (unique setNumbers)
    const attemptedSets = new Set()
    
    examAttemptsForType.forEach(attempt => {
      if (attempt.setNumber !== undefined) {
        attemptedSets.add(Number(attempt.setNumber))
        if (attempt.passed) {
          passedSets.add(Number(attempt.setNumber))
        }
      }
    })
    
    return total + passedSets.size
  }, 0) : 0
  
  // Calculate progress percentage with partial progress (25% credit for attempted but not passed sets)
  const progressPercentage = confirmedExams.length > 0 ? (() => {
    let totalScore = 0
    let totalRequiredPasses = 0
    
    confirmedExams.forEach(exam => {
      const examConfig = examTypes.find(e => e.id === exam.id)
      const questionsPerSet = examConfig?.questionsPerSet ?? config?.questionsPerSet ?? 50
      const examSets = examConfig ? Math.floor(examConfig.questionCount / questionsPerSet) + (examConfig.questionCount % questionsPerSet > 0 ? 1 : 0) : 0
      const requiredForExam = examConfig?.passingRequirement?.type === 'count' 
        ? (examConfig.passingRequirement.requiredPasses ?? examSets)
        : examSets
      
      totalRequiredPasses += requiredForExam
      
      // Get attempts for this exam
      const examAttemptsForType = examAttempts.filter(attempt => attempt.examId === exam.id)
      
      // Count passed sets (best attempt per set, if passed at least once)
      const passedSets = new Set()
      // Count attempted sets (unique setNumbers)
      const attemptedSets = new Set()
      
      examAttemptsForType.forEach(attempt => {
        if (attempt.setNumber !== undefined) {
          attemptedSets.add(Number(attempt.setNumber))
          if (attempt.passed) {
            passedSets.add(Number(attempt.setNumber))
          }
        }
      })
      
      // Calculate partial progress (attempted but not passed sets)
      const partialProgress = attemptedSets.size - passedSets.size
      
      // Calculate score for this exam
      const examScore = (passedSets.size / requiredForExam * 100) + (partialProgress / requiredForExam * 25)
      totalScore += examScore
    })
    
    // Calculate final percentage based on total required passes
    const finalPercentage = totalRequiredPasses > 0 ? Math.round(Math.min((totalScore / confirmedExams.length), 100)) : 0
    return finalPercentage
  })() : 0
  
  const allPassed = confirmedExams.length > 0 && requiredPasses > 0 && passedCount >= requiredPasses
  const passingScore = config?.passingScore ?? 75

  // Exam selection logic
  const getAvailableExamsByCategory = (category: 'IIAP' | 'IC') => {
    return examTypes.filter(exam => exam.category === category)
  }

  const getAvailableDeliveryModes = (category: 'IIAP' | 'IC') => {
    const exams = getAvailableExamsByCategory(category)
    return Array.from(new Set(exams.map(exam => exam.deliveryMode)))
  }

  const handleCategorySelect = (category: 'IIAP' | 'IC') => {
    // Check if user has existing progress and is trying to switch categories
    if (confirmedExams.length > 0 && examRecords.length > 0 && selectedCategory && selectedCategory !== category) {
      setPendingCategory(category)
      setShowResetWarning(true)
    } else {
      setSelectedCategory(category)
      setSelectedDeliveryModes([])
      setShowConfirmation(false)
    }
  }

  const handleDeliveryModeToggle = (mode: string) => {
    setSelectedDeliveryModes(prev => 
      prev.includes(mode) 
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    )
  }

  const handleConfirmSelection = async () => {
    if (!selectedCategory || selectedDeliveryModes.length === 0 || !user) return
    
    const confirmed = examTypes.filter(exam => 
      exam.category === selectedCategory && 
      selectedDeliveryModes.includes(exam.deliveryMode)
    )
    
    setConfirmedExams(confirmed)
    setShowConfirmation(false)
    setIsChangingSelection(false)
    
    // Save selection to Firestore
    try {
      const response = await fetch('/api/user/level4-exam-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          confirmedExams: confirmed,
          selectedCategory
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        // If wasReset is true, clear local exam records immediately
        if (result.wasReset) {
          setExamRecords([])
        }
      }
    } catch (error) {
      console.error('Failed to save exam selection:', error)
    }
  }

  const handleStartExamSelection = () => {
    setShowConfirmation(true)
  }

  const handleResetSelection = async () => {
    setSelectedCategory(null)
    setSelectedDeliveryModes([])
    setConfirmedExams([])
    setShowConfirmation(false)
    setIsChangingSelection(true)
    
    // Save cleared selection to Firestore
    if (user) {
      try {
        await fetch('/api/user/level4-exam-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            confirmedExams: [],
            selectedCategory: null
          })
        })
      } catch (error) {
        console.error('Failed to clear exam selection:', error)
      }
    }
  }

  const toggleExamSets = (examId: string) => {
    setShowExamSets(prev => ({
      ...prev,
      [examId]: !prev[examId]
    }))
  }

  // Filter exams to show based on selection
  const examsToShow = confirmedExams.length > 0 ? confirmedExams : examTypes

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Level 4...</p>
        </div>
      </div>
    )
  }

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
                onClick={handleNextLevel}
                disabled={!allPassed}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                  allPassed
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next Level
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Level 4 – Mock Exams</h2>
              <p className="text-sm text-gray-500 mb-5">
                {confirmedExams.length > 0 
                  ? `Pass ${requiredPasses} required exams to unlock Level 5.` 
                  : `Select your exam path to begin your journey.`}
              </p>

              {/* Progress */}
              {confirmedExams.length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progress: {passedCount} / {requiredPasses} required
                    </span>
                    <span className={`text-sm font-bold ${allPassed ? 'text-green-600' : 'text-blue-600'}`}>
                      {progressPercentage}%
                      <span className="font-normal text-gray-400"> / 100%</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${allPassed ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Next Level:</span>
                    <span className={`text-sm font-medium ${allPassed ? 'text-green-600' : 'text-orange-600'}`}>
                      {allPassed
                        ? 'Ready'
                        : `${Math.max(0, requiredPasses - passedCount)} more required`
                      }
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Status: Not Started
                    </span>
                    <span className="text-sm font-bold text-gray-600">
                      0%
                      <span className="font-normal text-gray-400"> / 100%</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="h-2 rounded-full bg-gray-300" style={{ width: '0%' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Next Level:</span>
                    <span className="text-sm font-medium text-gray-600">
                      Select exam path
                    </span>
                  </div>
                </div>
              )}

              {/* Rules */}
              {confirmedExams.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <h4 className="text-xs font-semibold text-blue-900 mb-3">Exam Rules</h4>
                  <div className="space-y-3">
                    {confirmedExams.map((exam) => {
                      const examConfig = examTypes.find(e => e.id === exam.id)
                      const questionsPerSet = examConfig?.questionsPerSet ?? config?.questionsPerSet ?? 50
                      const minutesPerSet = examConfig?.minutesPerSet ?? config?.minutesPerSet ?? 60
                      const passingScore = examConfig?.passingScore ?? config?.passingScore ?? 75
                      const examSets = examConfig ? Math.floor(examConfig.questionCount / questionsPerSet) + (examConfig.questionCount % questionsPerSet > 0 ? 1 : 0) : 0
                      const requiredPasses = examConfig?.passingRequirement?.type === 'count' 
                        ? examConfig.passingRequirement.requiredPasses 
                        : examSets

                      return (
                        <div key={exam.id} className="border-l-2 border-blue-300 pl-3">
                          <h5 className="text-xs font-bold text-blue-900 mb-1">{exam.deliveryMode}</h5>
                          <ul className="text-xs text-blue-800 space-y-1">
                            <li>· {questionsPerSet} questions per exam set</li>
                            <li>· {minutesPerSet}-minute time limit</li>
                            <li>· {passingScore}% passing score</li>
                            <li>· Unlimited retakes allowed</li>
                            <li>· Best score counts per set</li>
                            <li>· {requiredPasses} out of {examSets} sets must be passed</li>
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

                          </div>
          </div>

          {/* Right Panel */}
          <div className="lg:w-[60%] w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Mock Examinations</h2>
                <span className="text-sm text-gray-500">{totalSets} exam types</span>
              </div>

              {examTypes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No exam types available yet.</p>
                  <p className="text-xs mt-1">Please wait for the admin to upload question banks.</p>
                </div>
              ) : (confirmedExams.length === 0 && !showConfirmation) || isChangingSelection ? (
                // Exam Selection Interface
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">📝 Select Your Exam Path</h3>
                    <p className="text-xs text-blue-800 mb-4">
                      Choose your exam category and delivery modes. You can take both exams within the same category, but not mix categories.
                    </p>
                    
                    {/* Category Selection */}
                    <div className="mb-4">
                      <label className="text-xs font-bold text-blue-700 uppercase tracking-widest block mb-2">Exam Category</label>
                      <div className="grid grid-cols-2 gap-3">
                        {availableCategories.includes('IIAP') && (
                          <button
                            onClick={() => handleCategorySelect('IIAP')}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              selectedCategory === 'IIAP'
                                ? 'border-blue-500 bg-blue-100 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                            }`}
                          >
                            <div className="text-sm font-bold">IIAP</div>
                            <div className="text-xs mt-1">Insurance Institute</div>
                          </button>
                        )}
                        {availableCategories.includes('IC') && (
                          <button
                            onClick={() => handleCategorySelect('IC')}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              selectedCategory === 'IC'
                                ? 'border-purple-500 bg-purple-100 text-purple-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                            }`}
                          >
                            <div className="text-sm font-bold">IC</div>
                            <div className="text-xs mt-1">Insurance Commission</div>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delivery Mode Selection */}
                    {selectedCategory && (
                      <div className="mb-4">
                        <label className="text-xs font-bold text-blue-700 uppercase tracking-widest block mb-2">Delivery Modes</label>
                        <div className="space-y-2">
                          {getAvailableDeliveryModes(selectedCategory).map(mode => (
                            <label key={mode} className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 bg-white cursor-pointer hover:border-blue-300 transition-all">
                              <input
                                type="checkbox"
                                checked={selectedDeliveryModes.includes(mode)}
                                onChange={() => handleDeliveryModeToggle(mode)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{mode}</div>
                                <div className="text-xs text-gray-500">
                                  {mode === 'TRAD' ? 'Traditional Life Insurance Exam' : 'Variable Universal Life Exam'}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleStartExamSelection}
                        disabled={!selectedCategory || selectedDeliveryModes.length === 0}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                          selectedCategory && selectedDeliveryModes.length > 0
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Confirm Selection
                      </button>
                      <button
                        onClick={handleResetSelection}
                        className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              ) : showConfirmation ? (
                // Confirmation Modal
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Exam Selection</h3>
                    
                    <div className="mb-6">
                      <div className="mb-4">
                        <div className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${
                          selectedCategory === 'IIAP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {selectedCategory} Category
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">You have selected:</p>
                        {selectedDeliveryModes.map(mode => {
                          const exam = examTypes.find(e => e.category === selectedCategory && e.deliveryMode === mode)
                          return (
                            <div key={mode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{selectedCategory} {mode}</div>
                                <div className="text-xs text-gray-500">{exam?.questionCount || 0} questions</div>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs font-bold ${
                                mode === 'TRAD' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {mode}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Once confirmed, you can only take exams from this category. You cannot switch to the other category later.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleConfirmSelection}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
                      >
                        Confirm & Start
                      </button>
                      <button
                        onClick={() => setShowConfirmation(false)}
                        className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : showResetWarning ? (
                // Reset Warning Modal
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Change Exam Selection?</h3>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-800 font-medium">
                        This will permanently delete ALL your Level 4 exam records and progress. This cannot be undone.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <p className="text-sm font-medium text-gray-700 mb-2">This will reset:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>· All exam attempt history</li>
                        <li>· All passed/failed records</li>
                        <li>· Your current Level 4 progress</li>
                      </ul>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          await handleResetSelection()
                          setShowResetWarning(false)
                          if (pendingCategory) {
                            handleCategorySelect(pendingCategory)
                            setPendingCategory(null)
                          }
                        }}
                        className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors"
                      >
                        Yes, Reset Everything
                      </button>
                      <button
                        onClick={() => {
                          setShowResetWarning(false)
                          setPendingCategory(null)
                        }}
                        className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : showExamUpdateNotification ? (
                // Exam Update Notification Modal
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Exam Updated</h3>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-orange-800 font-medium">
                        ⚠️ New questions have been uploaded by the admin/manager.
                      </p>
                      <p className="text-xs text-orange-700 mt-2">
                        Your progress for the affected exams has been reset and you will need to retake them.
                      </p>
                    </div>

                    {examUpdateInfo?.updatedExams && examUpdateInfo.updatedExams.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm font-medium text-gray-700 mb-2">Affected exams:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {examUpdateInfo.updatedExams.map((exam: any, index: number) => (
                            <li key={index}>· {exam.examName}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowExamUpdateNotification(false)
                          setExamUpdateInfo(null)
                        }}
                        className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg font-semibold text-sm hover:bg-orange-700 transition-colors"
                      >
                        I Understand
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Confirmed Exams Display
                <div className="space-y-4">
                  {confirmedExams.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-green-900">
                            ✅ Selected: {confirmedExams[0].category} Exams
                          </h4>
                          <p className="text-xs text-green-800 mt-1">
                            {confirmedExams.map(e => e.deliveryMode).join(' + ')} exams available
                          </p>
                        </div>
                        <button
                          onClick={() => setShowResetWarning(true)}
                          className="text-xs text-green-700 hover:text-green-900 font-medium"
                        >
                          Change Selection
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {examsToShow.map((examType) => {
                    const record    = getExamRecord(examType.id)
                    const attempts  = record?.attempts || []
                    const passed    = record?.passed || false
                    const bestScore = record?.bestScore || 0
                    const neverTaken = attempts.length === 0
                    
                    // Calculate exam sets
                    const questionsPerSet = examType.questionsPerSet ?? config?.questionsPerSet ?? 50
                    const examSets = Math.floor(examType.questionCount / questionsPerSet) + (examType.questionCount % questionsPerSet > 0 ? 1 : 0)
                    const isExamSetsVisible = showExamSets[examType.id] || false

                    return (
                      <div
                        key={examType.id}
                        className={`border rounded-lg transition-all ${
                          passed
                            ? 'border-green-200 bg-green-50'
                            : neverTaken
                            ? 'border-gray-200 bg-white'
                            : 'border-orange-200 bg-orange-50'
                        }`}
                      >
                        {/* Main Exam Info */}
                        <div className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              passed ? 'bg-green-200' : neverTaken ? 'bg-blue-100' : 'bg-orange-100'
                            }`}>
                              {passed ? (
                                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : neverTaken ? (
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${examType.category === 'IIAP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {examType.category}
                                </span>
                                {passed && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Passed</span>
                                )}
                                {!passed && !neverTaken && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Not Passed</span>
                                )}
                              </div>
                              <p className="font-semibold text-gray-900 text-sm">{examType.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {examType.questionCount} questions · {examSets} exam sets
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {neverTaken
                                  ? `${examType.minutesPerSet ?? config?.minutesPerSet ?? 60} min · ${examType.passingScore ?? config?.passingScore ?? 75}% to pass`
                                  : `Best: ${bestScore}% · ${attempts.length} attempt${attempts.length !== 1 ? 's' : ''}`
                                }
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleExamSets(examType.id)}
                                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <svg className={`w-3.5 h-3.5 transition-transform ${isExamSetsVisible ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                {isExamSetsVisible ? 'Hide' : 'Show'} Sets
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Exam Sets (Collapsible) */}
                        {isExamSetsVisible && (
                          <div className="border-t border-gray-200 bg-gray-50 p-4">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3">All Exam Sets ({examSets})</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Array.from({ length: examSets }, (_, i) => {
                                const setNumber = i + 1
                                const isLastSet = i === examSets - 1
                                const remainderQuestions = examType.questionCount % questionsPerSet
                                const actualQuestions = isLastSet && remainderQuestions > 0 ? remainderQuestions : questionsPerSet
                                
                                // Check if this specific set has been passed
                                const setAttempts = examAttempts.filter(attempt => 
                                  attempt.examId === examType.id && 
                                  Number(attempt.setNumber) === Number(setNumber)
                                )
                                const hasPassed = setAttempts.some(attempt => attempt.passed)
                                const hasAttempted = setAttempts.length > 0
                                
                                // Determine button text and state based on exam history
                                let buttonText = `Start Set ${setNumber}`
                                let buttonClass = "mt-2 w-full py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                                let isDisabled = false
                                
                                if (hasPassed) {
                                  // Exam is passed - show "Passed" button (disabled)
                                  buttonText = "Passed"
                                  buttonClass = "mt-2 w-full py-1.5 bg-green-600 text-white text-xs font-semibold rounded cursor-not-allowed opacity-75"
                                  isDisabled = true
                                } else if (hasAttempted) {
                                  // Exam was attempted but failed - show "Retake" button
                                  buttonText = "Retake"
                                  buttonClass = "mt-2 w-full py-1.5 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 transition-colors"
                                }
                                // If never attempted, keep default "Start Set X" button
                                
                                return (
                                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-bold text-gray-900">Set {setNumber}</span>
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                        {actualQuestions} Qs
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1">
                                      <div>· {examType.minutesPerSet ?? config?.minutesPerSet ?? 60} minutes</div>
                                      <div>· {examType.passingScore ?? config?.passingScore ?? 75}% to pass</div>
                                    </div>
                                    <button
                                      onClick={() => !isDisabled && router.push(`/level/4/exam/${examType.id}?set=${setNumber}`)}
                                      disabled={isDisabled}
                                      className={buttonClass}
                                    >
                                      {buttonText}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Exam History for this exam type */}
                        {(() => {
                          const examTypeAttempts = examAttempts.filter(attempt => attempt.examId === examType.id)
                          return examTypeAttempts.length > 0 && (
                            <div className="border-t border-gray-200 bg-gray-50 p-4 mt-4">
                              <h5 className="text-sm font-semibold text-gray-900 mb-3">Exam History</h5>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-300">
                                      <th className="text-left py-2 px-2 font-medium text-gray-700 text-xs">Date & Time</th>
                                      <th className="text-left py-2 px-2 font-medium text-gray-700 text-xs">Exam Set</th>
                                      <th className="text-left py-2 px-2 font-medium text-gray-700 text-xs">Score</th>
                                      <th className="text-left py-2 px-2 font-medium text-gray-700 text-xs">Duration</th>
                                      <th className="text-left py-2 px-2 font-medium text-gray-700 text-xs">Result</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {examTypeAttempts.slice(0, 10).map((attempt, index) => {
                                      const date = new Date(attempt.dateTaken)
                                      const formattedDate = date.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        timeZone: 'Asia/Manila'
                                      })
                                      const formattedTime = date.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true,
                                        timeZone: 'Asia/Manila'
                                      })
                                      
                                      return (
                                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                          <td className="py-2 px-2 text-gray-600">
                                            <div className="text-xs">{formattedDate}</div>
                                            <div className="text-xs text-gray-400">{formattedTime}</div>
                                          </td>
                                          <td className="py-2 px-2 text-gray-900 font-medium">
                                            <div className="text-xs">SET {attempt.setNumber}</div>
                                          </td>
                                          <td className="py-2 px-2 text-gray-900">
                                            <div className="text-xs font-semibold">
                                              {attempt.correctAnswers}/{attempt.totalQuestions}
                                            </div>
                                          </td>
                                          <td className="py-2 px-2 text-gray-900">
                                            <div className="text-xs font-medium">
                                              {attempt.durationMinutes ? `${attempt.durationMinutes} min` : 'N/A'}
                                            </div>
                                          </td>
                                          <td className="py-2 px-2">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                              attempt.passed 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-red-100 text-red-600'
                                            }`}>
                                              {attempt.passed ? 'Passed' : 'Failed'}
                                            </span>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {examTypeAttempts.length > 10 && (
                                  <p className="text-xs text-gray-400 italic text-center mt-2">
                                    Showing 10 most recent attempts out of {examTypeAttempts.length} total
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })()}

                      </div>
                    )
                  })}
                </div>
              )}

              
                          </div>
          </div>
        </div>
      </main>
    </div>
  )
}