// app/api/admin/questions-info/route.ts
// Returns the full history of all uploaded question files, newest first.
// Each entry includes fileName, count, uploadedAt, and downloadUrl.

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection('question_uploads')
      .orderBy('uploadedAt', 'desc')
      .get()

    const uploads = snapshot.docs.map(doc => ({
      id: doc.id,
      fileName: doc.data().fileName as string,
      count: doc.data().count as number,
      uploadedAt: doc.data().uploadedAt as string,
      downloadUrl: doc.data().downloadUrl as string | undefined,
    }))

    return NextResponse.json(uploads)
  } catch (error: any) {
    console.error('questions-info error:', error)
    return NextResponse.json([], { status: 500 })
  }
}