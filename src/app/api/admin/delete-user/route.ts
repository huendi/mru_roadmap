import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { v2 as cloudinary } from 'cloudinary'

// Initialize Firebase Admin SDK
const getAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!
  }

  // Debug: log what env vars are present
  console.log('ENV CHECK:', {
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  })

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(`Missing Firebase Admin env vars — projectId: ${!!projectId}, clientEmail: ${!!clientEmail}, privateKey: ${!!privateKey}`)
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json()

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const app = getAdminApp()
    const db = admin.firestore(app)
    const authInstance = admin.auth(app)

    // 1. Get Firestore doc (check both collections) - verify user exists before deletion
    let userDoc = await db.collection('users').doc(uid).get()
    if (!userDoc.exists) {
      userDoc = await db.collection('deletedUsers').doc(uid).get()
    }
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found in Firestore' }, { status: 404 })
    }

    let cloudinaryDeleted = false
    let firestoreDeleted = false
    let authDeleted = false

    // 2. Delete Firebase Auth user first - this is most critical
    try {
      await authInstance.deleteUser(uid)
      authDeleted = true
      console.log('Firebase Auth user deleted:', uid)
    } catch (authError: any) {
      console.error('Firebase Auth deletion failed:', authError.message)
      if (authError.code === 'auth/user-not-found') {
        // User already deleted from Auth, continue with other deletions
        authDeleted = true
        console.log('Firebase Auth user already deleted:', uid)
      } else {
        return NextResponse.json({ error: 'Failed to delete from Firebase Auth: ' + authError.message }, { status: 500 })
      }
    }

    // 3. Delete Firestore documents
    try {
      await db.collection('users').doc(uid).delete()
      await db.collection('deletedUsers').doc(uid).delete()
      firestoreDeleted = true
      console.log('Firestore docs deleted:', uid)
    } catch (firestoreError: any) {
      console.error('Firestore deletion failed:', firestoreError.message)
      // Try to rollback Auth deletion if possible
      if (authDeleted) {
        console.warn('Attempting rollback - Auth user deleted but Firestore deletion failed')
      }
      return NextResponse.json({ error: 'Failed to delete from Firestore: ' + firestoreError.message }, { status: 500 })
    }

    // 4. Delete Cloudinary folder (non-critical, continue even if fails)
    try {
      await cloudinary.api.delete_resources_by_prefix(`users/${uid}/`)
      await cloudinary.api.delete_folder(`users/${uid}`)
      cloudinaryDeleted = true
      console.log('Cloudinary folder deleted:', `users/${uid}/`)
    } catch (cloudinaryError: any) {
      console.warn('Cloudinary deletion failed (non-critical):', cloudinaryError.message)
      // Continue even if Cloudinary fails - user data is already deleted
    }

    // 5. Return success with deletion status
    return NextResponse.json({ 
      message: 'User deleted successfully',
      deleted: {
        auth: authDeleted,
        firestore: firestoreDeleted,
        cloudinary: cloudinaryDeleted
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error('Unexpected error deleting user:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 })
  }
}