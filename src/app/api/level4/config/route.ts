import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    const configDoc = await adminDb
      .collection('settings')
      .doc('level4ExamConfig')
      .get()

    const cfg = configDoc.exists ? configDoc.data()! : {}

    return NextResponse.json({
      questionsPerSet:     cfg.questionsPerSet  ?? 50,
      minutesPerSet:       cfg.minutesPerSet    ?? 60,
      passingScore:        cfg.passingScore     ?? 75,
      passingRequirement:  cfg.passingRequirement ?? { type: 'all' },
    })
  } catch (error) {
    console.error('Failed to fetch level4 config:', error)
    return NextResponse.json({ error: 'Failed to fetch config.' }, { status: 500 })
  }
}