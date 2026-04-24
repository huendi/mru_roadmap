// app/api/user/level4-exams/route.ts
// GET  → fetch all exam records for a user (resets stale records if bankVersion changed)
// POST → save a new exam attempt

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')

  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

  try {
    const userRef      = adminDb.collection('users').doc(uid)
    const examRef      = userRef.collection('level4Exams')
    const configDoc    = await adminDb.collection('settings').doc('level4ExamConfig').get()
    const currentVersion = configDoc.exists ? (configDoc.data()?.bankVersion ?? '') : ''

    const snapshot = await examRef.get()
    let exams = snapshot.docs.map(doc => doc.data())

    // If bank was re-uploaded (version mismatch), wipe stale records
    if (exams.length > 0 && exams[0]?.bankVersion !== currentVersion) {
      const batch = adminDb.batch()
      snapshot.docs.forEach(doc => batch.delete(doc.ref))
      await batch.commit()
      exams = []
    }

    // Compute totalSets from config
    const questionsSnap  = await adminDb.collection('questions').count().get()
    const totalQuestions = questionsSnap.data().count
    const perSet         = configDoc.exists ? (configDoc.data()?.questionsPerSet ?? 50) : 50
    const fullSets       = Math.floor(totalQuestions / perSet)
    const remainder      = totalQuestions % perSet
    const totalSets      = fullSets + (remainder > 0 ? 1 : 0)

    const passedCount = exams.filter(e => e.passed).length

    // Get passing requirement from config
    const passingRequirement = configDoc.exists ? (configDoc.data()?.passingRequirement) : null
    const requiredPasses = passingRequirement?.type === 'count' 
      ? (passingRequirement.requiredPasses || 1)
      : totalSets

    // Unlock level 5 if requirement is met
    if (totalSets > 0 && passedCount >= requiredPasses) {
      const userDoc  = await userRef.get()
      const userData = userDoc.data()
      if (userData && userData.currentLevel < 5) {
        await userRef.update({ currentLevel: 5 })
      }
    }

    return NextResponse.json({ exams, passedCount, totalSets })
  } catch (error) {
    console.error('Failed to fetch level4 exam records:', error)
    return NextResponse.json({ error: 'Failed to fetch exam records' }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      uid, examId, score, correctAnswers,
      totalQuestions, passed, dateTaken,
      bankVersion, totalSets,
    } = body

    if (!uid || !examId || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userRef  = adminDb.collection('users').doc(uid)
    const examRef  = userRef.collection('level4Exams').doc(`exam_${examId}`)
    const existing = await examRef.get()

    const passingScore = (await adminDb.collection('settings').doc('level4ExamConfig').get()).data()?.passingScore ?? 75

    const newAttempt = { score, correctAnswers, totalQuestions, passed, dateTaken }

    if (!existing.exists) {
      await examRef.set({
        examId,
        attempts: [newAttempt],
        bestScore: score,
        passed: score >= passingScore,
        lastAttempt: dateTaken,
        bankVersion: bankVersion ?? '',
      })
    } else {
      const currentBest = existing.data()?.bestScore ?? 0
      const newBest     = Math.max(currentBest, score)
      await examRef.update({
        attempts:    FieldValue.arrayUnion(newAttempt),
        bestScore:   newBest,
        passed:      newBest >= passingScore,
        lastAttempt: dateTaken,
        bankVersion: bankVersion ?? '',
      })
    }

    // Check if requirement is met → unlock level 5
    const allExamsSnap = await userRef.collection('level4Exams').get()
    const allExams     = allExamsSnap.docs.map(d => d.data())
    const passedCount  = allExams.filter(e => e.passed).length

    // Get passing requirement from config
    const configDoc = await adminDb.collection('settings').doc('level4ExamConfig').get()
    const passingRequirement = configDoc.exists ? (configDoc.data()?.passingRequirement) : null
    const requiredPasses = passingRequirement?.type === 'count' 
      ? (passingRequirement.requiredPasses || 1)
      : totalSets

    if (totalSets && passedCount >= requiredPasses) {
      const userDoc  = await userRef.get()
      const userData = userDoc.data()
      if (userData && userData.currentLevel < 5) {
        await userRef.update({ currentLevel: 5 })
      }
    }

    return NextResponse.json({ success: true, passedCount })
  } catch (error) {
    console.error('Failed to save level4 exam result:', error)
    return NextResponse.json({ error: 'Failed to save exam result' }, { status: 500 })
  }
}