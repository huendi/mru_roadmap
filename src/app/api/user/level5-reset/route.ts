import { NextRequest, NextResponse } from 'next/server'
import { userAuth } from '@/lib/user-auth'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const authResult = await userAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Reset Level 5 progress to starting point
    await adminDb
      .collection('users')
      .doc(authResult.user!.uid)
      .collection('levelProgress')
      .doc('level5')
      .set({
        userId: authResult.user!.uid,
        currentStep: 1,
        receiptUploaded: false,
        adminApproved: false,
      })

    // Reset user's currentLevel back to 5 since they need to complete Level 5 again
    await adminDb
      .collection('users')
      .doc(authResult.user!.uid)
      .update({
        currentLevel: 5,
        updatedAt: new Date().toISOString(),
      })

    // Remove Level 5 completion from completedRequirements
    await adminDb
      .collection('users')
      .doc(authResult.user!.uid)
      .collection('completedRequirements')
      .doc('level5_completed')
      .delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting Level 5:', error)
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 })
  }
}