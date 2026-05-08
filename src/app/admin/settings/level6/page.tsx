'use client'

import Level6Panel from '../components/Level6Panel'

export default function AdminSettingsLevel6Page() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Settings - Level 6</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure content for Level 6: CA Forms</p>
      </div>

      {/* Divider */}
      <div className="px-4 sm:px-6 pt-3 flex-shrink-0">
        <div className="border-t-2 border-yellow-600" />
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 min-h-0">
        <Level6Panel />
      </div>
    </div>
  )
}
