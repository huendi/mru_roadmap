import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { uid, requirementId } = body

    if (!uid || !requirementId) {
      return NextResponse.json(
        { error: 'User ID and requirement ID are required' },
        { status: 400 }
      )
    }

    const userRef = doc(db, 'users', uid)
    
    await updateDoc(userRef, {
      requirementsCompleted: arrayUnion(requirementId),
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Requirement update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update requirement' },
      { status: 500 }
    )
  }
}
