// app/api/level3/questions/route.ts
// Returns questions per examId:
//   Exam 1: Q1–50   (fixed set, shuffled on client)
//   Exam 2: Q51–100 (fixed set, shuffled on client)
//   Exam 3: Q101–150(fixed set, shuffled on client)
//   Exam 4: Q151–178 + 22 random from Q1–150 = 50 total

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const EXAM_RANGES: Record<number, { min: number; max: number }> = {
  1: { min: 1,   max: 50  },
  2: { min: 51,  max: 100 },
  3: { min: 101, max: 150 },
}

const EXAM4_FIXED_MIN  = 151
const EXAM4_FIXED_MAX  = 178
const EXAM4_POOL_MIN   = 1
const EXAM4_POOL_MAX   = 150
const EXAM4_RANDOM_COUNT = 22

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const examId = Number(searchParams.get('examId'))

    if (!examId || examId < 1 || examId > 4) {
      return NextResponse.json(
        { error: 'Invalid examId. Must be 1–4.' },
        { status: 400 }
      )
    }

    const snapshot = await adminDb.collection('questions').get()

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'No questions found. Please upload a question bank first.' },
        { status: 404 }
      )
    }

    const allQuestions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as { id: string; num: number; question: string; options: Record<string, string>; answer: string }[]

    let questions: typeof allQuestions = []

    if (examId === 4) {
      // Fixed: Q151–178
      const fixed = allQuestions.filter(
        q => q.num >= EXAM4_FIXED_MIN && q.num <= EXAM4_FIXED_MAX
      )

      // Pool: Q1–150, pick 22 random
      const pool = allQuestions.filter(
        q => q.num >= EXAM4_POOL_MIN && q.num <= EXAM4_POOL_MAX
      )
      const randomPick = shuffleArray(pool).slice(0, EXAM4_RANDOM_COUNT)

      questions = [...fixed, ...randomPick]
    } else {
      const range = EXAM_RANGES[examId]
      questions = allQuestions.filter(
        q => q.num >= range.min && q.num <= range.max
      )
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: `No questions found for Exam ${examId}. Make sure the question bank is uploaded.` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      questions,
      total: questions.length,
      examId,
    })

  } catch (error: any) {
    console.error('Failed to fetch questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions.' },
      { status: 500 }
    )
  }
}