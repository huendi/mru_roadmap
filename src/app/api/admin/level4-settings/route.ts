// ============================================================
// FILE 4: app/api/admin/level4-config/route.ts
// ============================================================
 
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
 
const DOC_REF = () => adminDb.collection('settings').doc('level4ExamConfig')
 
export async function GET() {
  try {
    const snap = await DOC_REF().get()
    if (!snap.exists) return NextResponse.json(null, { status: 404 })
    return NextResponse.json(snap.data())
  } catch {
    return NextResponse.json({ error: 'Failed to load config.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { questionsPerSet, minutesPerSet, passingScore, passingRequirement } = await req.json()
    await DOC_REF().set(
      { questionsPerSet, minutesPerSet, passingScore, passingRequirement },
      { merge: true }
    )
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save config.' }, { status: 500 })
  }
}