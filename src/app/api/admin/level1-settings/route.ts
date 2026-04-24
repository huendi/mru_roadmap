// app/api/admin/level1-settings/route.ts
// Handles Level 1 settings and requirements

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

const DEFAULT_SETTINGS = {
  minDocsToPass: 4,
  totalDocs: 7,
  requirements: [
    { type: 'resume',        name: 'Resume or CV',                   required: true, samples: [] },
    { type: 'birth_cert',    name: 'Birth Certificate (PSA Copy)',    required: true, samples: [] },
    { type: 'id_pictures',   name: '1×1 ID Photo',                   required: true, samples: ['/requirements1/ID.png'] },
    { type: 'sss',           name: 'SSS',                            required: true, samples: ['/requirements1/SSS.png', '/requirements1/SSS2.png'] },
    { type: 'tin',           name: 'Tax Identification Number (TIN)', required: true, samples: ['/requirements1/TIN.png', '/requirements1/TIN2.png'] },
    { type: 'nbi_clearance', name: 'NBI or Police Clearance',        required: true, samples: ['/requirements1/NBI.png'] },
    { type: 'itr',           name: 'Income Tax Return (ITR)',         required: true, samples: ['/requirements1/ITR.png'] },
  ],
}

export async function GET() {
  try {
    const settingsDoc = await adminDb.collection('settings').doc('level1').get()
    
    if (settingsDoc.exists) {
      return NextResponse.json(settingsDoc.data())
    } else {
      return NextResponse.json(DEFAULT_SETTINGS)
    }
  } catch (error) {
    console.error('Error fetching level1 settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Received level1 settings:', body)
    const { minDocsToPass, totalDocs, requirements } = body

    // Validate required fields
    if (minDocsToPass === undefined || !requirements) {
      console.error('Missing required fields:', { minDocsToPass, requirements: !!requirements })
      return NextResponse.json({ error: 'Missing required fields: minDocsToPass and requirements are required' }, { status: 400 })
    }

    const settingsData = {
      minDocsToPass,
      totalDocs: requirements?.length || totalDocs,
      requirements,
      updatedAt: new Date().toISOString()
    }

    console.log('Saving settings data:', settingsData)
    await adminDb.collection('settings').doc('level1').set(settingsData, { merge: true })
    console.log('Settings saved successfully')

    return NextResponse.json(settingsData)
  } catch (error) {
    console.error('Error saving level1 settings:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save settings' }, { status: 500 })
  }
}