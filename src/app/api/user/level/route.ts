import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    const { uid, level } = await request.json()
    
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (typeof level !== 'number' || level < 1) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 })
    }

    // Update user's current level
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
      currentLevel: level,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({ success: true, level })
  } catch (error) {
    console.error('Error updating user level:', error)
    return NextResponse.json({ error: 'Failed to update level' }, { status: 500 })
  }
}
