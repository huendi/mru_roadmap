import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updatePassword as firebaseUpdatePassword,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { uploadToCloudinary } from './cloudinary'
import { User } from '@/types'

// Admin email - change this to your admin email
const ADMIN_EMAIL = 'minda_wendu@dadev.com'

// Auth error messages
const AUTH_ERROR_MESSAGES: { [key: string]: string } = {
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
}

export const getAuthErrorMessage = (error: any): string => {
  return AUTH_ERROR_MESSAGES[error.code] || error.message || 'An error occurred. Please try again.'
}

// Check if user is admin
export const isAdmin = (email: string): boolean => {
  return email === ADMIN_EMAIL
}

// Create or update user in Firestore
export const createOrUpdateUser = async (firebaseUser: FirebaseUser, additionalData?: Partial<User>): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userDoc = await getDoc(userRef)
  
  const isUserAdmin = firebaseUser.email === ADMIN_EMAIL
  
  const userData: any = {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
    displayName: additionalData?.name || firebaseUser.displayName || '',
    name: additionalData?.name || userDoc.data()?.name || '',
    contact: additionalData?.contact || userDoc.data()?.contact || '',
    birthday: additionalData?.birthday || userDoc.data()?.birthday || '',
    address: additionalData?.address || userDoc.data()?.address || '',
    educationalAttainment: additionalData?.educationalAttainment || userDoc.data()?.educationalAttainment || '',
    profileImage: additionalData?.profileImage || userDoc.data()?.profileImage || '',
    photoURL: additionalData?.profileImage || userDoc.data()?.profileImage || userDoc.data()?.photoURL || firebaseUser.photoURL || '',
    role: isUserAdmin ? 'admin' : (userDoc.data()?.role || 'user'),
    status: userDoc.data()?.status || 'active',
    currentLevel: userDoc.data()?.currentLevel || 1,
    requirementsCompleted: userDoc.data()?.requirementsCompleted || [],
    examScores: userDoc.data()?.examScores || [],
    profileCompleted: userDoc.data()?.profileCompleted || false,
    createdAt: userDoc.exists() ? userDoc.data()?.createdAt?.toDate() || new Date() : new Date(),
    updatedAt: new Date(),
  }

  // Only add gender if it has a value
  const gender = additionalData?.gender || userDoc.data()?.gender
  if (gender) userData.gender = gender

  if (userDoc.exists()) {
    await updateDoc(userRef, userData)
  } else {
    await setDoc(userRef, userData)
  }

  return userData
}

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return await createOrUpdateUser(userCredential.user)
  } catch (error) {
    throw new Error(getAuthErrorMessage(error))
  }
}

// Create new user account with full registration data
export const signUp = async (
  email: string, 
  password: string, 
  userData: { name: string; contact: string; birthday: string; address: string }
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return await createOrUpdateUser(userCredential.user, userData)
  } catch (error) {
    throw new Error(getAuthErrorMessage(error))
  }
}

// Sign out
export const signOutUser = async (): Promise<void> => {
  await signOut(auth)
}

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userData = await createOrUpdateUser(firebaseUser)
        callback(userData)
      } catch (error) {
        console.error('Error fetching user data:', error)
        callback(null)
      }
    } else {
      callback(null)
    }
  })
}

// Get all users (admin only)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)
    return snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User))
  } catch (error) {
    console.error('Error fetching users:', error)
    throw new Error('Failed to fetch users')
  }
}

// Update user status (admin only)
export const updateUserStatus = async (uid: string, status: 'active' | 'disabled'): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, { status, updatedAt: new Date() })
  } catch (error) {
    console.error('Error updating user status:', error)
    throw new Error('Failed to update user status')
  }
}

// Delete user (admin only)
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid)
    await deleteDoc(userRef)
  } catch (error) {
    console.error('Error deleting user:', error)
    throw new Error('Failed to delete user')
  }
}

// Update user profile
export const updateUserProfile = async (uid: string, profileData: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, { 
      ...profileData, 
      updatedAt: new Date() 
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw new Error('Failed to update profile')
  }
}

// Change user password
export const changePassword = async (newPassword: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('No user is currently signed in')
    }
    await firebaseUpdatePassword(currentUser, newPassword)
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
    console.log('UploadProfilePicture called:', uid, file.name)
    
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
    throw new Error('Failed to upload profile picture')
  }
}
