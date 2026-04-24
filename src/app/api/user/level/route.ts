import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { uid, level } = await request.json()

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (typeof level !== 'number' || level < 1) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 })
    }

    const userRef = adminDb.doc(`users/${uid}`)
    await userRef.update({
      currentLevel: level,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({ success: true, level })
  } catch (error) {
    console.error('Error updating user level:', error)
    return NextResponse.json({ error: 'Failed to update level' }, { status: 500 })
  }
}