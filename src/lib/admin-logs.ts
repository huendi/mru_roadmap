// lib/admin-logs.ts
import { AdminLog } from '@/types'

// Create an admin log entry
export const createAdminLog = async (
  actorName: string,
  targetUserName: string,
  activity: string,
  action: string,
  targetUserEmail?: string
): Promise<void> => {
  try {
    const response = await fetch('/api/admin/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorName,
        targetUserName,
        activity,
        action,
        targetUserEmail
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create admin log')
    }
  } catch (error) {
    console.error('Error creating admin log:', error)
    // Don't throw error to avoid breaking main functionality
  }
}

// Get admin logs
export const getAdminLogs = async (limit = 50, offset = 0): Promise<AdminLog[]> => {
  try {
    const response = await fetch(`/api/admin/logs?limit=${limit}&offset=${offset}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch admin logs')
    }
    
    const data = await response.json()
    return data.logs || []
  } catch (error) {
    console.error('Error fetching admin logs:', error)
    return []
  }
}
