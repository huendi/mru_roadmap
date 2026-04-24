'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

interface ExamAttempt {
  score: number
  passed: boolean
  dateTaken: string
  correctAnswers: number
  totalQuestions: number
}

interface ExamRecord {
  examId: number
  attempts: ExamAttempt[]
  bestScore: number
  passed: boolean
}

interface ExamConfig {
  questionsPerSet: number
  minutesPerSet: number
  passingScore: number
  totalSets: number
  totalQuestions: number
  bankVersion: string
  passingRequirement: {
    type: 'all' | 'count'
    requiredPasses?: number
  }
}

export default function Level4Page() {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [loading, setLoading]         = useState(true)
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([])
  const [config, setConfig]           = useState<ExamConfig | null>(null)
  const [passedCount, setPassedCount] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      if (!userData) { router.push('/auth'); return }
      if (userData.currentLevel < 4) { router.push('/dashboard'); return }
      setUser(userData)
      fetchAll(userData.uid)
    })
    return unsubscribe
  }, [router])

  const fetchAll = async (uid: string) => {
    try {
      const [configRes, recordsRes] = await Promise.all([
        fetch('/api/level4/config'),
        fetch(`/api/user/level4-exams?uid=${uid}`),
      ])
      if (configRes.ok) setConfig(await configRes.json())
      if (recordsRes.ok) {
        const data = await recordsRes.json()
        setExamRecords(data.exams || [])
        setPassedCount((data.exams || []).filter((e: ExamRecord) => e.passed).length)
      }
    } catch (e) {
      console.error('Failed to fetch level4 data', e)
    } finally {
      setLoading(false)
    }
  }

  const handleNextLevel = async () => {
    if (!allPassed || !user) return
    
    // Add a small delay to ensure the API has updated the user level
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Navigate to Level 5
    router.push('/level/5')
  }

  const getExamRecord = (examId: number): ExamRecord | null =>
    examRecords.find(r => r.examId === examId) || null

  const totalSets    = config?.totalSets ?? 0
  const passingRequirement = config?.passingRequirement || { type: 'all' }
  const requiredPasses = passingRequirement.type === 'all' ? totalSets : (passingRequirement.requiredPasses || 1)
  const allPassed    = totalSets > 0 && passedCount >= requiredPasses
  const passingScore = config?.passingScore ?? 75

  const progressPercentage = totalSets > 0
    ? Math.round(
        examRecords.reduce((sum, r) => {
          if (r.passed) return sum + (100 / totalSets)
          if (r.attempts.length > 0) return sum + (100 / totalSets / 2)
          return sum
        }, 0)
      )
    : 0

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
                {passingRequirement.type === 'all' 
                  ? <>Pass <strong>all {totalSets} exam sets</strong> to unlock Level 5.</>
                  : <>Pass <strong>{requiredPasses} out of {totalSets} exam sets</strong> to unlock Level 5.</>
                }
              </p>

              {/* Progress */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Passed: {passedCount} / {totalSets}
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
                      ? '✓ Ready'
                      : `${Math.max(0, requiredPasses - passedCount)} exam${Math.max(0, requiredPasses - passedCount) !== 1 ? 's' : ''} remaining`
                    }
                  </span>
                </div>
              </div>

              {/* Rules */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h4 className="text-xs font-semibold text-blue-900 mb-1">📋 Exam Rules</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• {config?.questionsPerSet ?? 50} questions per exam set</li>
                  <li>• {config?.minutesPerSet ?? 60}-minute time limit</li>
                  <li>• {passingScore}% passing score</li>
                  <li>• Unlimited retakes allowed</li>
                  <li>• Best score counts per set</li>
                  <li>• {passingRequirement.type === 'all' ? `All ${totalSets} sets must be passed` : `${requiredPasses} out of ${totalSets} sets must be passed`}</li>
                </ul>
              </div>

              {allPassed && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-800">
                    ✅ All exams passed! Level 5 unlocked.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="lg:w-[60%] w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Mock Examinations</h2>
                <span className="text-sm text-gray-500">{totalSets} sets</span>
              </div>

              {totalSets === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No exam sets available yet.</p>
                  <p className="text-xs mt-1">Please wait for the admin to upload a question bank.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: totalSets }, (_, idx) => {
                    const examId    = idx + 1
                    const record    = getExamRecord(examId)
                    const attempts  = record?.attempts || []
                    const passed    = record?.passed || false
                    const bestScore = record?.bestScore || 0
                    const neverTaken = attempts.length === 0

                    return (
                      <div
                        key={examId}
                        className={`border rounded-lg p-4 transition-all ${
                          passed
                            ? 'border-green-200 bg-green-50'
                            : neverTaken
                            ? 'border-gray-200 bg-white'
                            : 'border-orange-200 bg-orange-50'
                        }`}
                      >
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
                              <span className="text-xs font-medium text-gray-400">Set {examId}</span>
                              {passed && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Passed</span>
                              )}
                              {!passed && !neverTaken && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Not Passed</span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 text-sm">Exam Set {examId}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {neverTaken
                                ? `${config?.questionsPerSet ?? 50} questions · ${config?.minutesPerSet ?? 60} min · ${passingScore}% to pass`
                                : `Best: ${bestScore}% · ${attempts.length} attempt${attempts.length !== 1 ? 's' : ''}`
                              }
                            </p>

                            {/* Attempt history */}
                            {attempts.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {attempts.map((attempt, i) => (
                                  <div key={i} className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                      attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                    }`}>
                                      #{i + 1} {attempt.score}%
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {attempt.correctAnswers}/{attempt.totalQuestions ?? config?.questionsPerSet ?? 50} · {new Date(attempt.dateTaken).toLocaleString('en-PH', {
                                        month: 'short', day: 'numeric', year: 'numeric',
                                        hour: 'numeric', minute: '2-digit', hour12: true,
                                        timeZone: 'Asia/Manila',
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action */}
                          <button
                            onClick={() => router.push(`/level/4/exam/${examId}`)}
                            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                              passed
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : neverTaken
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {passed ? 'Retake' : neverTaken ? 'Start' : 'Retake'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 font-semibold mb-2">ℹ️ How it works</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Questions are distributed evenly across all exam sets.</li>
                  <li>• The last set fills remaining questions with no duplicates.</li>
                  <li>• Your best score per set is used to determine passing status.</li>
                  <li>• {passingRequirement.type === 'all' ? 'All sets must be passed' : `${requiredPasses} sets must be passed`} to proceed to Level 5.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Level Complete Banner */}
        {allPassed && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Level 4 Complete! Go to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  )
}