// lib/auth.ts
import { 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  updatePassword as firebaseUpdatePassword
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db } from './firebase'
import { uploadToCloudinary } from './cloudinary'
import { User } from '@/types'
import { startInactivityTracking, stopInactivityTracking } from './session'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const ADMIN_EMAILS = ['minda_wendu@dadev.com', 'jantimothy.b.sese@sunlife.com.ph']

const AUTH_ERROR_MESSAGES: { [key: string]: string } = {
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
  'auth/popup-blocked': 'Pop-up was blocked. Please allow pop-ups and try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
}

export const getAuthErrorMessage = (error: any): string => {
  return AUTH_ERROR_MESSAGES[error.code] || error.message || 'An error occurred. Please try again.'
}

export const isAdmin = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email)
}

// ─────────────────────────────────────────────────────────────
// Core helper — check both collections, return user or null
// Always checks deletedUsers FIRST to catch frozen accounts
// ─────────────────────────────────────────────────────────────
const resolveUser = async (uid: string): Promise<User | null> => {
  // 1. Check recycle bin first — frozen users must be blocked
  const deletedSnap = await getDoc(doc(db, 'deletedUsers', uid))
  if (deletedSnap.exists()) {
    return deletedSnap.data() as User  // status: 'frozen' is already stored here
  }

  // 2. Check active users
  const userSnap = await getDoc(doc(db, 'users', uid))
  if (userSnap.exists()) {
    return userSnap.data() as User
  }

  return null
}

// ─────────────────────────────────────────────────────────────
// Google Sign-In
// ─────────────────────────────────────────────────────────────
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const firebaseUser = result.user

    // Check both collections — frozen check is inside resolveUser
    const existing = await resolveUser(firebaseUser.uid)

    if (existing) {
      // If frozen, sign out immediately so Firebase session is cleared
      // The returned object (status: 'frozen') lets auth page show the right UI
      if (existing.status === 'frozen') {
        await signOut(auth)
      }
      return existing
    }

    // Truly new user — create pending record
    const newUser: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      role: isAdmin(firebaseUser.email || '') ? 'admin' : 'user',
      status: isAdmin(firebaseUser.email || '') ? 'approved' : 'pending',
      hasPassword: false,
      currentLevel: 1,
      requirementsCompleted: [],
      examScores: [],
      profileCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await setDoc(doc(db, 'users', firebaseUser.uid), newUser)
    return newUser

  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error))
  }
}

// ─────────────────────────────────────────────────────────────
// Email/Password Sign-In
// ─────────────────────────────────────────────────────────────
export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const uid = userCredential.user.uid

    // Check frozen first, same as Google sign-in
    const existing = await resolveUser(uid)

    if (existing?.status === 'frozen') {
      await signOut(auth)
      return existing
    }

    return await createOrUpdateUser(userCredential.user, { hasPassword: true })
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error))
  }
}

// ─────────────────────────────────────────────────────────────
// Sign Up
// ─────────────────────────────────────────────────────────────
export const signUp = async (email: string, password: string, additionalData?: Partial<User>): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return await createOrUpdateUser(userCredential.user, { ...additionalData, hasPassword: true })
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error))
  }
}

// ─────────────────────────────────────────────────────────────
// Create or Update User in Firestore
// ─────────────────────────────────────────────────────────────
export const createOrUpdateUser = async (firebaseUser: FirebaseUser, additionalData?: Partial<User>): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userDoc = await getDoc(userRef)
  const isUserAdmin = isAdmin(firebaseUser.email || '')
  const existingData = userDoc.data()

  const userData: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: additionalData?.name || firebaseUser.displayName || '',
    name: additionalData?.name || existingData?.name || '',
    firstName: additionalData?.firstName || existingData?.firstName || '',
    middleName: additionalData?.middleName || existingData?.middleName || '',
    lastName: additionalData?.lastName || existingData?.lastName || '',
    contact: additionalData?.contact || existingData?.contact || '',
    birthday: additionalData?.birthday || existingData?.birthday || '',
    address: additionalData?.address || existingData?.address || '',
    gender: additionalData?.gender || existingData?.gender || null,
    educationalAttainment: additionalData?.educationalAttainment || existingData?.educationalAttainment || '',
    profileImage: additionalData?.profileImage || existingData?.profileImage || '',
    photoURL: additionalData?.profileImage || existingData?.profileImage || existingData?.photoURL || firebaseUser.photoURL || '',
    role: isUserAdmin ? 'admin' : (existingData?.role || 'user'),
    status: existingData?.status || (isUserAdmin ? 'approved' : (userDoc.exists() ? 'active' : 'pending')),
    hasPassword: additionalData?.hasPassword !== undefined ? additionalData.hasPassword : (existingData?.hasPassword || false),
    currentLevel: existingData?.currentLevel || 1,
    requirementsCompleted: existingData?.requirementsCompleted || [],
    examScores: existingData?.examScores || [],
    profileCompleted: existingData?.profileCompleted || false,
    createdAt: userDoc.exists() ? existingData?.createdAt?.toDate() || new Date() : new Date(),
    updatedAt: new Date(),
  }

  if (userDoc.exists()) {
    const cleanData: any = {}
    Object.keys(userData).forEach(key => {
      const value = userData[key as keyof User]
      if (value !== undefined && value !== '') {
        cleanData[key] = value
      }
    })
    await updateDoc(userRef, cleanData)
  } else {
    await setDoc(userRef, userData)
  }

  return userData
}

// ─────────────────────────────────────────────────────────────
// Auth State Listener
// Key fix: uses resolveUser so frozen accounts are caught here too.
// If frozen → sign out immediately, pass frozen user to callback
// so auth page can show the frozen UI then clear it.
// ─────────────────────────────────────────────────────────────
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      stopInactivityTracking()
      callback(null)
      return
    }

    try {
      const userData = await resolveUser(firebaseUser.uid)

      if (!userData) {
        // No record found in either collection — treat as unauthenticated
        stopInactivityTracking()
        callback(null)
        return
      }

      if (userData.status === 'frozen') {
        // Force sign out — don't let them stay authenticated
        stopInactivityTracking()
        await signOut(auth)
        callback(userData)  // auth page shows frozen UI, then clears on "Back to Login"
        return
      }

      startInactivityTracking()
      callback(userData)

    } catch (error) {
      console.error('Error fetching user data:', error)
      stopInactivityTracking()
      callback(null)
    }
  })
}

// ─────────────────────────────────────────────────────────────
// Get user by UID (checks both collections)
// ─────────────────────────────────────────────────────────────
export const getUserByUid = async (uid: string): Promise<User | null> => {
  return resolveUser(uid)
}

// ─────────────────────────────────────────────────────────────
// Get all active users (admin)
// ─────────────────────────────────────────────────────────────
export const getAllUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs.map(d => d.data() as User)
}

// ─────────────────────────────────────────────────────────────
// Update user profile
// ─────────────────────────────────────────────────────────────
export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, { ...data, updatedAt: new Date() })
}

// ─────────────────────────────────────────────────────────────
// Update user status (admin approval)
// ─────────────────────────────────────────────────────────────
export const updateUserStatus = async (
  uid: string,
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'disabled'
): Promise<void> => {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, { status, updatedAt: new Date() })
}

// ─────────────────────────────────────────────────────────────
// Change Password
// ─────────────────────────────────────────────────────────────
export const changePassword = async (newPassword: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error('No user is currently signed in')

    await firebaseUpdatePassword(currentUser, newPassword)
    const userRef = doc(db, 'users', currentUser.uid)
    await updateDoc(userRef, { hasPassword: true, updatedAt: new Date() })
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign out and sign in again before changing your password')
    }
    throw new Error(getAuthErrorMessage(error) || 'Failed to change password')
  }
}

// ─────────────────────────────────────────────────────────────
// Upload Profile Picture
// ─────────────────────────────────────────────────────────────
export const uploadProfilePicture = async (uid: string, file: File): Promise<string> => {
  try {
    const profileImageURL = await uploadToCloudinary(file, 'profile-pictures')

    const currentUser = auth.currentUser
    if (currentUser) {
      await updateProfile(currentUser, { photoURL: profileImageURL })
    }

    await updateUserProfile(uid, {
      profileImage: profileImageURL,
      photoURL: profileImageURL,
    })

    return profileImageURL
  } catch (error) {
    throw new Error(`Failed to upload profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ─────────────────────────────────────────────────────────────
// Sign Out
// ─────────────────────────────────────────────────────────────
export const signOutUser = async (): Promise<void> => {
  try {
    stopInactivityTracking()
    await signOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
  }
}

// ─────────────────────────────────────────────────────────────
// Delete User (via API)
// ─────────────────────────────────────────────────────────────
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    const response = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete user')
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    throw new Error('Failed to delete user')
  }
}

export { auth }