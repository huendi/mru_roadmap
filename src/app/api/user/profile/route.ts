import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { userAuth } from '@/lib/user-auth'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryUid = searchParams.get('uid')

    let uid: string
    
    if (queryUid) {
      // If uid is provided as query param, use it (for admin/debug purposes)
      uid = queryUid
    } else {
      // Otherwise, get the current authenticated user
      const authResult = await userAuth(request)
      if (!authResult.success) {
        return NextResponse.json({ error: authResult.error }, { status: 401 })
      }
      uid = authResult.user!.uid
    }

    const userDoc = await adminDb.collection('users').doc(uid).get()
    
    if (!userDoc.exists) {
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
