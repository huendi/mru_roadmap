'use client'

// app/admin/settings/page.tsx
// Main settings page — only handles tab routing. All settings logic lives in components/.

import { useState } from 'react'
import Level1Panel from './components/Level1Panel'
import Level2Panel from './components/Level2Panel'
import Level3Panel from './components/Level3Panel'
import Level4Panel from './components/Level4Panel'
import Level5Panel from './components/Level5Panel'
import Level6Panel from './components/Level6Panel'
import Level7Panel from './components/Level7Panel'

// ─── Tab config ───────────────────────────────────────────────────────────────

const LEVEL_TABS = [
  { key: 1, label: 'Level 1', sublabel: 'Basic Requirements', Panel: Level1Panel },
  { key: 2, label: 'Level 2', sublabel: 'SLTC Training',      Panel: Level2Panel },
  { key: 3, label: 'Level 3', sublabel: 'IC/IIAP Review',     Panel: Level3Panel },
  { key: 4, label: 'Level 4', sublabel: 'Mock Exam',          Panel: Level4Panel },
  { key: 5, label: 'Level 5', sublabel: 'Licensure Exam',     Panel: Level5Panel },
  { key: 6, label: 'Level 6', sublabel: 'CA Forms',           Panel: Level6Panel },
  { key: 7, label: 'Level 7', sublabel: 'Contract & Coding',  Panel: Level7Panel },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [activeLevel, setActiveLevel] = useState(1) // ← default: Level 1
  const active = LEVEL_TABS.find(t => t.key === activeLevel)!

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Page header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure content for each level of the roadmap.</p>
      </div>

      {/* ── MOBILE (portrait): vertical stacked list ── DESKTOP: horizontal tab strip ── */}

      {/* Mobile dropdown — visible only on small screens */}
      <div className="sm:hidden px-4 flex-shrink-0">
        <select
          value={activeLevel}
          onChange={e => setActiveLevel(Number(e.target.value))}
          className="w-full bg-gray-100 text-blue-900 font-semibold text-sm px-4 py-3 rounded-xl border-none outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}
        >
          {LEVEL_TABS.map(t => (
            <option key={t.key} value={t.key}>
              {t.label} — {t.sublabel}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop horizontal tab strip — hidden on small screens */}
      <div className="hidden sm:block px-6 flex-shrink-0">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-hide">
          {LEVEL_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveLevel(t.key)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-lg transition-all ${
                activeLevel === t.key
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className={`text-xs font-bold ${activeLevel === t.key ? 'text-blue-900' : 'text-gray-600'}`}>
                {t.label}
              </span>
              <span
                className={`text-[10px] mt-0.5 font-medium truncate max-w-[72px] ${
                  activeLevel === t.key ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                {t.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="px-4 sm:px-6 pt-3 flex-shrink-0">
        <div className="border-t-2 border-yellow-600" />
      </div>

      {/* Scrollable panel */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 min-h-0">
        <active.Panel />
      </div>

    </div>
  )
}