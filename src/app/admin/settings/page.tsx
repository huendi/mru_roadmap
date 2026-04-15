'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Level2Settings {
  videoPassword: string
  formFields: { label: string; value: string }[]
  videos: { id: string; title: string; date: string; embedUrl: string }[]
}

const DEFAULT_L2: Level2Settings = {
  videoPassword: 'sl_brightbox',
  formFields: [
    { label: 'Sun Life E-mail', value: 'jantimothy.b.sese@sunlife.com.ph' },
    { label: 'First Name',      value: 'Jan Timothy' },
    { label: 'Last Name',       value: 'Sese' },
    { label: 'Advisor Code',    value: '117617' },
  ],
  videos: [
    { id: 'v1', title: 'Insurance Concept Fundamentals Review', date: 'January 29, 2026', embedUrl: 'https://play.vidyard.com/zd7cUH72Xw7ceWEiDhvMfT' },
    { id: 'v2', title: 'Traditional Concepts Review',           date: 'January 29, 2026', embedUrl: 'https://play.vidyard.com/NosJwJuMVRDWzunbCuUdgt' },
    { id: 'v3', title: 'VUL Concepts Review',                  date: 'January 30, 2026', embedUrl: 'https://play.vidyard.com/gvANM73DMS7xwGmDuXrBLi' },
  ],
}

interface HistoryEntry {
  id: string | number
  fileName: string
  uploadedAt: string
  count: number
  downloadUrl?: string
}

// ─── Reusable field row ───────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

// ─── Save button ──────────────────────────────────────────────────────────────

function SaveButton({ saving, saved, onClick, label = 'Save Changes' }: {
  saving: boolean; saved: boolean; onClick: () => void; label?: string
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
      ) : saved ? '✓ Saved!' : label}
    </button>
  )
}

// ─── Empty placeholder ────────────────────────────────────────────────────────

function EmptyLevel({ level, title }: { level: number; title: string }) {
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

// ─── LEVEL 1 ─────────────────────────────────────────────────────────────────

function Level1Panel() {
  return <EmptyLevel level={1} title="Level 1 — Requirements" />
}

// ─── LEVEL 2 ─────────────────────────────────────────────────────────────────

function Level2Panel() {
  const [settings, setSettings] = useState<Level2Settings | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch('/api/admin/level2-settings')
      .then(r => r.ok ? r.json() : DEFAULT_L2)
      .then(data => setSettings(data))
      .catch(() => setSettings(DEFAULT_L2))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!settings) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/level2-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error()
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch { setError('Failed to save. Please try again.') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-900" />
    </div>
  )

  if (!settings) return null

  const VideoCard = ({ v, i }: { v: Level2Settings['videos'][0]; i: number }) => (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video {i + 1}</p>
      <input
        type="text"
        placeholder="Title"
        value={v.title}
        onChange={e => {
          const u = [...settings!.videos]; u[i] = { ...v, title: e.target.value }
          setSettings({ ...settings!, videos: u })
        }}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
      />
      <input
        type="text"
        placeholder="Date (e.g. January 29, 2026)"
        value={v.date}
        onChange={e => {
          const u = [...settings!.videos]; u[i] = { ...v, date: e.target.value }
          setSettings({ ...settings!, videos: u })
        }}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
      />
      <input
        type="text"
        placeholder="Embed URL"
        value={v.embedUrl}
        onChange={e => {
          const u = [...settings!.videos]; u[i] = { ...v, embedUrl: e.target.value }
          setSettings({ ...settings!, videos: u })
        }}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
      />
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">

      {/* ── LEFT COLUMN ── */}
      <div className="flex-1 min-w-0 w-full space-y-6">

        {/* Video password */}
        <FieldRow label="🔑 Video Password">
          <input
            type="text"
            value={settings.videoPassword}
            onChange={e => setSettings({ ...settings, videoPassword: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
        </FieldRow>

        {/* Form fields */}
        <FieldRow label="📋 Form Fields">
          <div className="space-y-2">
            {settings.formFields.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-32 flex-shrink-0">{f.label}</span>
                <input
                  type="text"
                  value={f.value}
                  onChange={e => {
                    const u = [...settings.formFields]
                    u[i] = { ...f, value: e.target.value }
                    setSettings({ ...settings, formFields: u })
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            ))}
          </div>
        </FieldRow>

        {/* Video 1 */}
        <FieldRow label="🎬 Videos">
          <VideoCard v={settings.videos[0]} i={0} />
        </FieldRow>

      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="flex-1 min-w-0 w-full space-y-6">

        {/* Video 2 */}
        <VideoCard v={settings.videos[1]} i={1} />

        {/* Video 3 */}
        <VideoCard v={settings.videos[2]} i={2} />

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <SaveButton saving={saving} saved={saved} onClick={save} label="Save Changes" />

      </div>

    </div>
  )
}

// ─── LEVEL 3 ─────────────────────────────────────────────────────────────────

function Level3Panel() {
  const [examFile, setExamFile]             = useState<File | null>(null)
  const [uploading, setUploading]           = useState(false)
  const [uploadResult, setUploadResult]     = useState<{ success: boolean; message: string } | null>(null)
  const [uploadHistory, setUploadHistory]   = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/admin/questions-info')
      if (res.ok) {
        const data = await res.json()
        setUploadHistory(Array.isArray(data) ? data : [])
      }
    } catch (_e: unknown) {
      // silent
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    void fetchHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async () => {
    if (!examFile) return
    setUploading(true)
    setUploadResult(null)
    const fd = new FormData()
    fd.append('file', examFile)
    try {
      const res  = await fetch('/api/admin/upload-questions', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setUploadResult({ success: true, message: `✅ ${data.count} questions uploaded successfully.` })
        setExamFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        void fetchHistory()
      } else {
        setUploadResult({ success: false, message: (data.error as string) || 'Upload failed.' })
      }
    } catch (_e: unknown) {
      setUploadResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">

      {/* ── LEFT COLUMN ── */}
      <div className="flex-1 min-w-0 w-full space-y-6">

        <FieldRow label="📁 Exam History">
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-xs text-blue-600 p-4">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                Loading history...
              </div>
            ) : uploadHistory.length === 0 ? (
              <p className="text-xs text-blue-400 italic p-4">No files uploaded yet.</p>
            ) : (
              <div className="divide-y divide-blue-100 max-h-64 overflow-y-auto">
                {uploadHistory.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? 'bg-green-50' : 'bg-white'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {i === 0 && (
                          <span className="text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded shrink-0">
                            ACTIVE
                          </span>
                        )}
                        <p className="text-xs font-medium text-gray-800 truncate">{entry.fileName}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(entry.uploadedAt).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' · '}
                        <span className="font-semibold text-blue-700">{entry.count} questions</span>
                      </p>
                    </div>

                    {entry.downloadUrl ? (
                      <a
                        href={entry.downloadUrl}
                        download={entry.fileName}
                        title="Download formatted file"
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors text-[10px] font-semibold"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        .docx
                      </a>
                    ) : (
                      <span
                        title="File not available for download"
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-300 text-[10px] font-semibold cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        .docx
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </FieldRow>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-1">
          <p className="text-xs font-bold text-yellow-800">📝 File Format (.docx)</p>
          <p className="text-xs text-yellow-700 font-mono">1. Question text</p>
          <p className="text-xs text-yellow-700 font-mono">{'A. Option A    B. Option B    C. Option C    D. Option D'}</p>
          <p className="text-xs text-yellow-700 font-mono">ANSWER: A</p>
        </div>

        <a
          href="/sample-bank-questions.docx"
          download="sample-bank-questions.docx"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Sample Question Bank (.docx)
        </a>

      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="flex-1 min-w-0 w-full space-y-6">

        <FieldRow label="📤 Upload New Questions">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              examFile
                ? 'border-blue-900 bg-blue-50'
                : 'border-gray-200 hover:border-blue-900 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e) => {
                setExamFile(e.target.files?.[0] ?? null)
                setUploadResult(null)
              }}
            />
            {examFile ? (
              <>
                <p className="text-sm font-semibold text-blue-900">{examFile.name}</p>
                <p className="text-xs text-gray-400 mt-1">Click to change file</p>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-semibold text-gray-600">Click to select .docx file</p>
                <p className="text-xs text-gray-400 mt-1">Only .docx files are accepted</p>
              </>
            )}
          </div>
        </FieldRow>

        {uploadResult && (
          <p className={`text-sm px-4 py-3 rounded-xl border ${
            uploadResult.success
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {uploadResult.message}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={!examFile || uploading}
          className="w-full py-3 rounded-xl bg-blue-900 text-white font-bold text-sm hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Uploading...
            </span>
          ) : (
            'Upload & Replace Questions'
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          ⚠️ This will replace the active question set. History is kept.
        </p>

      </div>

    </div>
  )
}

// ─── LEVELS 4–7 placeholders ──────────────────────────────────────────────────

function Level4Panel() { return <EmptyLevel level={4} title="Level 4" /> }
function Level5Panel() { return <EmptyLevel level={5} title="Level 5" /> }
function Level6Panel() { return <EmptyLevel level={6} title="Level 6" /> }
function Level7Panel() { return <EmptyLevel level={7} title="Level 7" /> }

// ─── Tab config ───────────────────────────────────────────────────────────────

const LEVEL_TABS = [
  { key: 1, label: 'Level 1', sublabel: 'Requirements',  Panel: Level1Panel },
  { key: 2, label: 'Level 2', sublabel: 'Videos & Form', Panel: Level2Panel },
  { key: 3, label: 'Level 3', sublabel: 'Mock Exam',     Panel: Level3Panel },
  { key: 4, label: 'Level 4', sublabel: 'Level 4',       Panel: Level4Panel },
  { key: 5, label: 'Level 5', sublabel: 'Level 5',       Panel: Level5Panel },
  { key: 6, label: 'Level 6', sublabel: 'Level 6',       Panel: Level6Panel },
  { key: 7, label: 'Level 7', sublabel: 'Level 7',       Panel: Level7Panel },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [activeLevel, setActiveLevel] = useState(2)

  const active = LEVEL_TABS.find(t => t.key === activeLevel)!

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Page header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure content for each level of the roadmap.</p>
      </div>

      {/* Level tab strip */}
      <div className="px-6 flex-shrink-0">
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
              <span className={`text-[10px] mt-0.5 font-medium truncate max-w-[72px] ${
                activeLevel === t.key ? 'text-blue-500' : 'text-gray-400'
              }`}>
                {t.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="px-6 pt-3 flex-shrink-0">
        <div className="border-t-2 border-yellow-600" />
      </div>

      {/* Scrollable content panel */}
      <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
        <active.Panel />
      </div>

    </div>
  )
}