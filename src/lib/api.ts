import { auth } from './firebase'

// Utility function to make authenticated API calls
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser
  if (!user) {
    throw new Error('No authenticated user found')
  }

  const token = await user.getIdToken()
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

// Utility for FormData uploads (don't set Content-Type for FormData)
export async function authenticatedUpload(url: string, formData: FormData) {
  const user = auth.currentUser
  if (!user) {
    throw new Error('No authenticated user found')
  }

  const token = await user.getIdToken()
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })
}
