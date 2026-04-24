'use client'

// admin/settings/components/Level3Panel.tsx

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Level3Settings {
  videos: { id: string; title: string; date: string; embedUrl: string }[]
  formColumns: { label: string; value: string; isPassword?: boolean }[]
}

const DEFAULT: Level3Settings = {
  videos: [
    { id: 'v1', title: 'Insurance Concept Fundamentals Review', date: 'January 29, 2026', embedUrl: 'https://play.vidyard.com/zd7cUH72Xw7ceWEiDhvMfT' },
    { id: 'v2', title: 'Traditional Concepts Review',          date: 'January 29, 2026', embedUrl: 'https://play.vidyard.com/NosJwJuMVRDWzunbCuUdgt' },
    { id: 'v3', title: 'VUL Concepts Review',                  date: 'January 30, 2026', embedUrl: 'https://play.vidyard.com/gvANM73DMS7xwGmDuXrBLi' },
  ],
  formColumns: [
    { label: 'Video Password', value: 'sl_brightbox', isPassword: true },
    { label: 'Sun Life E-mail', value: 'jantimothy.b.sese@sunlife.com.ph' },
    { label: 'First Name',      value: 'Jan Timothy' },
    { label: 'Last Name',       value: 'Sese' },
    { label: 'Advisor Code',    value: '117617' },
  ],
}

// ─── Inline TopBar ────────────────────────────────────────────────────────────

function TopBar({
  title, description, isEditing, saving, saved,
  onEdit, onCancel, onSave,
}: {
  title: string
  description: string
  isEditing: boolean
  saving: boolean
  saved: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-[#0A1628]">{title}</h2>
        <p className="text-xs text-[#64748B] mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <button
              onClick={onCancel}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-[#E2E8F0] text-sm font-semibold text-[#64748B] bg-white hover:bg-[#F1F5F9] hover:border-[#CBD5E1] disabled:opacity-40 transition-all whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0A1628] text-white text-sm font-semibold hover:bg-[#1E293B] disabled:opacity-50 transition-all shadow-sm whitespace-nowrap"
            >
              {saving ? (
                <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> Saving…</>
              ) : saved ? (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Saved!</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Save Changes</>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border-2 border-[#0A1628] text-sm font-semibold text-[#0A1628] bg-white hover:bg-[#0A1628] hover:text-white transition-all whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({
  v, i, isEditing, onUpdate, onDelete,
}: {
  v: Level3Settings['videos'][0]
  i: number
  isEditing: boolean
  onUpdate: (i: number, field: keyof Level3Settings['videos'][0], val: string) => void
  onDelete: (i: number) => void
}) {
  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-[#E2E8F0]">
        <span className="w-6 h-6 rounded-lg bg-[#0A1628] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Video {i + 1}</span>
        {v.title && <span className="ml-auto text-[11px] text-[#94A3B8] truncate max-w-[180px]">{v.title}</span>}
        {isEditing && (
          <button
            onClick={() => onDelete(i)}
            className="ml-2 px-2 py-1 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      <div className="p-3 space-y-2.5">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Title</label>
          {isEditing ? (
            <input type="text" placeholder="Video title" value={v.title}
              onChange={e => onUpdate(i, 'title', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E2E8F0] text-sm font-medium text-[#0F172A] bg-white focus:outline-none focus:border-[#1D4ED8] transition-colors" />
          ) : (
            <div className="px-3 py-2.5 rounded-lg border-2 border-[#E2E8F0] bg-white text-sm font-medium text-[#0F172A]">
              {v.title || <span className="text-[#CBD5E1] italic">Not set</span>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Date</label>
            {isEditing ? (
              <input type="text" placeholder="e.g. January 29, 2026" value={v.date}
                onChange={e => onUpdate(i, 'date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#1D4ED8] transition-colors" />
            ) : (
              <div className="px-3 py-2.5 rounded-lg border-2 border-[#E2E8F0] bg-white text-sm text-[#0F172A]">
                {v.date || <span className="text-[#CBD5E1] italic">Not set</span>}
              </div>
            )}
          </div>
          {/* Embed URL */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest flex items-center gap-1">
              Embed URL
              {v.embedUrl && (
                <a href={v.embedUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-[#1D4ED8] font-normal normal-case text-[10px]">Preview ↗</a>
              )}
            </label>
            {isEditing ? (
              <input type="text" placeholder="https://play.vidyard.com/…" value={v.embedUrl}
                onChange={e => onUpdate(i, 'embedUrl', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E2E8F0] text-xs font-mono text-[#0F172A] bg-white focus:outline-none focus:border-[#1D4ED8] transition-colors" />
            ) : (
              <div className="px-3 py-2.5 rounded-lg border-2 border-[#E2E8F0] bg-white text-xs font-mono text-[#1D4ED8] truncate">
                {v.embedUrl || <span className="text-[#CBD5E1] italic">Not set</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Level3Panel() {
  const [settings, setSettings]   = useState<Level3Settings | null>(null)
  const [draft, setDraft]         = useState<Level3Settings | null>(null)
  const [loading, setLoading]     = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [showPass, setShowPass]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/level3-settings')
      .then(r => (r.ok ? r.json() : DEFAULT))
      .then(data => {
        const s = { ...DEFAULT, ...data }
        setSettings(s)
        setDraft(s)
      })
      .catch(() => {
        setSettings(DEFAULT)
        setDraft(DEFAULT)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleEdit = () => {
    setDraft(JSON.parse(JSON.stringify(settings)))
    setIsEditing(true)
    setError('')
  }

  const handleCancel = () => {
    setDraft(JSON.parse(JSON.stringify(settings)))
    setIsEditing(false)
    setError('')
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/level3-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error()
      setSettings(JSON.parse(JSON.stringify(draft)))
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // No direct state mutation — all updates go through setDraft with new objects
  const updateVideo = (i: number, field: keyof Level3Settings['videos'][0], val: string) => {
    if (!draft) return
    const videos = draft.videos.map((v, idx) => idx === i ? { ...v, [field]: val } : v)
    setDraft({ ...draft, videos })
  }

  const updateFormField = (i: number, val: string) => {
    if (!draft) return
    const formColumns = draft.formColumns.map((f, idx) => idx === i ? { ...f, value: val } : f)
    setDraft({ ...draft, formColumns })
  }

  const updateColumnLabel = (i: number, label: string) => {
    if (!draft) return
    const formColumns = draft.formColumns.map((f, idx) => idx === i ? { ...f, label } : f)
    setDraft({ ...draft, formColumns })
  }

  const addColumn = () => {
    if (!draft) return
    const newColumn = {
      label: '',
      value: '',
      isPassword: false
    }
    setDraft({ ...draft, formColumns: [...draft.formColumns, newColumn] })
  }

  const removeColumn = (i: number) => {
    if (!draft) return
    const formColumns = draft.formColumns.filter((_, idx) => idx !== i)
    setDraft({ ...draft, formColumns })
  }

  const togglePassword = (i: number) => {
    if (!draft) return
    const formColumns = draft.formColumns.map((f, idx) => idx === i ? { ...f, isPassword: !f.isPassword } : f)
    setDraft({ ...draft, formColumns })
  }

  const addVideo = () => {
    if (!draft) return
    const newVideo = {
      id: `v${draft.videos.length + 1}`,
      title: '',
      date: '',
      embedUrl: ''
    }
    setDraft({ ...draft, videos: [...draft.videos, newVideo] })
  }

  const removeVideo = (i: number) => {
    if (!draft) return
    const videos = draft.videos.filter((_, idx) => idx !== i)
    setDraft({ ...draft, videos })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D4ED8]" />
    </div>
  )
  if (!draft) return null

  return (
    <div className="space-y-5">

      <TopBar
        title="Level 3 — Video Training"
        description="Manage the video password, form fields, and training video links."
        isEditing={isEditing} saving={saving} saved={saved}
        onEdit={handleEdit} onCancel={handleCancel} onSave={handleSave}
      />

      {error && (
        <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">⚠ {error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT — Unified Form Columns */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#0A1628] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Form Configuration</p>
                    <p className="text-white/50 text-[11px]">Manage form fields and credentials</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <button
                      onClick={addColumn}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0A1628] text-xs font-semibold hover:bg-[#F1F5F9] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Column
                    </button>
                  )}
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">{draft.formColumns.length} fields</span>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {draft.formColumns.map((column, i) => (
                <div key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      {/* Column Label */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Column Name</label>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Video Password"
                              value={column.label}
                              onChange={e => updateColumnLabel(i, e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm font-medium text-[#0F172A] bg-white focus:outline-none focus:border-[#1D4ED8] transition-colors"
                            />
                            {isEditing && draft.formColumns.length > 1 && (
                              <button
                                onClick={() => removeColumn(i)}
                                className="px-3 py-2 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-2 rounded-lg border-2 border-[#E2E8F0] bg-white text-sm font-medium text-[#0F172A]">
                              {column.label || <span className="text-[#CBD5E1] italic">Column name</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Column Value */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Value</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Enter value"
                            value={column.value}
                            onChange={e => updateFormField(i, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm font-mono text-[#0F172A] bg-white focus:outline-none focus:border-[#1D4ED8] transition-colors"
                          />
                        ) : (
                          <div className="px-3 py-2 rounded-lg border-2 border-[#E2E8F0] bg-white text-sm font-mono text-[#0F172A]">
                            {column.value || <span className="text-[#CBD5E1] italic">Not set</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show/Hide Password Toggle */}
              {draft.formColumns.some(col => col.isPassword) && (
                <div className="flex items-center justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] bg-white hover:bg-[#F1F5F9] transition-colors"
                  >
                    {showPass ? (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>Hide Passwords</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>Show Passwords</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Videos */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#0A1628] px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Training Videos</p>
                  <p className="text-white/50 text-[11px]">Embedded video sessions for review</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    onClick={addVideo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0A1628] text-xs font-semibold hover:bg-[#F1F5F9] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Video
                  </button>
                )}
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">{draft.videos.length} videos</span>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {draft.videos.map((v, i) => (
              <VideoCard key={v.id} v={v} i={i} isEditing={isEditing} onUpdate={updateVideo} onDelete={removeVideo} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}