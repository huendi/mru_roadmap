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
    const searchParams = req.nextUrl.searchParams
    const examTypeId = searchParams.get('examTypeId')
    const setNumber = Number(searchParams.get('set') || '1')

    if (!examTypeId) {
      return NextResponse.json({ error: 'examTypeId required.' }, { status: 400 })
    }

    if (!setNumber || setNumber < 1) {
      return NextResponse.json({ error: 'Invalid set number.' }, { status: 400 })
    }

    // Load exam type configuration
    const examTypesDoc = await adminDb.collection('settings').doc('level4ExamTypes').get()
    if (!examTypesDoc.exists) {
      console.log('No exam types document found in settings')
      return NextResponse.json({ error: 'Exam types not found.' }, { status: 404 })
    }
    
    const examTypesData = examTypesDoc.data()!
    console.log('Available exam types:', Object.keys(examTypesData))
    console.log('Looking for exam type:', examTypeId)
    
    const examTypeConfig = examTypesData[examTypeId]
    
    if (!examTypeConfig) {
      console.log('Exam type not found:', examTypeId)
      return NextResponse.json({ error: `Exam type '${examTypeId}' not found.` }, { status: 404 })
    }
    
    if (examTypeConfig.isActive === false) {
      console.log('Exam type is inactive:', examTypeId)
      return NextResponse.json({ error: 'Exam type is inactive.' }, { status: 404 })
    }

    const questionsPerSet: number = examTypeConfig.questionsPerSet ?? 50

    // Load questions for this exam type
    const snapshot = await adminDb.collection('questions')
      .where('examType', '==', examTypeId)
      .get()

    console.log(`Found ${snapshot.docs.length} questions for exam type: ${examTypeId}`)

    const allQuestions = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => a.num - b.num) as { id: string; num: number; question: string; options: Record<string, string>; answer: string }[]

    const total     = allQuestions.length
    console.log(`Total questions after sorting: ${total}`)
    
    if (total === 0) {
      console.log('No questions found for this exam type')
      return NextResponse.json({ error: 'No questions found for this exam type. Please upload questions first.' }, { status: 404 })
    }
    
    const fullSets  = Math.floor(total / questionsPerSet)
    const remainder = total % questionsPerSet
    const totalSets = fullSets + (remainder > 0 ? 1 : 0)

    console.log(`Questions per set: ${questionsPerSet}, Full sets: ${fullSets}, Remainder: ${remainder}, Total sets: ${totalSets}`)

    if (setNumber > totalSets) {
      return NextResponse.json({ error: `Invalid set number. Only ${totalSets} sets available.` }, { status: 400 })
    }

    let questions: typeof allQuestions = []

    if (setNumber <= fullSets) {
      // Full set — fixed slice
      const start = (setNumber - 1) * questionsPerSet
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
      examTypeId,
      setNumber,
      totalSets,
    })

  } catch (error: any) {
    console.error('Failed to fetch level4 questions:', error)
    return NextResponse.json({ error: 'Failed to fetch questions.' }, { status: 500 })
  }
}