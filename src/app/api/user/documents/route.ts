import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const userRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      return NextResponse.json(userData.uploadedDocuments || [])
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

    const userRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userRef)
    
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const existingDocuments = userData.uploadedDocuments || []
    
    // Remove the specific document by type and level
    const updatedDocuments = existingDocuments.filter((doc: any) => 
      !(doc.type === type && doc.level === level)
    )
    
    await updateDoc(userRef, {
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

    const userRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const existingDocuments = userData.uploadedDocuments || []
      
      // Remove existing level 1 documents and add new ones
      const otherLevelDocuments = existingDocuments.filter((doc: any) => doc.level !== 1)
      const mergedDocuments = [...otherLevelDocuments, ...documents]
      
      await updateDoc(userRef, {
        uploadedDocuments: mergedDocuments,
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
