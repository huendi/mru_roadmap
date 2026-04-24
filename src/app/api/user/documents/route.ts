import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()
    
    if (userDoc.exists) {
      const userData = userDoc.data()
      return NextResponse.json(userData?.uploadedDocuments || [])
    }
    
    return NextResponse.json([])
  } catch (error: any) {
    console.error('Error fetching user documents:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, type, level } = body

    if (!uid || !type || level === undefined) {
      return NextResponse.json({ error: 'User ID, document type, and level are required' }, { status: 400 })
    }

    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const existingDocuments = userData?.uploadedDocuments || []
    
    const updatedDocuments = existingDocuments.filter((doc: any) => {
      return !(doc.type === type && (doc.level === level || doc.level === undefined || doc.level === null))
    })
    
    await userRef.update({
      uploadedDocuments: updatedDocuments,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user document:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, documents } = body

    if (!uid || !Array.isArray(documents)) {
      return NextResponse.json({ error: 'User ID and documents array are required' }, { status: 400 })
    }

    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()
    
    if (userDoc.exists) {
      const userData = userDoc.data()
      const existingDocuments = userData?.uploadedDocuments || []
      
      // Create a map of existing documents by their unique identifier (url + type + level)
      const existingDocMap = new Map()
      existingDocuments.forEach((doc: any) => {
        const key = `${doc.url}_${doc.type}_${doc.level}`
        existingDocMap.set(key, doc)
      })
      
      // Update or add incoming documents
      const updatedDocuments = [...existingDocuments]
      
      documents.forEach((incomingDoc: any) => {
        const key = `${incomingDoc.url}_${incomingDoc.type}_${incomingDoc.level}`
        const existingIndex = updatedDocuments.findIndex((doc: any) => 
          `${doc.url}_${doc.type}_${doc.level}` === key
        )
        
        if (existingIndex >= 0) {
          // Update existing document
          updatedDocuments[existingIndex] = incomingDoc
        } else {
          // Add new document
          updatedDocuments.push(incomingDoc)
        }
      })

      await userRef.update({
        uploadedDocuments: updatedDocuments,
        updatedAt: new Date().toISOString()
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving user documents:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save documents' },
      { status: 500 }
    )
  }
}