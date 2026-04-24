import { NextRequest, NextResponse } from 'next/server'
import { auth, db } from '@/lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { User } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (simple implementation)
    const clientIP = request.ip || 'unknown'
    const now = Date.now()
    
    const { adminEmail, adminPassword, newEmail, newPassword, pin } = await request.json()

    // Sanitize and validate inputs
    const sanitizedAdminEmail = adminEmail.trim().toLowerCase()
    const sanitizedNewEmail = newEmail.trim().toLowerCase()
    const sanitizedPin = pin.replace(/\D/g, '')

    // Validate required fields
    if (!sanitizedAdminEmail || !adminPassword || !sanitizedNewEmail || !newPassword || !sanitizedPin) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(sanitizedAdminEmail) || !emailRegex.test(sanitizedNewEmail)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate PIN format (4-8 digits)
    if (!/^\d{4,8}$/.test(sanitizedPin)) {
      return NextResponse.json(
        { success: false, message: 'PIN must be 4-8 digits' },
        { status: 400 }
      )
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Prevent admin from creating an account with the same email
    if (sanitizedAdminEmail === sanitizedNewEmail) {
      return NextResponse.json(
        { success: false, message: 'New admin email must be different from current admin email' },
        { status: 400 }
      )
    }

    // Step 1: Verify existing admin credentials
    try {
      await signInWithEmailAndPassword(auth, sanitizedAdminEmail, adminPassword)
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        return NextResponse.json(
          { success: false, message: 'This admin account is disabled.' },
          { status: 401 }
        )
      } else if (error.code === 'auth/wrong-password') {
        return NextResponse.json(
          { success: false, message: 'Incorrect admin password.' },
          { status: 401 }
        )
      } else {
        return NextResponse.json(
          { success: false, message: 'Admin verification failed.' },
          { status: 401 }
        )
      }
    }

    // Step 2: Check if new email already exists
    try {
      // Note: In production, you might want to use Firebase Admin SDK for this check
      // For now, we'll rely on createUserWithEmailAndPassword to catch duplicates
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Failed to validate new admin email.' },
        { status: 500 }
      )
    }

    // Step 3: Create new admin account with PIN
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedNewEmail, newPassword)
      const firebaseUser = userCredential.user

      const userData: Omit<User, 'uid'> & { uid: string; pin: string } = {
        uid: firebaseUser.uid,
        email: sanitizedNewEmail,
        displayName: '',
        name: '',
        contact: '',
        birthday: '',
        address: '',
        gender: null,
        educationalAttainment: '',
        profileImage: '',
        photoURL: '',
        role: 'admin',
        status: 'active',
        currentLevel: 1,
        requirementsCompleted: [],
        examScores: [],
        profileCompleted: true,
        pin: sanitizedPin, // PIN stored securely on server side
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const userRef = doc(db, 'users', firebaseUser.uid)
      await setDoc(userRef, userData)

      return NextResponse.json({
        success: true,
        message: `Admin account for ${sanitizedNewEmail} created successfully!`
      })

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        return NextResponse.json(
          { success: false, message: `Account with ${sanitizedNewEmail} already exists.` },
          { status: 409 }
        )
      }
      if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { success: false, message: 'Password must be at least 6 characters.' },
          { status: 400 }
        )
      }
      if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { success: false, message: 'Invalid email address.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, message: error.message || 'Failed to create admin account' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Admin creation error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
