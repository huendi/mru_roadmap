'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to first sub-tab
    router.replace('/admin/settings/level1')
  }, [router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading settings...</p>
      </div>
    </div>
  )
}