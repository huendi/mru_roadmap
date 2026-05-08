import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { adminAuth } from '@/lib/admin-auth'

// GET - Get receipt information for any user (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await adminAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 })
    }

    const progressDoc = await adminDb
      .collection('users')
      .doc(uid)
      .collection('levelProgress')
      .doc('level5')
      .get()

    if (!progressDoc.exists) {
      return NextResponse.json({ error: 'No progress found' }, { status: 404 })
    }

    const progress = progressDoc.data()
    if (!progress?.receiptUploaded) {
      return NextResponse.json({ error: 'No receipt uploaded' }, { status: 404 })
    }

    return NextResponse.json({
      receiptUrl: progress.receiptUrl,
      fileName: progress.receiptFileName,
      fileSize: progress.receiptFileSize,
      fileType: progress.receiptFileType,
      uploadedAt: progress.submittedAt,
    })
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 })
  }
}
