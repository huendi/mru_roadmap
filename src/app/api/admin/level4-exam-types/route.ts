// app/api/admin/level4-exam-types/route.ts
// GET → fetch available Level 4 exam types for admin

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET() {
  try {
    // Fetch available exam types from settings
    const examTypesRef = adminDb.collection('settings').doc('level4ExamTypes')
    const snapshot = await examTypesRef.get()
    
    if (!snapshot.exists) {
      return NextResponse.json({})
    }

    const data = snapshot.data()
    return NextResponse.json(data || {})

  } catch (error) {
    console.error('Failed to fetch Level 4 exam types:', error)
    return NextResponse.json({ error: 'Failed to fetch exam types' }, { status: 500 })
  }
}

// DELETE → remove an exam type and all associated data
export async function DELETE(req: NextRequest) {
  try {
    const { examTypeId } = await req.json()
    console.log('DELETE request received for examTypeId:', examTypeId)

    if (!examTypeId) {
      console.log('No examTypeId provided')
      return NextResponse.json({ error: 'examTypeId required' }, { status: 400 })
    }

    // Delete exam type from settings
    console.log('Deleting exam type from settings...')
    const examTypesRef = adminDb.collection('settings').doc('level4ExamTypes')
    await examTypesRef.update({
      [examTypeId]: FieldValue.delete()
    })
    console.log('Exam type deleted from settings')

    // Delete all questions for this exam type
    console.log('Finding questions to delete...')
    const questionsSnapshot = await adminDb.collection('questions')
      .where('examType', '==', examTypeId)
      .get()
    
    console.log(`Found ${questionsSnapshot.docs.length} questions to delete`)
    const batch = adminDb.batch()
    questionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    await batch.commit()
    console.log('Questions deleted successfully')

    // Delete all user exam records for this exam type
    console.log('Deleting user exam records...')
    const usersSnapshot = await adminDb.collection('users').get()
    const userBatch = adminDb.batch()
    let deletedUserRecords = 0
    
    for (const userDoc of usersSnapshot.docs) {
      const examRecordsSnapshot = await userDoc.ref.collection('level4Exams')
        .where('examId', '==', examTypeId)
        .get()
      
      if (!examRecordsSnapshot.empty) {
        examRecordsSnapshot.docs.forEach(examDoc => {
          userBatch.delete(examDoc.ref)
          deletedUserRecords++
        })
      }
    }
    await userBatch.commit()
    console.log(`Deleted ${deletedUserRecords} user exam records`)

    console.log('Delete operation completed successfully')
    return NextResponse.json({
      success: true,
      message: `Successfully deleted exam type ${examTypeId}`
    })

  } catch (error) {
    console.error('Failed to delete Level 4 exam type:', error)
    return NextResponse.json({ error: 'Failed to delete exam type' }, { status: 500 })
  }
}
