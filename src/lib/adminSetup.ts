import { auth, db } from './firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { User } from '@/types'

// ← Your existing admin (unchanged)
const ADMIN_EMAIL = 'minda_wendu@dadev.com'
const ADMIN_PASSWORD = 'kangsaminda101'
const ADMIN_DATA = {
  name: 'Admin Admin',
  contact: '00000000000',
  birthday: '01-01-1990',
  address: 'Admin Office',
}

// Original setup (unchanged)
export const setupAdminAccount = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
    const firebaseUser = userCredential.user

    const userData: Omit<User, 'uid'> & { uid: string } = {
      uid: firebaseUser.uid,
      email: ADMIN_EMAIL,
      displayName: ADMIN_DATA.name,
      name: ADMIN_DATA.name,
      contact: ADMIN_DATA.contact,
      birthday: ADMIN_DATA.birthday,
      address: ADMIN_DATA.address,
      role: 'admin',
      status: 'active',
      currentLevel: 1,
      requirementsCompleted: [],
      examScores: [],
      profileCompleted: true,
      photoURL: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const userRef = doc(db, 'users', firebaseUser.uid)
    await setDoc(userRef, userData)

    return { success: true, message: 'Admin account created successfully!' }
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'Admin account already exists.' }
    }
    return { success: false, message: error.message || 'Failed to create admin account' }
  }
}

// ← Create new admin with PIN
export const createNewAdmin = async (
  email: string,
  password: string,
  pin: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const firebaseUser = userCredential.user

    const userData: Omit<User, 'uid'> & { uid: string; pin: string } = {
      uid: firebaseUser.uid,
      email: email,
      displayName: '',
      name: '',
      contact: '',
      birthday: '',
      address: '',
      gender: null,
      educationalAttainment: '',
      profileImage: '',
      photoURL: '',
      role: 'admin',
      status: 'active',
      currentLevel: 1,
      requirementsCompleted: [],
      examScores: [],
      profileCompleted: true,
      pin: pin,           // ← PIN saved to Firestore
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const userRef = doc(db, 'users', firebaseUser.uid)
    await setDoc(userRef, userData)

    return { success: true, message: `Admin account for ${email} created successfully!` }
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: `Account with ${email} already exists.` }
    }
    if (error.code === 'auth/weak-password') {
      return { success: false, message: 'Password must be at least 6 characters.' }
    }
    if (error.code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email address.' }
    }
    return { success: false, message: error.message || 'Failed to create admin account' }
  }
}