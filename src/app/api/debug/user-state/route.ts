import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user document
    const userDoc = await adminDb.collection('users').doc(uid).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    
    // Get user documents
    const documents = userData?.uploadedDocuments || []
    
    // Get Level 5 progress
    const level5Doc = await adminDb
      .collection('users')
      .doc(uid)
      .collection('levelProgress')
      .doc('level5')
      .get()
    
    const level5Data = level5Doc.exists ? level5Doc.data() : null

    // Calculate progress
    const level1Docs = documents.filter((doc: any) => doc.level === 1).length
    const requirements = userData?.requirementsCompleted || []
    
    const debugData = {
      uid,
      userData: {
        currentLevel: userData?.currentLevel,
        requirementsCompleted: userData?.requirementsCompleted,
        uploadedDocuments: userData?.uploadedDocuments,
        email: userData?.email,
        name: userData?.name,
        displayName: userData?.displayName,
      },
      calculatedProgress: {
        level1DocumentCount: level1Docs,
        requirementsCount: requirements.length,
        requirementsList: requirements,
      },
      level5Progress: level5Data,
      documents: documents,
    }

    return NextResponse.json(debugData)
  } catch (error: any) {
    console.error('Debug user state error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch debug data' },
      { status: 500 }
    )
  }
}
