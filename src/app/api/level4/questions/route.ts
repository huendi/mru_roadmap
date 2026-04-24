// app/api/level4/questions/route.ts
// Returns questions for a given examId set.
// Set distribution logic:
//   fullSets = Math.floor(totalQuestions / questionsPerSet)
//   Each full set gets a fixed slice of questions ordered by num.
//   If there are remaining questions (totalQuestions % questionsPerSet > 0),
//   a final set is created: remaining questions + random fill from all questions
//   (no duplicates within that set) to reach questionsPerSet count.

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

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

    if (!examId || examId < 1) {
      return NextResponse.json({ error: 'Invalid examId.' }, { status: 400 })
    }

    // Load exam config
    const configDoc = await adminDb.collection('settings').doc('level4ExamConfig').get()
    if (!configDoc.exists) {
      return NextResponse.json({ error: 'Exam config not found.' }, { status: 404 })
    }
    const cfg = configDoc.data()!
    const questionsPerSet: number = cfg.questionsPerSet ?? 50

    // Load all questions sorted by num
    const snapshot = await adminDb.collection('questions').orderBy('num', 'asc').get()
    if (snapshot.empty) {
      return NextResponse.json({ error: 'No questions found.' }, { status: 404 })
    }

    const allQuestions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as { id: string; num: number; question: string; options: Record<string, string>; answer: string }[]

    const total     = allQuestions.length
    const fullSets  = Math.floor(total / questionsPerSet)
    const remainder = total % questionsPerSet
    const totalSets = fullSets + (remainder > 0 ? 1 : 0)

    if (examId > totalSets) {
      return NextResponse.json({ error: `Invalid examId. Only ${totalSets} sets available.` }, { status: 400 })
    }

    let questions: typeof allQuestions = []

    if (examId <= fullSets) {
      // Full set — fixed slice
      const start = (examId - 1) * questionsPerSet
      const end   = start + questionsPerSet
      questions   = allQuestions.slice(start, end)
    } else {
      // Last partial set — remainder + random fill, no duplicates
      const remainderQuestions = allQuestions.slice(fullSets * questionsPerSet)
      const remainderNums      = new Set(remainderQuestions.map(q => q.num))
      const pool               = allQuestions.filter(q => !remainderNums.has(q.num))
      const needed             = questionsPerSet - remainderQuestions.length
      const randomFill         = shuffleArray(pool).slice(0, needed)
      questions                = [...remainderQuestions, ...randomFill]
    }

    return NextResponse.json({
      questions,
      total: questions.length,
      examId,
      totalSets,
    })

  } catch (error: any) {
    console.error('Failed to fetch level4 questions:', error)
    return NextResponse.json({ error: 'Failed to fetch questions.' }, { status: 500 })
  }
}