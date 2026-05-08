import { NextRequest, NextResponse } from 'next/server'
import { userAuth } from '@/lib/user-auth'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const authResult = await userAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const uid = authResult.user!.uid

    // Reset Level 5 progress
    await adminDb
      .collection('users')
      .doc(uid)
      .collection('levelProgress')
      .doc('level5')
      .set({
        userId: uid,
        currentStep: 0,
      })

    // Reset Level 4 exam selection
    await adminDb
      .collection('users')
      .doc(uid)
      .update({
        level4ExamSelection: {
          selectedCategory: null,
          confirmedExams: [],
          updatedAt: new Date().toISOString(),
        }
      })

    // Delete all Level 4 exam attempts
    const level4AttemptsSnapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('level4Exams')
      .get()

    const level4DeletePromises = level4AttemptsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(level4DeletePromises)

    // Also delete any examAttempts (for Level 5)
    const examAttemptsSnapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('examAttempts')
      .get()

    const examDeletePromises = examAttemptsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(examDeletePromises)

    await adminDb
    .collection('users')
    .doc(uid)
    .update({
      currentLevel: 4,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting Level 4:', error)
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 })
  }
}