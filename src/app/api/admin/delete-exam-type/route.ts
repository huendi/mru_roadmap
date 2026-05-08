// app/api/admin/delete-exam-type/route.ts
// Deletes an exam type and all associated questions

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { examTypeId } = await req.json()

    if (!examTypeId) {
      return NextResponse.json({ error: 'examTypeId is required' }, { status: 400 })
    }

    // 1. Delete the exam type from settings
    const settingsRef = adminDb.collection('settings').doc('level4ExamTypes')
    const settingsDoc = await settingsRef.get()
    
    if (settingsDoc.exists) {
      const settingsData = settingsDoc.data()
      if (settingsData && settingsData[examTypeId]) {
        // Remove the exam type from the settings document
        const updatedSettings = { ...settingsData }
        delete updatedSettings[examTypeId]
        await settingsRef.set(updatedSettings)
      }
    }

    // 2. Delete all questions associated with this exam type
    const questionsSnapshot = await adminDb.collection('questions')
      .where('examType', '==', examTypeId)
      .get()

    const deletePromises = questionsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(deletePromises)

    // 3. Delete all user exam records for this exam type
    const usersSnapshot = await adminDb.collection('users').get()
    
    for (const userDoc of usersSnapshot.docs) {
      const userExamRef = userDoc.ref.collection('level4Exams').doc(examTypeId)
      await userExamRef.delete()
    }

    // 4. Delete from question_uploads if exists
    const uploadsSnapshot = await adminDb.collection('question_uploads')
      .where('examType', '==', examTypeId)
      .get()

    const uploadDeletePromises = uploadsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(uploadDeletePromises)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted exam type ${examTypeId} and all associated data`,
      deletedQuestions: questionsSnapshot.size,
      deletedUserRecords: usersSnapshot.size,
      deletedUploads: uploadsSnapshot.size
    })

  } catch (error: any) {
    console.error('Failed to delete exam type:', error)
    return NextResponse.json({ 
      error: 'Failed to delete exam type',
      details: error.message 
    }, { status: 500 })
  }
}
