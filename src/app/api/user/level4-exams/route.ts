// app/api/user/level4-exams/route.ts
// GET  → fetch all exam records for a user (resets stale records if bankVersion changed)
// POST → save a new exam attempt

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

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

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')

  console.log('GET /api/user/level4-exams for uid:', uid)

  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

  try {
    const userRef      = adminDb.collection('users').doc(uid)
    const examRef      = userRef.collection('level4Exams')
    const configDoc    = await adminDb.collection('settings').doc('level4ExamConfig').get()
    const currentVersion = configDoc.exists ? (configDoc.data()?.bankVersion ?? '') : ''

    const snapshot = await examRef.get()
    console.log('🔍 GET - Found exam documents:', snapshot.docs.length)
    console.log('🔍 GET - Document IDs:', snapshot.docs.map(d => d.id))
    
    let examAttempts: ExamAttempt[] = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() as Omit<ExamAttempt, 'id'>
    }))

    console.log('🔍 GET - Exam attempts retrieved (raw):', examAttempts)
    console.log('🔍 GET - Exam attempts data details:', examAttempts.map(a => ({
      id: a.id,
      examId: a.examId,
      setNumber: a.setNumber,
      score: a.score,
      passed: a.passed,
      dateTaken: a.dateTaken,
      durationMinutes: a.durationMinutes
    })))

    // Check if there's a version mismatch issue
    if (examAttempts.length > 0) {
      console.log('🔍 GET - First attempt bankVersion:', examAttempts[0]?.bankVersion)
      console.log('🔍 GET - Current bankVersion:', currentVersion)
      console.log('🔍 GET - Version mismatch?', examAttempts[0]?.bankVersion !== currentVersion)
    }

    // If bank was re-uploaded (version mismatch), warn but don't delete records
    if (examAttempts.length > 0 && examAttempts[0]?.bankVersion !== currentVersion) {
      console.log('⚠️ Bank version mismatch detected, but preserving exam records')
      console.log('⚠️ Stored version:', examAttempts[0]?.bankVersion, 'Current version:', currentVersion)
      // Don't delete records - just log the mismatch
      // const batch = adminDb.batch()
      // snapshot.docs.forEach(doc => batch.delete(doc.ref))
      // await batch.commit()
      // examAttempts = []
    }

    // Group attempts by exam type and set number for progress calculation
    const attemptsByExamSet = new Map<string, ExamAttempt>()
    examAttempts.forEach(attempt => {
      const key = `${attempt.examId}_set_${attempt.setNumber}`
      if (!attemptsByExamSet.has(key) || attempt.score > attemptsByExamSet.get(key)!.score) {
        attemptsByExamSet.set(key, attempt)
      }
    })

    const uniqueExamSets = Array.from(attemptsByExamSet.values())
    const passedCount = uniqueExamSets.filter(e => e.passed).length

    // Get passing requirement from config
    const passingRequirement = configDoc.exists ? (configDoc.data()?.passingRequirement) : null
    
    // For Level 4, we need to calculate total sets based on user's confirmed exams
    // This will be handled on the frontend, so we return the attempts
    const totalSets = 0 // Will be calculated on frontend

    // Unlock level 5 if requirement is met (using frontend calculation)
    if (totalSets > 0 && passedCount >= totalSets) {
      const userDoc  = await userRef.get()
      const userData = userDoc.data()
      if (userData && userData.currentLevel < 5) {
        await userRef.update({ currentLevel: 5 })
      }
    }

    return NextResponse.json({ 
      examAttempts: examAttempts.sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime()),
      passedCount, 
      totalSets 
    })
  } catch (error) {
    console.error('Failed to fetch level4 exam records:', error)
    return NextResponse.json({ error: 'Failed to fetch exam records' }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('POST /api/user/level4-exams received full body:', JSON.stringify(body, null, 2))
    
    const {
      uid, examId, score, correctAnswers,
      totalQuestions, passed, dateTaken,
      bankVersion, totalSets, durationMinutes, setNumber,
    } = body

    console.log('Extracted fields:', {
      uid, examId, score, correctAnswers,
      totalQuestions, passed, dateTaken,
      bankVersion, totalSets, durationMinutes, setNumber
    })

    if (!uid || !examId || score === undefined) {
      console.error('Missing required fields:', { uid, examId, score })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userRef  = adminDb.collection('users').doc(uid)
    
    // Create unique document ID for each exam set attempt
    const setAttemptId = `exam_${examId}_set_${body.setNumber || 1}_${Date.now()}`
    const examSetRef = userRef.collection('level4Exams').doc(setAttemptId)

    console.log('Saving exam attempt with ID:', setAttemptId)

    const passingScore = (await adminDb.collection('settings').doc('level4ExamConfig').get()).data()?.passingScore ?? 75

    // Save individual exam set attempt
    const examData = {
      examId,
      setNumber: body.setNumber || 1,
      score,
      correctAnswers,
      totalQuestions,
      passed,
      dateTaken,
      bankVersion: bankVersion ?? '',
      durationMinutes: durationMinutes || null,
    }

    console.log('Saving exam data:', examData)
    await examSetRef.set(examData)

    console.log('Exam attempt saved successfully with ID:', setAttemptId)

    // Verify it was saved by immediately reading it back
    const savedDoc = await examSetRef.get()
    if (savedDoc.exists) {
      console.log('Verification - saved data:', savedDoc.data())
    } else {
      console.error('ERROR: Failed to verify saved document!')
    }

    // Check if requirement is met → unlock level 5
    const allExamsSnap = await userRef.collection('level4Exams').get()
    console.log('📊 All exams in level4Exams collection:', allExamsSnap.docs.length)
    console.log('📊 All exam IDs:', allExamsSnap.docs.map(d => d.id))
    
    const allExams     = allExamsSnap.docs.map(d => d.data())
    console.log('📊 All exam data:', allExams)
    
    const passedCount  = allExams.filter(e => e.passed).length
    console.log('📊 Passed count:', passedCount)

    // Get passing requirement from config
    const configDoc = await adminDb.collection('settings').doc('level4ExamConfig').get()
    const passingRequirement = configDoc.exists ? (configDoc.data()?.passingRequirement) : null
    const requiredPasses = passingRequirement?.type === 'count' 
      ? (passingRequirement.requiredPasses || 1)
      : totalSets

    console.log('📊 Required passes:', requiredPasses, 'Total sets:', totalSets)

    if (totalSets && passedCount >= requiredPasses) {
      const userDoc  = await userRef.get()
      const userData = userDoc.data()
      if (userData && userData.currentLevel < 5) {
        await userRef.update({ currentLevel: 5 })
        console.log('🎉 User leveled up to 5!')
      }
    }

    console.log('✅ POST response:', { success: true, passedCount })
    return NextResponse.json({ success: true, passedCount })
  } catch (error) {
    console.error('Failed to save level4 exam result:', error)
    return NextResponse.json({ error: 'Failed to save exam result' }, { status: 500 })
  }
}