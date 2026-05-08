import { NextRequest, NextResponse } from 'next/server'
import { userAuth } from '@/lib/user-auth'
import { adminDb } from '@/lib/firebase-admin'

// User Level 5 Exam Progress API
interface ExamProgress {
  userId: string
  currentStep: number // 1-4
  examType?: 'ic' | 'iiap'
  icMode?: 'trad' | 'vul' | 'both' | null
  iiapMode?: 'trad' | 'vul' | 'both' | null
  examModes?: {
    [examType: string]: 'face-to-face' | 'online' | null
  }
  selectedExams?: string[]
  level4Category?: 'IIAP' | 'IC' | null
  level4DeliveryModes?: any[]
  scheduleId?: string
  receiptUploaded?: boolean
  receiptUrl?: string
  adminApproved?: boolean
  adminDecision?: 'passed' | 'failed' | 'pending' | 'not_started'
  completedAt?: string
  resetProgress?: boolean // For handling rejection reset
}

// GET - Fetch user's Level 5 progress
export async function GET(request: NextRequest) {
  try {
    const authResult = await userAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Fetch user's Level 5 progress from Firestore
    const progressDoc = await adminDb
      .collection('users')
      .doc(authResult.user!.uid)
      .collection('levelProgress')
      .doc('level5')
      .get()

    // Get user's current level to determine if we should create default Level 5 data
    const userDoc = await adminDb
      .collection('users')
      .doc(authResult.user!.uid)
      .get()
    
    const userData = userDoc.exists ? userDoc.data() as any : {}
    const userCurrentLevel = userData.currentLevel || 1

    let progress: ExamProgress
    if (progressDoc.exists) {
      progress = progressDoc.data() as ExamProgress
    } else if (userCurrentLevel >= 4) {
      // Create default Level 5 progress for users at Level 4+
      progress = {
        userId: authResult.user!.uid,
        currentStep: 1,
        adminDecision: 'not_started',
      }
      console.log('🔍 Created default Level 5 progress for user at level:', userCurrentLevel)
    } else {
      // User not at Level 4+, return minimal data
      progress = {
        userId: authResult.user!.uid,
        currentStep: 0,
      }
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Error fetching Level 5 progress:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

// POST - Update user's Level 5 progress
export async function POST(request: NextRequest) {
  try {
    const authResult = await userAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const requestBody = await request.json()
    const updateData: Partial<ExamProgress> = requestBody
    const currentLevel = requestBody.currentLevel as number | undefined

    // Validate step progression
    const currentDoc = await adminDb
      .collection('users')
      .doc(authResult.user!.uid)
      .collection('levelProgress')
      .doc('level5')
      .get()

    const currentProgress = currentDoc.exists ? currentDoc.data() as ExamProgress : {
      userId: authResult.user!.uid,
      currentStep: 0,
    }

    // Handle rejection - reset progress to step 0
    if (updateData.resetProgress === true) {
    const resetProgress: ExamProgress = {
      userId: authResult.user!.uid,
      currentStep: 0,
      receiptUploaded: false,
      adminApproved: false,
    }

      await adminDb
        .collection('users')
        .doc(authResult.user!.uid)
        .collection('levelProgress')
        .doc('level5')
        .set(resetProgress)

      return NextResponse.json({ success: true, progress: resetProgress, message: 'Progress reset to start' })
    }

    // Allow step progression, regression, and same-step updates for Change button functionality
    // Only prevent invalid step jumps (more than 1 step back at a time)
    const currentStep = currentProgress.currentStep || 0
    if (updateData.currentStep && updateData.currentStep < currentStep - 1 && !updateData.resetProgress && currentStep > 0) {
      console.log('Invalid step jump detected:', {
        currentStep: currentStep,
        requestedStep: updateData.currentStep,
        resetProgress: updateData.resetProgress
      })
      return NextResponse.json({ error: 'Cannot jump back multiple steps at once' }, { status: 400 })
    }
    
    // Allow same step updates and single step regression for Change button functionality
    if (updateData.currentStep) {
      if (updateData.currentStep === currentStep) {
        console.log('Same step update allowed - preserving data')
      } else if (updateData.currentStep === currentStep - 1) {
        console.log('Single step regression allowed - Change button functionality')
      } else if (updateData.currentStep > currentStep) {
        console.log('Step progression allowed')
      }
    }

    // Update progress
    const updatedProgress: ExamProgress = {
      ...currentProgress,
      ...updateData,
      userId: authResult.user!.uid,
    }

    await adminDb
      .collection('users')
      .doc(authResult.user!.uid)
      .collection('levelProgress')
      .doc('level5')
      .set(updatedProgress)

    // Handle level updates based on currentLevel parameter or normal progression
    if (currentLevel !== undefined) {
      // Explicit level change requested (for reset functionality)
      await adminDb
        .collection('users')
        .doc(authResult.user!.uid)
        .update({
          currentLevel: currentLevel,
          updatedAt: new Date().toISOString(),
        })
    } else if (updatedProgress.currentStep === 4 && updatedProgress.adminDecision === 'passed') {
      // Normal progression to Level 6 when passed
      await adminDb
        .collection('users')
        .doc(authResult.user!.uid)
        .update({
          currentLevel: 6,
          updatedAt: new Date().toISOString(),
        })

      // Add to completed requirements
      await adminDb
        .collection('users')
        .doc(authResult.user!.uid)
        .collection('completedRequirements')
        .doc('level5_completed')
        .set({
          completedAt: new Date().toISOString(),
          step: 'licensure_exam_completed'
        })
    }

    return NextResponse.json({ success: true, progress: updatedProgress })
  } catch (error) {
    console.error('Error updating Level 5 progress:', error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}
