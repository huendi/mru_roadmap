'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { User } from '@/types'

interface Question {
  id: string
  num: number
  question: string
  options: { [key: string]: string }
  answer: string
}

interface ShuffledQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

const TOTAL_QUESTIONS = 50
const TIME_LIMIT_SECONDS = 60 * 60
const PASSING_SCORE = 75

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = Number(params.id)

  const [user, setUser] = useState<User | null>(null)
  const [phase, setPhase] = useState<'loading' | 'instructions' | 'exam' | 'result'>('loading')
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: number }>({})
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; correct: number; passed: boolean } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChange((userData) => {
      if (!userData) { router.push('/auth'); return }
      if (userData.currentLevel < 3) { router.push('/dashboard'); return }
      if (examId < 1 || examId > 4) { router.push('/level/3'); return }
      setUser(userData)
      loadQuestions()
    })
    return unsub
  }, [router, examId])

  const loadQuestions = async () => {
    try {
      const res = await fetch(`/api/level3/questions?examId=${examId}`)
      if (!res.ok) throw new Error('Failed to load questions')
      const data = await res.json()

      const allQuestions: Question[] = data.questions
      const picked = shuffleArray(allQuestions).slice(0, TOTAL_QUESTIONS)

      const shuffled: ShuffledQuestion[] = picked.map(q => {
        const letters = Object.keys(q.options)
        const texts = letters.map(l => q.options[l])
        const combined = texts.map((text, i) => ({ text, isCorrect: letters[i] === q.answer }))
        const shuffledCombined = shuffleArray(combined)
        return {
          id: q.id || String(q.num),
          question: q.question,
          options: shuffledCombined.map(c => c.text),
          correctIndex: shuffledCombined.findIndex(c => c.isCorrect)
        }
      })

      setQuestions(shuffled)
      setPhase('instructions')
    } catch (e) {
      setError('Failed to load questions. Please try again.')
      setPhase('instructions')
    }
  }

  useEffect(() => {
    if (phase !== 'exam') return
    if (timeLeft <= 0) { handleSubmit(); return }
    const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const handleSubmit = useCallback(async () => {
    if (submitting || !user) return
    setSubmitting(true)

    const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0)
    const score = Math.round((correct / TOTAL_QUESTIONS) * 100)
    const passed = score >= PASSING_SCORE
    setResult({ score, correct, passed })
    setPhase('result')

    try {
      await fetch('/api/user/level3-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          examId,
          score,
          correctAnswers: correct,
          totalQuestions: TOTAL_QUESTIONS,
          passed,
          dateTaken: new Date().toISOString()
        })
      })
    } catch (e) {
      console.error('Failed to save result', e)
    } finally {
      setSubmitting(false)
    }
  }, [submitting, user, questions, answers, examId])

  const answeredCount = Object.keys(answers).length
  const isLowTime = timeLeft < 300

  // ── LOADING ──
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Exam {examId}...</p>
        </div>
      </div>
    )
  }

  // ── INSTRUCTIONS ──
  if (phase === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => router.push('/level/3')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div>
              <p className="text-xs font-semibold text-amber-600 tracking-widest uppercase">Level 3 · Exam {examId}</p>
              <h1 className="text-lg font-bold text-gray-900">Mock Examination {examId}</h1>
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-6 py-12">
          {/* Icon + title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border border-amber-200 shadow-md mb-5">
              <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Exam {examId}</h2>
            <p className="text-gray-500 text-sm">Financial Advisor Licensure · Mock Examination</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Questions', value: '50' },
              { label: 'Time Limit', value: '60 min' },
              { label: 'Passing Score', value: '75%' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">📋</span>
              <h4 className="text-sm font-semibold text-gray-800">Instructions</h4>
            </div>
            <ul className="space-y-2">
              {[
                'Questions are randomly selected and shuffled each attempt.',
                'You can navigate between questions freely before submitting.',
                'The exam auto-submits when the timer reaches zero.',
                'All your attempt scores are saved automatically.',
                'Your best score per exam counts toward Level 4 unlock.',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => { setPhase('exam'); setTimeLeft(TIME_LIMIT_SECONDS) }}
            disabled={!!error || questions.length === 0}
            className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            Start Exam {examId} →
          </button>
        </main>
      </div>
    )
  }

  // ── RESULT ──
  if (phase === 'result' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <p className="text-xs font-semibold text-amber-600 tracking-widest uppercase">Level 3 · Exam {examId} · Results</p>
            <h1 className="text-lg font-bold text-gray-900">Exam Complete</h1>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-6 py-12">

          {/* Score card */}
          <div className={`bg-white rounded-xl border shadow-sm p-8 text-center mb-6 ${
            result.passed ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 mb-5 ${
              result.passed ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'
            }`}>
              {result.passed ? (
                <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <p className={`text-5xl font-bold mb-1 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
              {result.score}%
            </p>
            <p className="text-gray-400 text-sm mb-4">
              {result.correct} / {TOTAL_QUESTIONS} correct answers
            </p>

            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
              result.passed
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-600'
            }`}>
              {result.passed ? '🎉 Exam Passed!' : 'Not Passed'}
            </span>

            {!result.passed && (
              <p className="text-gray-400 text-xs mt-3">
                You need {PASSING_SCORE}% to pass. Keep practicing!
              </p>
            )}
          </div>

          {/* Score bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <div className="flex justify-between text-xs text-gray-400 font-semibold mb-2">
              <span>Your Score</span>
              <span>Passing: {PASSING_SCORE}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${result.passed ? 'bg-green-500' : 'bg-red-400'}`}
                style={{ width: `${result.score}%` }}
              />
            </div>
            {/* Passing line marker */}
            <div className="relative h-2" style={{ marginTop: '-10px' }}>
              <div
                className="absolute top-0 w-0.5 h-4 bg-amber-400"
                style={{ left: `${PASSING_SCORE}%` }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/level/3')}
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-md"
            >
              Back to Exam Dashboard
            </button>
            <button
              onClick={() => {
                setAnswers({})
                setCurrentQ(0)
                setResult(null)
                setPhase('loading')
                loadQuestions()
              }}
              className="w-full py-3.5 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
            >
              Retake Exam {examId}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── EXAM ──
  const question = questions[currentQ]
  if (!question) return null

  const progressPercent = ((currentQ + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">

      {/* Sticky exam header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-amber-600 tracking-widest uppercase">Exam {examId}</p>
              <p className="text-xs text-gray-400">
                Question {currentQ + 1} of {questions.length} · {answeredCount} answered
              </p>
            </div>

            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-sm font-bold ${
              isLowTime
                ? 'border-red-300 bg-red-50 text-red-600 animate-pulse'
                : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Question area */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">

          {/* Question badge */}
          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold font-mono">
              {currentQ + 1}
            </span>
            <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
              Question {currentQ + 1} / {questions.length}
            </span>
          </div>

          {/* Question text */}
          <h2 className="text-base font-semibold text-gray-900 leading-relaxed mb-6">
            {question.question}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i)
              const selected = answers[currentQ] === i
              return (
                <button
                  key={i}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: i }))}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-4 group ${
                    selected
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                  }`}
                >
                  <span className={`shrink-0 w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 text-gray-400 group-hover:border-blue-300 group-hover:text-blue-500'
                  }`}>
                    {letter}
                  </span>
                  <span className={`text-sm leading-relaxed ${selected ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-800'}`}>
                    {opt}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {/* Dot navigator */}
          <div className="hidden sm:flex items-center gap-1 max-w-xs overflow-x-auto">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`rounded-full shrink-0 transition-all ${
                  i === currentQ
                    ? 'bg-blue-500 w-4 h-2'
                    : answers[i] !== undefined
                    ? 'bg-blue-300 w-2 h-2'
                    : 'bg-gray-200 w-2 h-2'
                }`}
              />
            ))}
          </div>

          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md"
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          )}
        </div>

        {/* Unanswered warning */}
        {currentQ === questions.length - 1 && answeredCount < questions.length && (
          <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm text-center">
            ⚠️ {questions.length - answeredCount} question{questions.length - answeredCount > 1 ? 's' : ''} unanswered. You can still go back to answer them.
          </div>
        )}
      </main>
    </div>
  )
}