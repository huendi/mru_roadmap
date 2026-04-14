// app/api/admin/level2-settings/route.ts
// GET: fetch Level 2 settings from Firestore
// POST: save Level 2 settings to Firestore

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const SETTINGS_DOC = adminDb.collection('settings').doc('level2')

// Default settings fallback
const DEFAULT_SETTINGS = {
  videoPassword: 'sl_brightbox',
  formFields: [
    { label: 'Sun Life E-mail', value: 'jantimothy.b.sese@sunlife.com.ph' },
    { label: 'First Name',      value: 'Jan Timothy' },
    { label: 'Last Name',       value: 'Sese' },
    { label: 'Advisor Code',    value: '117617' },
  ],
  videos: [
    {
      id: 'v1',
      title: 'Insurance Concept Fundamentals Review',
      date: 'January 29, 2026',
      embedUrl: 'https://play.vidyard.com/zd7cUH72Xw7ceWEiDhvMfT',
    },
    {
      id: 'v2',
      title: 'Traditional Concepts Review',
      date: 'January 29, 2026',
      embedUrl: 'https://play.vidyard.com/NosJwJuMVRDWzunbCuUdgt',
    },
    {
      id: 'v3',
      title: 'VUL Concepts Review',
      date: 'January 30, 2026',
      embedUrl: 'https://play.vidyard.com/gvANM73DMS7xwGmDuXrBLi',
    },
  ],
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const doc = await SETTINGS_DOC.get()

    if (!doc.exists) {
      // First time — save defaults to Firestore then return them
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

    // Basic validation
    if (!body.videoPassword || !body.formFields || !body.videos) {
      return NextResponse.json(
        { error: 'Invalid settings format.' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.formFields) || !Array.isArray(body.videos)) {
      return NextResponse.json(
        { error: 'formFields and videos must be arrays.' },
        { status: 400 }
      )
    }

    await SETTINGS_DOC.set({
      videoPassword: body.videoPassword,
      formFields: body.formFields,
      videos: body.videos,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message: 'Settings saved successfully.' })

  } catch (error: any) {
    console.error('POST level2-settings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save settings.' },
      { status: 500 }
    )
  }
}