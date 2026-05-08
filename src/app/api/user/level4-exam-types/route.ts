// app/api/user/level4-exam-types/route.ts
// GET → fetch available Level 4 exam types for users

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 })
    }

    // Fetch available exam types from settings
    const examTypesRef = adminDb.collection('settings').doc('level4ExamTypes')
    const snapshot = await examTypesRef.get()
    
    if (!snapshot.exists) {
      return NextResponse.json({ examTypes: [] })
    }

    const data = snapshot.data()
    const allExamTypes = Object.entries(data || {})
      .filter(([_, config]: [string, any]) => config.isActive === true)
      .map(([id, config]: [string, any]) => ({
        id,
        name: config.name,
        category: config.category,
        deliveryMode: config.deliveryMode,
        paymentAmount: config.paymentAmount,
        deliveryMethod: config.deliveryMethod,
        questionCount: config.questionCount,
        fileName: config.fileName,
        uploadedAt: config.uploadedAt,
        // Include exam configuration properties from admin panel
        questionsPerSet: config.questionsPerSet,
        minutesPerSet: config.minutesPerSet,
        passingScore: config.passingScore,
        passingRequirement: config.passingRequirement
      }))

    // Get user's exam records to check what they've taken
    const userRef = adminDb.collection('users').doc(uid)
    const examRecordsSnapshot = await userRef.collection('level4Exams').get()
    const examRecords = examRecordsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Group exam types by category
    const examTypesByCategory = {
      IIAP: allExamTypes.filter(type => type.category === 'IIAP'),
      IC: allExamTypes.filter(type => type.category === 'IC')
    }

    // Check if user has taken exams from different categories
    const takenCategories = new Set(
      examRecords.map(record => {
        const examType = allExamTypes.find(type => type.id === record.id)
        return examType?.category
      }).filter(Boolean)
    )

    // Determine which categories are available for this user
    const availableCategories: string[] = []
    if (takenCategories.size === 0) {
      // User hasn't taken any exams, can choose any category
      if (examTypesByCategory.IIAP.length > 0) availableCategories.push('IIAP')
      if (examTypesByCategory.IC.length > 0) availableCategories.push('IC')
    } else if (takenCategories.has('IIAP')) {
      // User has taken IIAP, can only take IIAP exams
      if (examTypesByCategory.IIAP.length > 0) availableCategories.push('IIAP')
    } else if (takenCategories.has('IC')) {
      // User has taken IC, can only take IC exams
      if (examTypesByCategory.IC.length > 0) availableCategories.push('IC')
    }

    // Filter available exam types based on user's category restrictions
    const availableExamTypes = allExamTypes.filter(type => 
      availableCategories.includes(type.category)
    )

    // Fetch user's saved exam selection
    const userDoc = await userRef.get()
    const examSelection = userDoc.data()?.level4ExamSelection || null

    return NextResponse.json({
      examTypes: availableExamTypes,
      examTypesByCategory,
      takenCategories: Array.from(takenCategories),
      availableCategories,
      userExamRecords: examRecords,
      examSelection
    })

  } catch (error) {
    console.error('Failed to fetch Level 4 exam types:', error)
    return NextResponse.json({ error: 'Failed to fetch exam types' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uid, confirmedExams, selectedCategory } = body

    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 })
    }

    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()
    const userData = userDoc.data()

    // Check if user already has a saved selection and has taken exams
    const existingSelection = userData?.level4ExamSelection
    const examRecordsSnapshot = await userRef.collection('level4Exams').get()
    const hasTakenExams = !examRecordsSnapshot.empty

    let wasReset = false

    // If user is changing selection after taking exams, reset everything
    if (existingSelection && hasTakenExams) {
      // Delete all Level 4 exam records
      const deletePromises = examRecordsSnapshot.docs.map(doc => doc.ref.delete())
      await Promise.all(deletePromises)

      // Reset currentLevel back to 4 if it was 5
      if (userData?.currentLevel === 5) {
        await userRef.update({ currentLevel: 4 })
      }

      wasReset = true
    }

    // Save the new selection
    await userRef.update({
      level4ExamSelection: {
        confirmedExams,
        selectedCategory,
        confirmedAt: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      wasReset
    })

  } catch (error) {
    console.error('Failed to save Level 4 exam selection:', error)
    return NextResponse.json({ error: 'Failed to save exam selection' }, { status: 500 })
  }
}
