// Session management utilities for inactivity auto-logout
import { signOut } from 'firebase/auth'
import { auth } from './firebase'

// Configuration
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds
const WARNING_TIMEOUT = 5 * 60 * 1000 // 5 minutes warning (optional)

// Timer references
let inactivityTimer: NodeJS.Timeout | null = null
let warningTimer: NodeJS.Timeout | null = null

// Activity events to track
const activityEvents = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'touchstart',
  'click'
]

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

// Reset inactivity timer
const resetInactivityTimer = () => {
  if (!isBrowser) return
  
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }
  
  if (warningTimer) {
    clearTimeout(warningTimer)
  }

  // Set new timer
  inactivityTimer = setTimeout(() => {
    handleAutoLogout()
  }, INACTIVITY_TIMEOUT)

  // Optional: Show warning before logout
  warningTimer = setTimeout(() => {
    console.log('User will be logged out in 5 minutes due to inactivity')
  }, WARNING_TIMEOUT)
}

// Handle automatic logout
const handleAutoLogout = async () => {
  if (!isBrowser) return
  
  try {
    console.log('Logging out user due to inactivity')
    await signOut(auth)
    
    // Clear all timers
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
    
    if (warningTimer) {
      clearTimeout(warningTimer)
      warningTimer = null
    }
    
    // Remove event listeners
    removeActivityListeners()
    
    // Redirect to auth page (this will be handled by the auth state change listener)
    window.location.href = '/auth'
  } catch (error) {
    console.error('Error during auto logout:', error)
  }
}

// Activity event handler
const handleActivity = () => {
  resetInactivityTimer()
}

// Add activity event listeners
const addActivityListeners = () => {
  if (!isBrowser) return
  
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true })
  })
}

// Remove activity event listeners
const removeActivityListeners = () => {
  if (!isBrowser) return
  
  activityEvents.forEach(event => {
    document.removeEventListener(event, handleActivity)
  })
}

// Start inactivity tracking
export const startInactivityTracking = () => {
  if (!isBrowser) {
    console.log('Inactivity tracking skipped - not in browser environment')
    return
  }
  
  // Clear any existing timers
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }
  
  if (warningTimer) {
    clearTimeout(warningTimer)
  }
  
  // Add event listeners
  addActivityListeners()
  
  // Start initial timer
  resetInactivityTimer()
  
  console.log('Inactivity tracking started - User will be logged out after 30 minutes of inactivity')
}

// Stop inactivity tracking
export const stopInactivityTracking = () => {
  if (!isBrowser) return
  
  // Clear timers
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
    inactivityTimer = null
  }
  
  if (warningTimer) {
    clearTimeout(warningTimer)
    warningTimer = null
  }
  
  // Remove event listeners
  removeActivityListeners()
  
  console.log('Inactivity tracking stopped')
}

// Reset timer manually (useful for manual activity tracking)
export const resetInactivityTimerManual = () => {
  resetInactivityTimer()
}

// Check if tracking is active
export const isTrackingActive = () => {
  return inactivityTimer !== null
}
