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

    // 1. Get Firestore doc to find Cloudinary image URL BEFORE deleting
    const userDoc = await db.collection('users').doc(uid).get()
    const userData = userDoc.data()

    // 2. Delete image from Cloudinary if it exists
    const imageURL = userData?.profileImage || userData?.photoURL
    if (imageURL && imageURL.includes('cloudinary.com')) {
      try {
        const urlParts = imageURL.split('/')
        const fileWithExt = urlParts[urlParts.length - 1]
        const publicId = `profile-pictures/${fileWithExt.split('.')[0]}`
        await cloudinary.uploader.destroy(publicId)
        console.log('Cloudinary image deleted:', publicId)
      } catch (cloudinaryError) {
        console.warn('Failed to delete Cloudinary image:', cloudinaryError)
      }
    }

    // 3. Delete Firestore document
    await db.collection('users').doc(uid).delete()
    console.log('Firestore document deleted:', uid)

    // 4. Delete Firebase Auth user
    await authInstance.deleteUser(uid)
    console.log('Firebase Auth user deleted:', uid)

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 })

  } catch (error: any) {
    console.error('Error deleting user:', error.message)

    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found in Firebase Auth' }, { status: 404 })
    }

    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 })
  }
}