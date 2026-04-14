// app/api/user/level3-exams/route.ts
// GET  → fetch all exam records for a user
// POST → save a new exam attempt

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// ── GET: fetch exam records ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')

  if (!uid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 })
  }

  try {
    const userRef = adminDb.collection('users').doc(uid)
    const examRecordsRef = userRef.collection('level3Exams')
    const snapshot = await examRecordsRef.get()

    const exams = snapshot.docs.map(doc => doc.data())

    // Count how many exams are passed (based on best score)
    const passedCount = exams.filter(e => e.passed).length

    // Check if level 4 should be unlocked
    if (passedCount >= 3) {
      // Unlock level 4 if not already unlocked
      const userDoc = await userRef.get()
      const userData = userDoc.data()
      if (userData && userData.currentLevel < 4) {
        await userRef.update({ currentLevel: 4 })
      }
    }

    return NextResponse.json({ exams, passedCount })
  } catch (error) {
    console.error('Failed to fetch exam records:', error)
    return NextResponse.json({ error: 'Failed to fetch exam records' }, { status: 500 })
  }
}

// ── POST: save exam attempt ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uid, examId, score, correctAnswers, totalQuestions, passed, dateTaken } = body

    if (!uid || !examId || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userRef = adminDb.collection('users').doc(uid)
    const examRef = userRef.collection('level3Exams').doc(`exam_${examId}`)

    const existingDoc = await examRef.get()
    const existing = existingDoc.data()

    const newAttempt = {
      score,
      correctAnswers,
      totalQuestions,
      passed,
      dateTaken
    }

    if (!existingDoc.exists) {
      // First attempt
      await examRef.set({
        examId,
        attempts: [newAttempt],
        bestScore: score,
        passed,
        lastAttempt: dateTaken
      })
    } else {
      // Add to existing attempts
      const currentBest = existing?.bestScore || 0
      const newBest = Math.max(currentBest, score)
      const isPassed = newBest >= 75 // 75% passing score

      await examRef.update({
        attempts: FieldValue.arrayUnion(newAttempt),
        bestScore: newBest,
        passed: isPassed,
        lastAttempt: dateTaken
      })
    }

    // Check if level 4 should be unlocked
    const allExamsSnapshot = await userRef.collection('level3Exams').get()
    const allExams = allExamsSnapshot.docs.map(d => d.data())
    const passedCount = allExams.filter(e => e.passed).length

    if (passedCount >= 3) {
      const userDoc = await userRef.get()
      const userData = userDoc.data()
      if (userData && userData.currentLevel < 4) {
        await userRef.update({ currentLevel: 4 })
      }
    }

    return NextResponse.json({ success: true, passedCount })
  } catch (error) {
    console.error('Failed to save exam result:', error)
    return NextResponse.json({ error: 'Failed to save exam result' }, { status: 500 })
  }
}