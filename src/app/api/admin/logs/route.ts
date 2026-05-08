import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// GET - Fetch admin logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const logsRef = adminDb.collection('adminLogs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset)

    const snapshot = await logsRef.get()
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }))

    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error('Error fetching admin logs:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch logs' }, { status: 500 })
  }
}

// POST - Create a new admin log entry
export async function POST(request: NextRequest) {
  try {
    const { actorName, targetUserName, activity, action, targetUserEmail } = await request.json()

    if (!actorName || !targetUserName || !activity || !action) {
      return NextResponse.json({ error: 'actorName, targetUserName, activity, and action are required' }, { status: 400 })
    }

    const logEntry = {
      actorName,
      targetUserName,
      activity,
      action,
      targetUserEmail: targetUserEmail || null,
      timestamp: new Date(),
      createdAt: new Date()
    }

    const docRef = await adminDb.collection('adminLogs').add(logEntry)

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      message: 'Log entry created successfully' 
    })
  } catch (error: any) {
    console.error('Error creating admin log:', error)
    return NextResponse.json({ error: error.message || 'Failed to create log entry' }, { status: 500 })
  }
}
