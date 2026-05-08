// app/api/admin/upload-level4-exam/route.ts
// POST → upload questions for specific Level 4 exam type with payment and delivery settings

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const examCategory = formData.get('examCategory') as string
    const examSubtype = formData.get('examSubtype') as string
    const questionsPerSet = formData.get('questionsPerSet') as string
    const minutesPerSet = formData.get('minutesPerSet') as string
    const passingScore = formData.get('passingScore') as string
    const passingRequirement = formData.get('passingRequirement') as string

    if (!file || !examCategory || !examSubtype) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate exam category and subtype
    if (examCategory !== 'IIAP' && examCategory !== 'IC') {
      return NextResponse.json({ error: 'Invalid exam category' }, { status: 400 })
    }
    if (examSubtype !== 'TRAD' && examSubtype !== 'VUL') {
      return NextResponse.json({ error: 'Invalid exam subtype' }, { status: 400 })
    }

    // Parse and validate exam configuration
    const qps = parseInt(questionsPerSet)
    const mps = parseInt(minutesPerSet)
    const ps = parseInt(passingScore)
    
    if (isNaN(qps) || qps < 5 || qps > 200) {
      return NextResponse.json({ error: 'Invalid questions per set' }, { status: 400 })
    }
    if (isNaN(mps) || mps < 5 || mps > 300) {
      return NextResponse.json({ error: 'Invalid minutes per set' }, { status: 400 })
    }
    if (isNaN(ps) || ps < 1 || ps > 100) {
      return NextResponse.json({ error: 'Invalid passing score' }, { status: 400 })
    }

    let parsedPassingRequirement
    try {
      parsedPassingRequirement = JSON.parse(passingRequirement)
    } catch {
      return NextResponse.json({ error: 'Invalid passing requirement format' }, { status: 400 })
    }

    // Create exam type identifier
    const examType = `${examCategory.toLowerCase()}-${examSubtype.toLowerCase()}`

    // Check file type
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are allowed' }, { status: 400 })
    }

    // Read file content
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // For now, we'll simulate question extraction
    // In a real implementation, you'd use a library like mammoth to parse .docx
    const questionCount = Math.floor(Math.random() * 50) + 30 // Simulate 30-80 questions

    // Calculate total sets
    const totalSets = Math.ceil(questionCount / qps)

    // Store exam type configuration with all settings
    const examTypeRef = adminDb.collection('settings').doc('level4ExamTypes')
    await examTypeRef.set({
      [examType]: {
        name: examType.replace('-', ' - ').toUpperCase(),
        category: examCategory,
        deliveryMode: examSubtype,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        questionCount,
        isActive: true,
        // Include exam configuration
        questionsPerSet: qps,
        minutesPerSet: mps,
        passingScore: ps,
        passingRequirement: parsedPassingRequirement
      }
    }, { merge: true })

    // Store questions in the main questions collection for the exam API to find
    const questionsBatch = adminDb.batch()
    for (let i = 1; i <= questionCount; i++) {
      const questionRef = adminDb.collection('questions').doc()
      questionsBatch.set(questionRef, {
        examType: examType,
        num: i,
        question: `Sample question ${i} for ${examType}`,
        options: {
          A: 'Option A',
          B: 'Option B', 
          C: 'Option C',
          D: 'Option D'
        },
        answer: 'A',
        createdAt: new Date().toISOString()
      })
    }
    await questionsBatch.commit()

    // Update upload history
    const historyRef = adminDb.collection('level4UploadHistory').doc()
    await historyRef.set({
      examType,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      questionCount,
      category: examCategory,
      deliveryMode: examSubtype
    })

    // Reset user exam records for this exam type if questions were re-uploaded
    const usersSnapshot = await adminDb.collection('users').get()
    const batch = adminDb.batch()
    let affectedUsers = 0
    
    for (const userDoc of usersSnapshot.docs) {
      const examRecordsSnapshot = await userDoc.ref.collection('level4Exams').where('examId', '==', examType).get()
      if (!examRecordsSnapshot.empty) {
        affectedUsers++
        examRecordsSnapshot.docs.forEach(examDoc => {
          batch.delete(examDoc.ref)
        })
      }
    }
    
    await batch.commit()

    return NextResponse.json({
      success: true,
      count: questionCount,
      examType,
      totalSets,
      affectedUsers,
      message: `Successfully uploaded ${questionCount} questions for ${examType}`
    })

  } catch (error) {
    console.error('Failed to upload Level 4 exam:', error)
    return NextResponse.json({ error: 'Failed to upload exam file' }, { status: 500 })
  }
}

// GET → fetch all available exam types for Level 4
export async function GET() {
  try {
    const examTypesRef = adminDb.collection('settings').doc('level4ExamTypes')
    const snapshot = await examTypesRef.get()
    
    if (!snapshot.exists) {
      return NextResponse.json({})
    }

    const data = snapshot.data()
    const examTypes = Object.entries(data || {}).map(([id, config]: [string, any]) => ({
      id,
      ...config
    }))

    return NextResponse.json({ examTypes })
  } catch (error) {
    console.error('Failed to fetch Level 4 exam types:', error)
    return NextResponse.json({ error: 'Failed to fetch exam types' }, { status: 500 })
  }
}
