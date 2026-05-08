// Debug Firebase collections
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  try {
    console.log('🔍 Checking Firebase structure...')
    
    const results = {
      collections: [] as string[],
      usersCollection: { exists: false, count: 0, sampleUserId: null },
      settingsCollection: { exists: false, count: 0 },
      level4ExamConfig: { exists: false },
      sampleUserLevel4Exams: { exists: false, count: 0 }
    }

    // List all collections
    try {
      const collections = await adminDb.listCollections()
      results.collections = collections.map(c => c.id)
      console.log('Available collections:', results.collections)
    } catch (error) {
      console.error('Error listing collections:', error)
    }

    // Check users collection
    try {
      const usersSnapshot = await adminDb.collection('users').limit(1).get()
      results.usersCollection.exists = !usersSnapshot.empty
      results.usersCollection.count = (await adminDb.collection('users').count().get()).data().count
      
      if (!usersSnapshot.empty) {
        const sampleUser = usersSnapshot.docs[0]
        results.usersCollection.sampleUserId = sampleUser.id
        
        // Check level4Exams subcollection
        const level4ExamsSnapshot = await sampleUser.ref.collection('level4Exams').get()
        results.sampleUserLevel4Exams.exists = !level4ExamsSnapshot.empty
        results.sampleUserLevel4Exams.count = level4ExamsSnapshot.size
        
        console.log(`Sample user ${sampleUser.id} has ${level4ExamsSnapshot.size} level4Exams documents`)
      }
    } catch (error) {
      console.error('Error checking users collection:', error)
    }

    // Check settings collection
    try {
      const settingsSnapshot = await adminDb.collection('settings').limit(1).get()
      results.settingsCollection.exists = !settingsSnapshot.empty
      results.settingsCollection.count = (await adminDb.collection('settings').count().get()).data().count
      
      // Check level4ExamConfig
      const level4ConfigDoc = await adminDb.collection('settings').doc('level4ExamConfig').get()
      results.level4ExamConfig.exists = level4ConfigDoc.exists
      
      if (level4ConfigDoc.exists) {
        console.log('level4ExamConfig data:', level4ConfigDoc.data())
      }
    } catch (error) {
      console.error('Error checking settings collection:', error)
    }

    console.log('Firebase check results:', results)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Firebase structure check complete',
      results 
    })

  } catch (error) {
    console.error('Firebase check error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
