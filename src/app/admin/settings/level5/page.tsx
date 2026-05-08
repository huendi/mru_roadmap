'use client'

import Level5Panel from '../components/Level5Panel'

export default function AdminSettingsLevel5Page() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Settings - Level 5</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure content for Level 5: Licensure Exam</p>
      </div>

      {/* Divider */}
      <div className="px-4 sm:px-6 pt-3 flex-shrink-0">
        <div className="border-t-2 border-yellow-600" />
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 min-h-0">
        <Level5Panel />
      </div>
    </div>
  )
}
