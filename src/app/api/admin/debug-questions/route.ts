// Debug API to check what's in the database

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    console.log('=== DEBUG: Checking database contents ===')
    
    // Check exam types
    const examTypesDoc = await adminDb.collection('settings').doc('level4ExamTypes').get()
    console.log('Exam types document exists:', examTypesDoc.exists)
    
    if (examTypesDoc.exists) {
      const examTypesData = examTypesDoc.data()!
      console.log('Available exam types:', Object.keys(examTypesData))
      
      for (const [examTypeId, config] of Object.entries(examTypesData)) {
        console.log(`Exam type ${examTypeId}:`, config)
      }
    }
    
    // Check all questions in all collections
    const collections = ['questions', 'level4Questions']
    
    for (const collectionName of collections) {
      console.log(`\n=== Checking ${collectionName} collection ===`)
      const snapshot = await adminDb.collection(collectionName).get()
      console.log(`Found ${snapshot.docs.length} documents in ${collectionName}`)
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        console.log(`Document ${doc.id}:`, {
          examType: data.examType,
          num: data.num,
          question: data.question?.substring(0, 50) + '...',
          hasOptions: !!data.options,
          answer: data.answer
        })
      })
    }
    
    // Check questions by exam type if any exist
    if (examTypesDoc.exists) {
      const examTypesData = examTypesDoc.data()!
      for (const examTypeId of Object.keys(examTypesData)) {
        console.log(`\n=== Checking questions for exam type: ${examTypeId} ===`)
        
        const questionsSnapshot = await adminDb.collection('questions')
          .where('examType', '==', examTypeId)
          .get()
        
        console.log(`Found ${questionsSnapshot.docs.length} questions for ${examTypeId}`)
        
        questionsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          console.log(`Question ${data.num}:`, data.question?.substring(0, 50) + '...')
        })
      }
    }
    
    return NextResponse.json({
      message: 'Debug completed. Check server logs for details.',
      examTypesCount: examTypesDoc.exists ? Object.keys(examTypesDoc.data()!).length : 0
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}
