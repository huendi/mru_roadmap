// app/api/admin/level2-settings/route.ts
// GET: fetch Level 2 settings from Firestore
// POST: save Level 2 settings to Firestore

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { createAdminLog } from '@/lib/admin-logs'

const SETTINGS_DOC = adminDb.collection('settings').doc('level2')

const DEFAULT_SETTINGS = {
  trainingUrl: '',
  trainingTitle: 'Sun Life Financial Advisor Training',
  trainingDescription: '',
  instructionSlides: [] as { url: string; caption?: string }[],
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const doc = await SETTINGS_DOC.get()

    if (!doc.exists) {
      await SETTINGS_DOC.set({
        ...DEFAULT_SETTINGS,
        updatedAt: new Date().toISOString(),
      })
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    const data = doc.data()!
    const { updatedAt, ...settings } = data
    return NextResponse.json(settings)

  } catch (error: any) {
    console.error('GET level2-settings error:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { trainingUrl, trainingTitle, trainingDescription, instructionSlides, adminEmail } = body

    if (
      typeof trainingUrl !== 'string' ||
      typeof trainingTitle !== 'string' ||
      !Array.isArray(instructionSlides)
    ) {
      return NextResponse.json(
        { error: 'Invalid settings format.' },
        { status: 400 }
      )
    }

    await SETTINGS_DOC.set({
      trainingUrl,
      trainingTitle,
      trainingDescription: trainingDescription ?? '',
      instructionSlides,
      updatedAt: new Date().toISOString(),
    })

    // Log the admin action
    await createAdminLog(
      adminEmail || 'Admin',
      'System Settings',
      'Settings Update',
      'Updated Level 2 settings'
    )

    return NextResponse.json({ success: true, message: 'Settings saved successfully.' })

  } catch (error: any) {
    console.error('POST level2-settings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save settings.' },
      { status: 500 }
    )
  }
}