'use client'

// admin/settings/components/Level1Panel.tsx

import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Level1Requirement {
  type: string
  name: string
  required: boolean
  samples: string[]
}

export interface Level1Settings {
  minDocsToPass: number
  totalDocs: number
  requirements: Level1Requirement[]
}

const DEFAULT: Level1Settings = {
  minDocsToPass: 4,
  totalDocs: 7,
  requirements: [
    { type: 'resume',        name: 'Resume or CV',                   required: true, samples: [] },
    { type: 'birth_cert',    name: 'Birth Certificate (PSA Copy)',    required: true, samples: [] },
    { type: 'id_pictures',   name: '1×1 ID Photo',                   required: true, samples: ['/requirements1/ID.png'] },
    { type: 'sss',           name: 'SSS',                            required: true, samples: ['/requirements1/SSS.png', '/requirements1/SSS2.png'] },
    { type: 'tin',           name: 'Tax Identification Number (TIN)', required: true, samples: ['/requirements1/TIN.png', '/requirements1/TIN2.png'] },
    { type: 'nbi_clearance', name: 'NBI or Police Clearance',        required: true, samples: ['/requirements1/NBI.png'] },
    { type: 'itr',           name: 'Income Tax Return (ITR)',         required: true, samples: ['/requirements1/ITR.png'] },
  ],
}

// ─── Inline action buttons (shared pattern across all panels) ─────────────────

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

// ─── Requirement Row ──────────────────────────────────────────────────────────

function RequirementRow({
  req, index, total, isEditing, onUpdate, onRemove, onMove, onUploadSample, onRemoveSample, uploadingFor,
}: {
  req: Level1Requirement
  index: number
  total: number
  isEditing: boolean
  onUpdate: (i: number, v: Level1Requirement) => void
  onRemove: (i: number) => void
  onMove: (from: number, to: number) => void
  onUploadSample: (i: number, file: File) => Promise<void>
  onRemoveSample: (rIdx: number, sIdx: number) => void
  uploadingFor: number | null
}) {
  const sampleInputRef = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-3">

        {isEditing && (
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button onClick={() => onMove(index, index - 1)} disabled={index === 0}
              className="w-6 h-6 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#0A1628] hover:bg-[#F1F5F9] disabled:opacity-20 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
            </button>
            <button onClick={() => onMove(index, index + 1)} disabled={index === total - 1}
              className="w-6 h-6 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#0A1628] hover:bg-[#F1F5F9] disabled:opacity-20 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        )}

        <span className="w-6 h-6 rounded-full bg-[#0A1628] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>

        {isEditing ? (
          <input
            type="text"
            value={req.name}
            onChange={e => onUpdate(index, { ...req, name: e.target.value })}
            placeholder="Requirement name"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm font-medium text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#1D4ED8] bg-[#F8FAFC] transition-colors"
          />
        ) : (
          <span className="flex-1 min-w-0 text-sm font-medium text-[#0F172A] truncate px-1">
            {req.name || <span className="text-[#CBD5E1] italic">Unnamed</span>}
          </span>
        )}

        {isEditing ? (
          <button
            onClick={() => onUpdate(index, { ...req, required: !req.required })}
            className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${req.required ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'}`}
          >
            {req.required ? '● Required' : '○ Optional'}
          </button>
        ) : (
          <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${req.required ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'}`}>
            {req.required ? 'Required' : 'Optional'}
          </span>
        )}

        <button
          onClick={() => setExpanded(v => !v)}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${expanded ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'text-[#94A3B8] hover:text-[#0A1628] hover:bg-[#F1F5F9]'}`}
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isEditing && (
          <button
            onClick={() => onRemove(index)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#CBD5E1] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-[#E2E8F0] px-3 py-3 space-y-4 bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest w-20 flex-shrink-0">Type Key</label>
            {isEditing ? (
              <input
                type="text"
                value={req.type}
                onChange={e => onUpdate(index, { ...req, type: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="flex-1 px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-xs font-mono text-[#0F172A] bg-white focus:outline-none focus:border-[#1D4ED8] transition-colors"
              />
            ) : (
              <span className="flex-1 text-xs font-mono text-[#0F172A] bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg">{req.type}</span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">
                Samples <span className="text-[#CBD5E1] font-normal normal-case">(optional)</span>
              </label>
              {isEditing && (
                <button
                  onClick={() => sampleInputRef.current?.click()}
                  disabled={uploadingFor === index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A1628] text-white text-[10px] font-bold hover:bg-[#1E293B] disabled:opacity-50 transition-colors"
                >
                  {uploadingFor === index
                    ? <><div className="animate-spin rounded-full h-2.5 w-2.5 border-b border-white" /> Uploading…</>
                    : <>+ Add Sample</>}
                </button>
              )}
              <input
                ref={sampleInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) onUploadSample(index, f)
                  e.target.value = ''
                }}
              />
            </div>
            {req.samples.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {req.samples.map((url, si) => (
                  <div key={si} className="relative group rounded-lg overflow-hidden border border-[#E2E8F0]">
                    <img src={url} alt={`Sample ${si + 1}`} className="w-full h-16 object-cover" />
                    {isEditing && (
                      <button
                        onClick={() => onRemoveSample(index, si)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#CBD5E1] italic">No sample images yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Level1Panel() {
  const [settings, setSettings]         = useState<Level1Settings | null>(null)
  const [draft, setDraft]               = useState<Level1Settings | null>(null)
  const [loading, setLoading]           = useState(true)
  const [isEditing, setIsEditing]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState('')
  const [uploadingFor, setUploadingFor] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/level1-settings')
      .then(r => (r.ok ? r.json() : DEFAULT))
      .then(data => {
        const s = {
          ...DEFAULT,
          ...data,
          totalDocs: (data.requirements ?? DEFAULT.requirements).length, // always derive
        }
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

    const emptyName = draft.requirements.find(r => !r.name.trim())
    const emptyType = draft.requirements.find(r => !r.type.trim())
    const types = draft.requirements.map(r => r.type)
    const hasDupe = types.length !== new Set(types).size

    if (emptyName) { setError('All requirements must have a name.'); return }
    if (emptyType) { setError('All requirements must have a type key.'); return }
    if (hasDupe) { setError('Each requirement must have a unique type key.'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...draft,
        totalDocs: draft.requirements.length,
      }
      const res = await fetch('/api/admin/level1-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
      }
      setSettings(JSON.parse(JSON.stringify(payload)))
      setDraft(JSON.parse(JSON.stringify(payload)))
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      console.error('Save error:', e)
      setError(e?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateReq = (i: number, v: Level1Requirement) => {
    if (!draft) return
    const r = [...draft.requirements]
    r[i] = v
    setDraft({ ...draft, requirements: r })
  }

  const removeReq = (i: number) => {
    if (!draft) return
    const r = draft.requirements.filter((_, j) => j !== i)
    setDraft({ ...draft, requirements: r, minDocsToPass: Math.min(draft.minDocsToPass, r.length) })
  }

  const moveReq = (from: number, to: number) => {
    if (!draft) return
    const r = [...draft.requirements]
    const [item] = r.splice(from, 1)
    r.splice(to, 0, item)
    setDraft({ ...draft, requirements: r })
  }

  const addReq = () => {
    if (!draft) return
    const newR: Level1Requirement = { type: `requirement_${Date.now()}`, name: '', required: true, samples: [] }
    const r = [...draft.requirements, newR]
    setDraft({ ...draft, requirements: r })
  }

  const uploadSample = async (reqIndex: number, file: File) => {
    if (!draft) return
    setUploadingFor(reqIndex)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-sample', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')
      const r = [...draft.requirements]
      r[reqIndex] = { ...r[reqIndex], samples: [...r[reqIndex].samples, data.url] }
      setDraft({ ...draft, requirements: r })
    } catch (e: any) {
      setError(e.message || 'Failed to upload sample image.')
    } finally {
      setUploadingFor(null)
    }
  }

  const removeSample = (rIdx: number, sIdx: number) => {
    if (!draft) return
    const r = [...draft.requirements]
    r[rIdx] = { ...r[rIdx], samples: r[rIdx].samples.filter((_, i) => i !== sIdx) }
    setDraft({ ...draft, requirements: r })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D4ED8]" />
    </div>
  )
  if (!draft) return null

  const maxDocs = draft.requirements.length

  return (
    <div className="space-y-5">

      <TopBar
        title="Level 1 — Document Requirements"
        description="Manage required documents and proceed rules."
        isEditing={isEditing} saving={saving} saved={saved}
        onEdit={handleEdit} onCancel={handleCancel} onSave={handleSave}
      />

      {error && (
        <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">⚠ {error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT — Proceed Rules */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#0A1628] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Proceed Rules</p>
                <p className="text-white/50 text-[11px]">Control when users advance to Level 2</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Min Docs to Proceed</label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number" min={1} max={maxDocs}
                      value={draft.minDocsToPass}
                      onChange={e => setDraft({ ...draft, minDocsToPass: Math.min(Number(e.target.value), maxDocs) })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#E2E8F0] text-lg font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">/ {maxDocs}</span>
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-lg font-bold text-[#0A1628]">{draft.minDocsToPass}</span>
                    <span className="text-sm text-[#94A3B8] ml-1">/ {maxDocs}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Total Requirements</label>
                <div className="px-4 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F1F5F9] flex items-center gap-2">
                  <span className="text-lg font-bold text-[#0A1628]">{maxDocs}</span>
                  <span className="text-xs text-[#94A3B8] font-medium">(auto)</span>
                </div>
              </div>
            </div>
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
              <p className="text-[11px] font-bold text-[#1D4ED8] uppercase tracking-widest mb-2">Active Rule</p>
              <p className="text-sm text-[#1E40AF] leading-relaxed">
                Users must upload at least{' '}
                <span className="inline-flex items-center justify-center bg-[#1D4ED8] text-white text-xs font-bold px-2 py-0.5 rounded-md mx-0.5">{draft.minDocsToPass}</span>
                out of{' '}
                <span className="inline-flex items-center justify-center bg-[#0A1628] text-white text-xs font-bold px-2 py-0.5 rounded-md mx-0.5">{maxDocs}</span>
                documents to proceed.
              </p>
              <div className="mt-3 h-2 bg-[#BFDBFE] rounded-full overflow-hidden">
                <div className="h-full bg-[#1D4ED8] rounded-full transition-all duration-500" style={{ width: `${(draft.minDocsToPass / Math.max(maxDocs, 1)) * 100}%` }} />
              </div>
              <p className="text-[10px] text-[#60A5FA] mt-1 text-right">{Math.round((draft.minDocsToPass / Math.max(maxDocs, 1)) * 100)}% required</p>
            </div>
          </div>
        </div>

        {/* RIGHT — Requirements List */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#0A1628] px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Requirements</p>
                  <p className="text-white/50 text-[11px]">Documents users must submit</p>
                </div>
              </div>
              {isEditing && (
                <button
                  onClick={addReq}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Requirement
                </button>
              )}
            </div>
          </div>
          <div className="p-4 space-y-3">
            {draft.requirements.length === 0 ? (
              <div className="text-center py-12 text-[#CBD5E1]">
                <p className="text-sm font-medium">No requirements yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {draft.requirements.map((req, i) => (
                  <RequirementRow
                    key={req.type} req={req} index={i} total={draft.requirements.length}
                    isEditing={isEditing} onUpdate={updateReq} onRemove={removeReq} onMove={moveReq}
                    onUploadSample={uploadSample} onRemoveSample={removeSample} uploadingFor={uploadingFor}
                  />
                ))}
              </div>
            )}
            <p className="text-[10px] text-[#CBD5E1] italic px-1">Expand each row to see the type key and sample images.</p>
          </div>
        </div>

      </div>
    </div>
  )
}