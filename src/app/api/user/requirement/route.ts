import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

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

    const userRef = adminDb.doc(`users/${uid}`)
    await userRef.update({
      requirementsCompleted: FieldValue.arrayUnion(requirementId),
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

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { uid, requirementId } = body

    if (!uid || !requirementId) {
      return NextResponse.json(
        { error: 'User ID and requirement ID are required' },
        { status: 400 }
      )
    }

    const userRef = adminDb.doc(`users/${uid}`)
    await userRef.update({
      requirementsCompleted: FieldValue.arrayRemove(requirementId),
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Requirement removal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove requirement' },
      { status: 500 }
    )
  }
}