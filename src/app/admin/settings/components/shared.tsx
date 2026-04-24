// components/shared.tsx
// Shared UI primitives used across all Level panels

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

export function SaveButton({
  saving,
  saved,
  onClick,
  label = 'Save Changes',
}: {
  saving: boolean
  saved: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
        saved
          ? 'bg-green-600 text-white'
          : 'bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50'
      }`}
    >
      {saving ? (
        <span className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          Saving...
        </span>
      ) : saved ? (
        '✓ Saved!'
      ) : (
        label
      )}
    </button>
  )
}

export function EmptyLevel({ level, title }: { level: number; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-300 mb-4">
        {level}
      </div>
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">No settings configured for this level yet.</p>
    </div>
  )
}