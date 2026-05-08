import { NextRequest } from 'next/server'
import { adminDb, adminAuth } from './firebase-admin'

export async function userAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No authorization token provided' }
    }

    const token = authHeader.substring(7)
    
    // In a real implementation, you would verify the Firebase ID token here
    // For now, we'll use a simplified approach
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' }
    }

    const userData = userDoc.data()
    
    return { 
      success: true, 
      user: {
        uid: decodedToken.uid,
        email: userData?.email || '',
        displayName: userData?.displayName || userData?.name || '',
        ...userData
      }
    }
  } catch (error) {
    console.error('User auth error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}
