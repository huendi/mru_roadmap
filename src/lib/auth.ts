// Updated authentication system with both email/password and Google Sign-In
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
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { uploadToCloudinary } from './cloudinary'
import { User } from '@/types'
import { startInactivityTracking, stopInactivityTracking } from './session'

// Admin emails - change this to your admin emails
const ADMIN_EMAILS = ['minda_wendu@dadev.com', 'jantimothy.b.sese@sunlife.com.ph']

// Auth error messages
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

// Check if user is admin
export const isAdmin = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email)
}

// Google Sign-In
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const firebaseUser = result.user
    
    // Check if user already exists in database
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      // User exists, return existing data
      const existingUser = userDoc.data() as User
      console.log('Existing Google user found:', existingUser.status, existingUser.profileCompleted)
      return existingUser
    } else {
      // Create new user with default values
      console.log('Creating new Google user with pending status')
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
      
      await setDoc(userRef, newUser)
      return newUser
    }
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error))
  }
}

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return await createOrUpdateUser(userCredential.user, { hasPassword: true })
  } catch (error) {
    throw new Error(getAuthErrorMessage(error))
  }
}

// Sign up with email and password
export const signUp = async (email: string, password: string, additionalData?: Partial<User>): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return await createOrUpdateUser(userCredential.user, { ...additionalData, hasPassword: true })
  } catch (error) {
    throw new Error(getAuthErrorMessage(error))
  }
}

// Create or update user in Firestore
export const createOrUpdateUser = async (firebaseUser: FirebaseUser, additionalData?: Partial<User>): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userDoc = await getDoc(userRef)
  
  // Check if user is admin
  const isUserAdmin = isAdmin(firebaseUser.email || '')
  
  const existingData = userDoc.data()
  
  const userData: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: additionalData?.name || firebaseUser.displayName || '',
    // Combined full name
    name: additionalData?.name || existingData?.name || '',
    // Split name fields
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
    // Update existing user - filter out undefined values
    const cleanData: any = {}
    Object.keys(userData).forEach(key => {
      const value = userData[key as keyof User]
      if (value !== undefined && value !== '') {
        cleanData[key] = value
      }
    })
    await updateDoc(userRef, cleanData)
  } else {
    // Create new user
    await setDoc(userRef, userData)
  }

  return userData
}

// Update user profile
export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, {
    ...data,
    updatedAt: new Date()
  })
}

// Update user status (for admin approval)
export const updateUserStatus = async (uid: string, status: 'pending' | 'approved' | 'rejected' | 'active' | 'disabled'): Promise<void> => {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, {
    status,
    updatedAt: new Date()
  })
}

// Get user by UID
export const getUserByUid = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid)
  const userDoc = await getDoc(userRef)
  
  if (userDoc.exists()) {
    return userDoc.data() as User
  }
  return null
}

// Get all users (for admin)
export const getAllUsers = async (): Promise<User[]> => {
  const usersRef = collection(db, 'users')
  const usersSnapshot = await getDocs(usersRef)
  
  return usersSnapshot.docs.map(doc => doc.data() as User)
}

// Change user password
export const changePassword = async (newPassword: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('No user is currently signed in')
    }
    
    // Update password in Firebase Auth
    await firebaseUpdatePassword(currentUser, newPassword)
    
    // Update hasPassword flag in Firestore
    const userRef = doc(db, 'users', currentUser.uid)
    await updateDoc(userRef, { 
      hasPassword: true,
      updatedAt: new Date()
    })
    
  } catch (error: any) {
    console.error('Error changing password:', error)
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign out and sign in again before changing your password')
    }
    throw new Error(getAuthErrorMessage(error) || 'Failed to change password')
  }
}

// Upload profile picture to Cloudinary
export const uploadProfilePicture = async (uid: string, file: File): Promise<string> => {
  try {
    console.log('UploadProfilePicture called:', {
      uid,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
    
    // Upload to Cloudinary
    const profileImageURL = await uploadToCloudinary(file, 'profile-pictures')
    console.log('Cloudinary upload successful, URL:', profileImageURL)
    
    // Update user profile in Firebase Auth (for display purposes)
    const currentUser = auth.currentUser
    if (currentUser) {
      console.log('Updating Firebase Auth profile...')
      await updateProfile(currentUser, { photoURL: profileImageURL })
      console.log('Firebase Auth profile updated')
    }
    
    // Update user document in Firestore
    console.log('Updating Firestore document...')
    await updateUserProfile(uid, { 
      profileImage: profileImageURL,
      photoURL: profileImageURL // Keep for backward compatibility
    })
    console.log('Firestore document updated')
    
    return profileImageURL
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    throw new Error(`Failed to upload profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Sign out user
export const signOutUser = async (): Promise<void> => {
  try {
    // Stop inactivity tracking when user signs out
    stopInactivityTracking()
    await signOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
  }
}

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userData = await getUserByUid(firebaseUser.uid)
        
        // Start inactivity tracking when user is authenticated
        startInactivityTracking()
        
        callback(userData)
      } catch (error) {
        console.error('Error fetching user data:', error)
        callback(null)
      }
    } else {
      // Stop inactivity tracking when user is not authenticated
      stopInactivityTracking()
      callback(null)
    }
  })
}

// Delete user - let the API handle Firestore, Cloudinary, and Firebase Auth
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

    console.log('User deleted from Firestore, Firebase Auth, and Cloudinary')
  } catch (error) {
    console.error('Error deleting user:', error)
    throw new Error('Failed to delete user')
  }
}

// Export auth instance for API routes
export { auth }