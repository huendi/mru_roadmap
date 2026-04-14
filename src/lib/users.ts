import { db } from './firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'

export async function updateUserLevel(userId: string, level: number) {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      currentLevel: level,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating user level:', error)
    throw error
  }
}

export async function getUserDocuments(userId: string) {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      return userData.uploadedDocuments || []
    }
    
    return []
  } catch (error) {
    console.error('Error fetching user documents:', error)
    throw error
  }
}

export async function saveUserDocuments(userId: string, documents: {type: string, fileName: string, url: string}[]) {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      uploadedDocuments: documents,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error saving user documents:', error)
    throw error
  }
}
