import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json()
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log(`🔧 Repairing uploadedDocuments for user: ${uid}`)

    // Get user document
    const userDoc = await adminDb.collection('users').doc(uid).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    
    // Check if uploadedDocuments is corrupted
    const currentDocs = userData?.uploadedDocuments
    
    console.log(`🔧 Current uploadedDocuments:`, currentDocs)
    
    // If uploadedDocuments is not an array or is corrupted, try to restore from requirements
    if (!Array.isArray(currentDocs)) {
      console.log(`🔧 uploadedDocuments is corrupted, attempting repair...`)
      
      const requirements = userData?.requirementsCompleted || []
      const repairedDocs: any[] = []
      
      // Check if user has documents_uploaded requirement
      if (requirements.includes('documents_uploaded')) {
        // Create dummy documents based on requirements
        if (requirements.includes('read_intro')) {
          repairedDocs.push({
            id: 'intro_read',
            type: 'intro',
            level: 1,
            url: '#',
            fileName: 'Introduction Read',
            uploadedAt: new Date().toISOString(),
            status: 'approved'
          })
        }
        
        // Add 4 basic documents for Level 1
        for (let i = 1; i <= 4; i++) {
          repairedDocs.push({
            id: `doc_${i}`,
            type: `document_${i}`,
            level: 1,
            url: '#',
            fileName: `Document ${i}`,
            uploadedAt: new Date().toISOString(),
            status: 'approved'
          })
        }
        
        // Check for Level 2 certificate
        if (requirements.includes('sltc_certificate_uploaded')) {
          repairedDocs.push({
            id: 'sltc_certificate',
            type: 'sltc_certificate',
            level: 2,
            url: '#',
            fileName: 'SLTC Certificate',
            uploadedAt: new Date().toISOString(),
            status: 'approved'
          })
        }
      }
      
      // Update user with repaired documents
      await adminDb.collection('users').doc(uid).update({
        uploadedDocuments: repairedDocs,
        updatedAt: new Date().toISOString()
      })
      
      console.log(`🔧 Repaired uploadedDocuments with ${repairedDocs.length} documents`)
      
      return NextResponse.json({
        success: true,
        message: 'Documents repaired successfully',
        documentsCount: repairedDocs.length,
        documents: repairedDocs
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Documents array is already valid',
      documentsCount: currentDocs.length,
      documents: currentDocs
    })
    
  } catch (error: any) {
    console.error('Error repairing user documents:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to repair documents' },
      { status: 500 }
    )
  }
}
