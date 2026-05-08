import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/admin-auth'
import { adminDb } from '@/lib/firebase-admin'

// Admin API for managing Level 5 exam approvals
interface ExamApproval {
  userId: string
  userEmail: string
  userName: string
  examType: 'ic' | 'iiap'
  iiapMode?: 'face-to-face' | 'online'
  scheduleId: string
  scheduleDate: string
  receiptUrl?: string
  currentStep: number
  adminDecision?: 'passed' | 'failed' | 'pending'
  adminNotes?: string
  submittedAt: string
  reviewedAt?: string
}

// GET - Fetch all pending exam approvals
export async function GET(request: NextRequest) {
  try {
    const auth = await adminAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    // Query users with Level 5 progress - look for users who have uploaded receipts
    // and are waiting for admin review (adminDecision: pending or not set)
    let usersSnapshot: any[] = []
    
    try {
      console.log('🔍 Starting query for users with receipts...')
      const usersWithReceiptSnapshot = await adminDb
        .collectionGroup('levelProgress')
        .where('receiptUploaded', '==', true)
        .get()
      
      usersSnapshot = usersWithReceiptSnapshot.docs
      console.log('🔍 Query successful, found users with receipts:', usersSnapshot.length)
    } catch (queryError) {
      console.error('🔍 Query failed:', queryError)
      // Fallback: try direct collection query if collectionGroup fails
      try {
        console.log('🔍 Trying fallback query...')
        const allUsers = await adminDb.collection('users').listDocuments()
        usersSnapshot = []
        
        for (const userDoc of allUsers) {
          try {
            const level5Doc = await adminDb
              .collection('users')
              .doc(userDoc.id)
              .collection('levelProgress')
              .doc('level5')
              .get()
            
            if (level5Doc.exists && level5Doc.data()?.receiptUploaded) {
              usersSnapshot.push(level5Doc)
            }
          } catch (userDocError) {
            // Skip users we can't access
            continue
          }
        }
        console.log('🔍 Fallback query found users with receipts:', usersSnapshot.length)
      } catch (fallbackError) {
        console.error('🔍 Fallback query also failed:', fallbackError)
        throw new Error('Failed to query users with receipts: ' + fallbackError.message)
      }
    }

    const approvals: ExamApproval[] = []

    for (const doc of usersSnapshot) {
      const progress = doc.data()
      const userId = doc.ref.parent.parent?.id || ''
      const userDoc = await adminDb.collection('users').doc(userId).get()
      const userData = userDoc.data()

      console.log('🔍 Processing user:', userId, 'adminDecision:', progress.adminDecision, 'receiptUploaded:', progress.receiptUploaded)

      // Migration: If user has receiptUploaded but no currentStep, set it to 3
      if (progress.receiptUploaded && !progress.currentStep) {
        await doc.ref.update({ currentStep: 3 })
        progress.currentStep = 3
        console.log('Migrated user missing currentStep:', userId)
      }

      if (userData && (!status || progress.adminDecision === status || (status === 'pending' && (!progress.adminDecision || progress.adminDecision === 'pending')))) {
        approvals.push({
          userId: doc.ref.parent.parent?.id || '',
          userEmail: userData.email || '',
          userName: userData.displayName || userData.name || '',
          examType: progress.examType,
          iiapMode: progress.iiapMode,
          scheduleId: progress.scheduleId,
          scheduleDate: progress.scheduleDate || '',
          receiptUrl: progress.receiptUrl,
          currentStep: progress.currentStep,
          adminDecision: progress.adminDecision || 'pending',
          adminNotes: progress.adminNotes,
          submittedAt: progress.submittedAt || '',
          reviewedAt: progress.reviewedAt,
        })
      }
    }

    // Sort by submitted date (newest first)
    approvals.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

    console.log('🔍 Final approvals count:', approvals.length)
    console.log('🔍 Approvals:', approvals.map(a => ({ userId: a.userId, decision: a.adminDecision })))

    return NextResponse.json(approvals)
  } catch (error) {
    console.error('Error fetching exam approvals:', error)
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

// POST - Update exam approval decision
export async function POST(request: NextRequest) {
  try {
    const auth = await adminAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { userId, uid, decision, status, notes, reason, examScore } = await request.json()
    
    // Support both parameter names for compatibility
    const finalUserId = userId || uid
    const finalDecision = decision || status
    const finalNotes = notes || reason
    const finalExamScore = examScore || '0'

    if (!finalUserId || !finalDecision || !['passed', 'failed'].includes(finalDecision)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Update user's Level 5 progress
    if (finalDecision === 'failed') {
      // If rejected, reset progress to step 1 so user can repeat the level
      await adminDb
        .collection('users')
        .doc(finalUserId)
        .collection('levelProgress')
        .doc('level5')
        .update({
          adminDecision: finalDecision,
          adminNotes: finalNotes || '',
          examScore: parseFloat(finalExamScore),
          reviewedAt: new Date().toISOString(),
          currentStep: 1, // Reset to step 1 for retry
          examType: null, // Clear previous selections
          icMode: null,
          iiapMode: null,
          scheduleId: null,
          receiptUploaded: false,
          receiptUrl: null,
        })
    } else {
      // If passed, complete the process
      await adminDb
        .collection('users')
        .doc(finalUserId)
        .collection('levelProgress')
        .doc('level5')
        .update({
          adminDecision: finalDecision,
          adminNotes: finalNotes || '',
          examScore: parseFloat(finalExamScore),
          reviewedAt: new Date().toISOString(),
          currentStep: 4, // Final step
        })

      // Update user's level to 6
      await adminDb
        .collection('users')
        .doc(finalUserId)
        .update({
          currentLevel: 6,
          updatedAt: new Date().toISOString(),
        })

      // Add to completed requirements
      await adminDb
        .collection('users')
        .doc(finalUserId)
        .collection('completedRequirements')
        .doc('level5_completed')
        .set({
          completedAt: new Date().toISOString(),
          step: 'licensure_exam_completed'
        })
    }

    return NextResponse.json({ success: true, decision: finalDecision })
  } catch (error) {
    console.error('Error updating exam approval:', error)
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
  }
}
