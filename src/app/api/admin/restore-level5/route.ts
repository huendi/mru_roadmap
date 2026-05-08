import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/admin-auth'
import { adminDb } from '@/lib/firebase-admin'

// Admin-only API to restore Level 5 data for users
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await adminAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { userUid, restoreAll } = await request.json()

    if (restoreAll) {
      // Restore Level 5 data for all users
      const usersSnapshot = await adminDb.collection('users').get()
      const users = usersSnapshot.docs
      let restoredCount = 0
      let skippedCount = 0

      for (const userDoc of users) {
        const uid = userDoc.id
        
        // Check if Level 5 data exists and is not empty
        const level5Doc = await adminDb
          .collection('users')
          .doc(uid)
          .collection('levelProgress')
          .doc('level5')
          .get()

        const existingData = level5Doc.exists ? level5Doc.data() ?? {} : {}
        const hasValidData = Object.keys(existingData).length > 0 && existingData.userId

        if (!hasValidData) {
          // Create Level 5 data
          const level5Data = {
            userId: uid,
            currentStep: 1,
            examType: null,
            icMode: null,
            iiapMode: null,
            examModes: {},
            selectedExams: [],
            level4Category: null,
            level4DeliveryModes: [],
            scheduleId: null,
            receiptUploaded: false,
            receiptUrl: null,
            adminApproved: false,
            adminDecision: 'pending',
            completedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          await adminDb
            .collection('users')
            .doc(uid)
            .collection('levelProgress')
            .doc('level5')
            .set(level5Data)

          restoredCount++
          console.log(`Restored Level 5 data for user: ${uid}`)
        } else {
          skippedCount++
          console.log(`Level 5 data already exists for user: ${uid}`)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Restored Level 5 data for ${restoredCount} users, skipped ${skippedCount} users`,
        restoredCount,
        skippedCount
      })
    } else if (userUid) {
      // Restore Level 5 data for specific user
      const level5Data = {
        userId: userUid,
        currentStep: 1,
        examType: null,
        icMode: null,
        iiapMode: null,
        examModes: {},
        selectedExams: [],
        level4Category: null,
        level4DeliveryModes: [],
        scheduleId: null,
        receiptUploaded: false,
        receiptUrl: null,
        adminApproved: false,
        adminDecision: 'pending',
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await adminDb
        .collection('users')
        .doc(userUid)
        .collection('levelProgress')
        .doc('level5')
        .set(level5Data)

      return NextResponse.json({
        success: true,
        message: `Level 5 data restored for user: ${userUid}`,
        data: level5Data
      })
    } else {
      return NextResponse.json({ error: 'Either userUid or restoreAll=true is required' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error restoring Level 5 data:', error)
    return NextResponse.json({ error: 'Failed to restore Level 5 data' }, { status: 500 })
  }
}

// GET endpoint to check Level 5 data status
export async function GET(request: NextRequest) {
  try {
    const authResult = await adminAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userUid = searchParams.get('userUid')

    if (userUid) {
      // Check specific user
      const level5Doc = await adminDb
        .collection('users')
        .doc(userUid)
        .collection('levelProgress')
        .doc('level5')
        .get()

      const data = level5Doc.exists ? level5Doc.data() : null
      const hasValidData = data && Object.keys(data).length > 0 && data.userId

      return NextResponse.json({
        userUid,
        exists: level5Doc.exists,
        hasValidData,
        data: data
      })
    } else {
      // Check all users
      const usersSnapshot = await adminDb.collection('users').get()
      const users = usersSnapshot.docs
      const results = []

      for (const userDoc of users) {
        const uid = userDoc.id
        const level5Doc = await adminDb
          .collection('users')
          .doc(uid)
          .collection('levelProgress')
          .doc('level5')
          .get()

        const data = level5Doc.exists ? level5Doc.data() : null
        const hasValidData = data && Object.keys(data).length > 0 && data.userId

        results.push({
          userUid: uid,
          exists: level5Doc.exists,
          hasValidData,
          needsRestore: !hasValidData
        })
      }

      return NextResponse.json({
        totalUsers: results.length,
        usersNeedingRestore: results.filter(r => r.needsRestore).length,
        results
      })
    }

  } catch (error) {
    console.error('Error checking Level 5 data:', error)
    return NextResponse.json({ error: 'Failed to check Level 5 data' }, { status: 500 })
  }
}
