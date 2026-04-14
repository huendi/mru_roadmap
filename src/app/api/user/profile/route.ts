import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, updateDoc } from 'firebase/firestore'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { uid, name, contact, birthday, address, displayName } = body

    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const userRef = doc(db, 'users', uid)
    
    await updateDoc(userRef, {
      name: name || '',
      contact: contact || '',
      birthday: birthday || '',
      address: address || '',
      displayName: displayName || name || '',
      profileCompleted: true,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const userDoc = await getDoc(doc(db, 'users', uid))
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: userDoc.data() })
  } catch (error: any) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

import { getDoc } from 'firebase/firestore'
