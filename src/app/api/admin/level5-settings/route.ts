import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/admin-auth'
import { adminDb } from '@/lib/firebase-admin'
import { createAdminLog } from '@/lib/admin-logs'

// Level 5: Licensure Exam Configuration
interface Level5Config {
  examTypes: {
    ic: {
      trad: { faceToFacePrice: number; onlinePrice: number }
      vul: { faceToFacePrice: number; onlinePrice: number }
      enabled: boolean
    }
    iiap: {
      trad: { faceToFacePrice: number; onlinePrice: number }
      vul: { faceToFacePrice: number; onlinePrice: number }
      enabled: boolean
    }
  }
  schedules: ExamSchedule[]
}

interface ExamSchedule {
  id: string
  examType: 'ic' | 'iiap'
  mode: 'trad-face-to-face' | 'trad-online' | 'vul-face-to-face' | 'vul-online'
  date: string
  time: string
  location: string
  maxSlots: number
  currentSlots: number
  status: 'active' | 'full' | 'cancelled'
}

const DEFAULT_CONFIG: Level5Config = {
  examTypes: {
    ic: {
      trad: { faceToFacePrice: 1000, onlinePrice: 1015 },
      vul: { faceToFacePrice: 1000, onlinePrice: 1015 },
      enabled: true
    },
    iiap: {
      trad: { faceToFacePrice: 1000, onlinePrice: 1015 },
      vul: { faceToFacePrice: 1000, onlinePrice: 1015 },
      enabled: true
    }
  },
  schedules: []
}

// Helper functions for Firestore operations
async function loadConfig(): Promise<Level5Config> {
  try {
    const doc = await adminDb.collection('settings').doc('level5').get()
    if (doc.exists) {
      return doc.data() as Level5Config
    } else {
      return DEFAULT_CONFIG
    }
  } catch (error) {
    console.error('Error loading config from Firestore:', error)
    return DEFAULT_CONFIG
  }
}

async function saveConfig(config: Level5Config): Promise<void> {
  await adminDb.collection('settings').doc('level5').set(config)
}

// GET - Fetch Level 5 configuration
export async function GET() {
  try {
    const auth = await adminAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const config = await loadConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching Level 5 settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// POST - Update Level 5 configuration
export async function POST(request: NextRequest) {
  try {
    const auth = await adminAuth()
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { config, adminEmail } = await request.json()
    
    // Validate configuration structure
    if (!config.examTypes || !config.schedules) {
      return NextResponse.json({ error: 'Invalid configuration structure' }, { status: 400 })
    }

    // Validate exam types
    if (!config.examTypes.ic || !config.examTypes.iiap) {
      return NextResponse.json({ error: 'Missing exam types configuration' }, { status: 400 })
    }

    // Validate pricing
    const validatePricing = (examType: any) => {
      if (!examType.trad || !examType.vul) return false
      if (typeof examType.trad.faceToFacePrice !== 'number' || typeof examType.trad.onlinePrice !== 'number') return false
      if (typeof examType.vul.faceToFacePrice !== 'number' || typeof examType.vul.onlinePrice !== 'number') return false
      return true
    }

    if (!validatePricing(config.examTypes.ic) || !validatePricing(config.examTypes.iiap)) {
      return NextResponse.json({ error: 'Invalid pricing configuration' }, { status: 400 })
    }

    // Validate schedules array
    if (!Array.isArray(config.schedules)) {
      return NextResponse.json({ error: 'Schedules must be an array' }, { status: 400 })
    }

    // Validate each schedule
    for (const schedule of config.schedules) {
      if (!schedule.id || !schedule.examType || !schedule.date || !schedule.time || !schedule.location) {
        return NextResponse.json({ error: 'Invalid schedule data' }, { status: 400 })
      }
      if (!['ic', 'iiap'].includes(schedule.examType)) {
        return NextResponse.json({ error: 'Invalid exam type in schedule' }, { status: 400 })
      }
    }

    // Save configuration to Firestore
    await saveConfig(config)

    // Log the admin action
    await createAdminLog(
      adminEmail || 'Admin',
      'System Settings',
      'Settings Update',
      'Updated Level 5 exam settings'
    )
    
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error updating Level 5 settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
