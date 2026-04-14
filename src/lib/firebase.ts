// firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuB3gFL22_1kGvzRcgIC24G3Jo14w6QL4",
  authDomain: "mount-rushmore-unit-85e78.firebaseapp.com",
  projectId: "mount-rushmore-unit-85e78",
  storageBucket: "mount-rushmore-unit-85e78.firebasestorage.app",
  messagingSenderId: "335967251820",
  appId: "1:335967251820:web:ec09ce5edf069d16775749",
  measurementId: "G-P4BB4TH31X",
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}`);
  }
};

// Initialize Firebase only once
validateFirebaseConfig();
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const auth = getAuth(app);

// Set auth persistence to session-only (logs out when tab is closed)
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.warn('Failed to set auth persistence:', error);
});

const db = getFirestore(app);

export { app, analytics, auth, db };