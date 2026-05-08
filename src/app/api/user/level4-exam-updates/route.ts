// app/api/user/level4-exam-updates/route.ts
// GET → check if user has Level 4 exam updates (new questions uploaded)

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { userAuth } from '@/lib/user-auth'
import { Level4ExamAttempt } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const queryUid = searchParams.get('uid')
    
    let uid: string
    
    if (queryUid) {
      // If uid is provided as query param, use it (for admin/debug purposes)
      uid = queryUid
    } else {
      // Otherwise, get the current authenticated user
      const authResult = await userAuth(req)
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: 401 })
      }
      uid = authResult.user!.uid
    }

    // Get user's current Level 4 exam attempts
    const userRef = adminDb.collection('users').doc(uid)
    const examAttemptsSnapshot = await userRef.collection('level4Exams').get()
    
    if (examAttemptsSnapshot.empty) {
      // No existing attempts, no update needed
      return NextResponse.json({ hasUpdate: false })
    }

    // Get the latest exam attempt to check bank version
    const examAttempts = examAttemptsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Level4ExamAttempt[]

    // Get current exam types and their upload dates
    const examTypesRef = adminDb.collection('settings').doc('level4ExamTypes')
    const examTypesSnapshot = await examTypesRef.get()
    
    if (!examTypesSnapshot.exists) {
      console.log('Level 4 exam types document not found, no updates available')
      return NextResponse.json({ hasUpdate: false, message: 'No exam types configured' })
    }

    const examTypesData = examTypesSnapshot.data()
    if (!examTypesData) {
      console.log('Level 4 exam types data is empty, no updates available')
      return NextResponse.json({ hasUpdate: false, message: 'No exam types data available' })
    }

    const userExamTypes = new Set(examAttempts.map(attempt => attempt.examId))

    // Check if any of the user's exam types have been updated
    let hasUpdate = false
    let updatedExams = []

    for (const examTypeId of userExamTypes) {
      const examTypeData = examTypesData[examTypeId]
      if (examTypeData && examTypeData.uploadedAt) {
        // Find the most recent attempt for this exam type
        const examTypeAttempts = examAttempts.filter(attempt => attempt.examId === examTypeId)
        
        if (examTypeAttempts.length === 0) {
          continue // Skip if no attempts found for this exam type
        }
        
        const mostRecentAttempt = examTypeAttempts.reduce((latest, current) => {
          // Validate dateTaken fields exist
          if (!current.dateTaken || !latest.dateTaken) {
            return latest // Keep the latest if dates are missing
          }
          return new Date(current.dateTaken) > new Date(latest.dateTaken) ? current : latest
        }, examTypeAttempts[0])
        
        // Skip if the most recent attempt doesn't have a dateTaken field
        if (!mostRecentAttempt || !mostRecentAttempt.dateTaken) {
          continue
        }

        // Compare upload dates - if exam was uploaded after user's last attempt, it's an update
        const examUploadDate = new Date(examTypeData.uploadedAt)
        const lastAttemptDate = new Date(mostRecentAttempt.dateTaken)

        // Validate dates are valid
        if (isNaN(examUploadDate.getTime()) || isNaN(lastAttemptDate.getTime())) {
          continue // Skip if dates are invalid
        }

        if (examUploadDate > lastAttemptDate) {
          hasUpdate = true
          updatedExams.push({
            examTypeId,
            examName: examTypeData.name || 'Unknown Exam',
            uploadedAt: examTypeData.uploadedAt,
            lastAttemptDate: mostRecentAttempt.dateTaken
          })
        }
      }
    }

    return NextResponse.json({
      hasUpdate,
      updatedExams,
      message: hasUpdate ? 'Exam questions have been updated by admin' : 'No updates available'
    })

  } catch (error) {
    console.error('Failed to check Level 4 exam updates:', error)
    // Return a safe response instead of an error to prevent breaking the dashboard
    return NextResponse.json({ 
      hasUpdate: false, 
      message: 'Unable to check exam updates at this time',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
