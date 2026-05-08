import { NextRequest, NextResponse } from 'next/server'
import { userAuth } from '@/lib/user-auth'
import { adminDb } from '@/lib/firebase-admin'

// POST - Upload receipt for Level 5 exam payment
export async function POST(request: NextRequest) {
  try {
    const authResult = await userAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }
    const user = authResult.user!

    const formData = await request.formData()
    const file = formData.get('file') as File
    const examType = formData.get('examType') as string
    const scheduleId = formData.get('scheduleId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!examType || !scheduleId) {
      return NextResponse.json({ error: 'Missing required information' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images and PDFs are allowed.' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    // Upload to Cloudinary
    const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'divtweyoo'
    const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'moutnrushmoreunit'

    // Build folder: users/{lastName_firstName}/level5/receipts
    const userDoc = await adminDb.collection('users').doc(user.uid).get()
    const userData = userDoc.data()
    const userName = userData?.displayName || userData?.name || ''
    
    let userFolder = `user_${user.uid}`
    if (userName) {
      const nameParts = userName.trim().split(' ')
      if (nameParts.length >= 2) {
        const lastName = nameParts[nameParts.length - 1]
        const firstName = nameParts.slice(0, -1).join('_')
        userFolder = `${lastName}_${firstName}`
      } else {
        userFolder = userName
      }
    }

    const folder = `mru-roadmap/${userFolder}/level5/receipts`
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const cleanName = file.name.replace(/\s+/g, '_').replace(/\.[^/.]+$/, '')
    const publicId = `${cleanName}_${timestamp}`

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    const resourceType = (isImage || isPdf) ? 'image' : 'raw'

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`

    const cloudinaryForm = new FormData()
    cloudinaryForm.append('file', file)
    cloudinaryForm.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    cloudinaryForm.append('folder', folder)
    cloudinaryForm.append('public_id', publicId)

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: cloudinaryForm,
    })

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text()
      console.error('Cloudinary upload failed:', errorText)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const uploadData = await uploadRes.json()
    const receiptUrl = uploadData.secure_url

    // Update Firestore progress — move to step 4 (waiting for exam results)
    await adminDb
      .collection('users')
      .doc(user.uid)
      .collection('levelProgress')
      .doc('level5')
      .update({
        receiptUploaded: true,
        receiptUrl,
        receiptFileName: file.name,
        receiptFileSize: file.size,
        receiptFileType: file.type,
        currentStep: 4,
        adminDecision: 'pending', // Will be updated by admin when exam results are available
        submittedAt: new Date().toISOString(),
      })

    return NextResponse.json({
      success: true,
      receiptUrl,
    })
  } catch (error) {
    console.error('Error uploading receipt:', error)
    return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 })
  }
}

// GET - Get receipt information
export async function GET(request: NextRequest) {
  try {
    const authResult = await userAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }
    const user = authResult.user!

    const progressDoc = await adminDb
      .collection('users')
      .doc(user.uid)
      .collection('levelProgress')
      .doc('level5')
      .get()

    if (!progressDoc.exists) {
      return NextResponse.json({ error: 'No progress found' }, { status: 404 })
    }

    const progress = progressDoc.exists ? progressDoc.data() : {}
    if (!progress?.receiptUploaded) {
      return NextResponse.json({ error: 'No receipt uploaded' }, { status: 404 })
    }

    return NextResponse.json({
      receiptUrl: progress?.receiptUrl,
      fileName: progress?.receiptFileName,
      fileSize: progress?.receiptFileSize,
      fileType: progress?.receiptFileType,
      uploadedAt: progress?.submittedAt,
    })
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 })
  }
}
