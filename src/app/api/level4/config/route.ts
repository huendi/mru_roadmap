// app/api/level4/config/route.ts
// Returns the current exam config + computed totalSets based on question bank size.

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    const [configDoc, questionsSnap] = await Promise.all([
      adminDb.collection('settings').doc('level4ExamConfig').get(),
      adminDb.collection('questions').count().get(),
    ])

    const cfg = configDoc.exists ? configDoc.data()! : {}
    const questionsPerSet: number = cfg.questionsPerSet ?? 50
    const minutesPerSet: number   = cfg.minutesPerSet   ?? 60
    const passingScore: number    = cfg.passingScore    ?? 75
    const bankVersion: string     = cfg.bankVersion     ?? ''
    const passingRequirement = cfg.passingRequirement || { type: 'all' }
    const totalQuestions: number  = questionsSnap.data().count

    const fullSets  = Math.floor(totalQuestions / questionsPerSet)
    const remainder = totalQuestions % questionsPerSet
    const totalSets = fullSets + (remainder > 0 ? 1 : 0)

    return NextResponse.json({
      questionsPerSet,
      minutesPerSet,
      passingScore,
      bankVersion,
      totalQuestions,
      totalSets,
      passingRequirement,
    })
  } catch (error: any) {
    console.error('Failed to fetch level4 config:', error)
    return NextResponse.json({ error: 'Failed to fetch config.' }, { status: 500 })
  }
}