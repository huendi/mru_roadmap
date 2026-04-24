'use client'

// admin/settings/components/Level2Panel.tsx
import { useState, useEffect, useRef } from 'react'
import { uploadToCloudinary } from '@/lib/cloudinary'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Level2Settings {
  trainingUrl: string
  trainingTitle: string
  trainingDescription: string
  instructionSlides: { url: string; caption?: string; publicId?: string }[]
}

const DEFAULT: Level2Settings = {
  trainingUrl: '',
  trainingTitle: 'Sun Life Financial Advisor Training',
  trainingDescription: '',
  instructionSlides: [],
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Level2Panel() {
  const [settings, setSettings]       = useState<Level2Settings | null>(null)
  const [draft, setDraft]             = useState<Level2Settings | null>(null)
  const [loading, setLoading]         = useState(true)
  const [isEditing, setIsEditing]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')
  const [uploading, setUploading]     = useState(false)
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null)
  const [captionEdit, setCaptionEdit] = useState<number | null>(null)
  const [captionVal, setCaptionVal]   = useState('')
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/level2-settings')
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
    setCaptionEdit(null)
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/level2-settings', {
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

  // Uses your existing admin upload endpoint — returns { url: string }
  const handleFiles = async (files: FileList | null) => {
    if (!files || !draft) return
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    setUploading(true)
    setError('')
    try {
      const uploaded: { url: string; caption?: string }[] = []
      for (const file of arr) {
        const url = await uploadToCloudinary(
          file,
          'mru-roadmap/admin/level2-slides', // folder in Cloudinary
        )
        uploaded.push({ url, caption: '' })
      }
      setDraft(prev => prev ? { ...prev, instructionSlides: [...prev.instructionSlides, ...uploaded] } : prev)
    } catch (e: any) {
      setError(e.message || 'Failed to upload image(s).')
    } finally {
      setUploading(false)
    }
  }

  const removeSlide = (idx: number) => {
    setDeletingIdx(idx)
    setTimeout(() => {
      setDraft(prev => prev ? { ...prev, instructionSlides: prev.instructionSlides.filter((_, i) => i !== idx) } : prev)
      setDeletingIdx(null)
    }, 220)
  }

  const saveCaption = (idx: number) => {
    setDraft(prev => {
      if (!prev) return prev
      const slides = [...prev.instructionSlides]
      slides[idx] = { ...slides[idx], caption: captionVal }
      return { ...prev, instructionSlides: slides }
    })
    setCaptionEdit(null)
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
        title="Level 2 — Training Setup"
        description="Configure the training link, title, and instruction slides."
        isEditing={isEditing} saving={saving} saved={saved}
        onEdit={handleEdit} onCancel={handleCancel} onSave={handleSave}
      />

      {error && (
        <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">⚠ {error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT — Training Info */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#0A1628] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Training Info</p>
                <p className="text-white/50 text-[11px]">Configure the training link and title</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Training Title</label>
              {isEditing ? (
                <input
                  type="text"
                  value={draft.trainingTitle}
                  onChange={e => setDraft({ ...draft, trainingTitle: e.target.value })}
                  placeholder="Sun Life Financial Advisor Training"
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-medium text-[#0F172A] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                />
              ) : (
                <div className="px-4 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-sm font-medium text-[#0F172A]">
                  {draft.trainingTitle || <span className="text-[#CBD5E1] italic">Not set</span>}
                </div>
              )}
            </div>
            {/* URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Training URL</label>
              {isEditing ? (
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </div>
                  <input
                    type="url"
                    value={draft.trainingUrl}
                    onChange={e => setDraft({ ...draft, trainingUrl: e.target.value })}
                    placeholder="https://sunlife.csod.com/…"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-mono text-[#0F172A] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                  />
                </div>
              ) : (
                <div className="px-4 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC]">
                  {draft.trainingUrl
                    ? <p className="text-sm font-mono text-[#1D4ED8] truncate">{draft.trainingUrl}</p>
                    : <p className="text-sm text-[#CBD5E1] italic">Not set</p>}
                </div>
              )}
              {draft.trainingUrl && (
                <a href={draft.trainingUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#1D4ED8] font-medium hover:underline">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Preview link
                </a>
              )}
            </div>
            {/* Slide count */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Instruction Slides</p>
                <p className="text-2xl font-bold text-[#0A1628] mt-0.5">{draft.instructionSlides.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#1D4ED8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Instruction Slides */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#0A1628] px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Instruction Slides</p>
                  <p className="text-white/50 text-[11px]">Step-by-step visual guide for users</p>
                </div>
              </div>
              {isEditing && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold disabled:opacity-50 transition-colors"
                  >
                    {uploading
                      ? <><div className="animate-spin rounded-full h-3 w-3 border-b border-white" /> Uploading…</>
                      : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg> Add Photos</>}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                </div>
              )}
            </div>
          </div>
          <div className="p-4 space-y-3">
            {draft.instructionSlides.length > 0 ? (
              <div className="space-y-2 pr-0.5">
                {draft.instructionSlides.map((slide, idx) => (
                  <div
                    key={slide.url + idx}
                    className={`flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 transition-all duration-200 ${deletingIdx === idx ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-[#0A1628] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <img src={slide.url} alt={`Step ${idx + 1}`} className="w-14 h-10 object-cover rounded-lg border border-[#E2E8F0] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {isEditing && captionEdit === idx ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus type="text" value={captionVal}
                            onChange={e => setCaptionVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveCaption(idx); if (e.key === 'Escape') setCaptionEdit(null) }}
                            placeholder="Add caption…"
                            className="flex-1 px-2 py-1.5 rounded-lg border-2 border-[#1D4ED8] text-xs focus:outline-none bg-white"
                          />
                          <button onClick={() => saveCaption(idx)} className="text-[10px] font-bold text-[#1D4ED8]">Save</button>
                          <button onClick={() => setCaptionEdit(null)} className="text-[10px] text-[#94A3B8]">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { if (isEditing) { setCaptionEdit(idx); setCaptionVal(slide.caption || '') } }}
                          className={`w-full text-left ${!isEditing ? 'cursor-default' : ''}`}
                        >
                          {slide.caption
                            ? <p className="text-xs font-medium text-[#0F172A] truncate">{slide.caption}</p>
                            : <p className="text-xs text-[#CBD5E1] italic">{isEditing ? 'Add caption…' : 'No caption'}</p>}
                        </button>
                      )}
                    </div>
                    {isEditing && (
                      <button onClick={() => removeSlide(idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#CBD5E1] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-[#CBD5E1] py-4">
                {isEditing ? 'No slides yet. Add photos above.' : 'No slides added.'}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}