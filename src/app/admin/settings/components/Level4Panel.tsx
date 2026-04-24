'use client'

// admin/settings/components/Level4Panel.tsx

import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string | number
  fileName: string
  uploadedAt: string
  count: number
  downloadUrl?: string
}

interface ExamConfig {
  questionsPerSet: number
  minutesPerSet: number
  passingScore: number
  passingRequirement: {
    type: 'all' | 'count'
    requiredPasses?: number
  }
}

const DEFAULT_CONFIG: ExamConfig = {
  questionsPerSet: 50,
  minutesPerSet: 60,
  passingScore: 75,
  passingRequirement: {
    type: 'all'
  }
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Level4Panel() {
  const [config, setConfig]                 = useState<ExamConfig>(DEFAULT_CONFIG)
  const [draft, setDraft]                   = useState<ExamConfig>(DEFAULT_CONFIG)
  const [configLoading, setConfigLoading]   = useState(true)
  const [isEditing, setIsEditing]           = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [error, setError]                   = useState('')
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null)

  const [examFile, setExamFile]             = useState<File | null>(null)
  const [uploading, setUploading]           = useState(false)
  const [uploadResult, setUploadResult]     = useState<{ success: boolean; message: string } | null>(null)
  const [uploadHistory, setUploadHistory]   = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const computedSets = totalQuestions !== null
    ? Math.floor(totalQuestions / draft.questionsPerSet) + (totalQuestions % draft.questionsPerSet > 0 ? 1 : 0)
    : null
  const remainder = totalQuestions !== null ? totalQuestions % draft.questionsPerSet : 0

  useEffect(() => {
    fetch('/api/admin/level4-settings')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          const c: ExamConfig = {
            questionsPerSet: data.questionsPerSet,
            minutesPerSet:   data.minutesPerSet,
            passingScore:    data.passingScore,
            passingRequirement: data.passingRequirement || { type: 'all' }
          }
          setConfig(c)
          setDraft(c)
          setTotalQuestions(data.totalQuestions ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false))

    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/admin/questions-info')
      if (res.ok) {
        const j = await res.json()
        setUploadHistory(Array.isArray(j) ? j : [])
      }
    } catch { /* silent */ }
    finally { setLoadingHistory(false) }
  }

  const handleEdit = () => {
    setDraft({ ...config })
    setIsEditing(true)
    setError('')
  }

  const handleCancel = () => {
    setDraft({ ...config })
    setIsEditing(false)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/level4-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error()
      setConfig({ ...draft })
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save config.')
    } finally {
      setSaving(false)
    }
  }

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
        setUploadResult({ success: true, message: `✅ ${data.count} questions uploaded. ${data.totalSets} exam sets created.` })
        setTotalQuestions(data.count)
        setExamFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        fetchHistory()
      } else {
        setUploadResult({ success: false, message: data.error || 'Upload failed.' })
      }
    } catch {
      setUploadResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  if (configLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D4ED8]" />
    </div>
  )

  return (
    <div className="space-y-5">

      <TopBar
        title="Level 4 — Exam Setup"
        description="Configure exam scoring, timing, and upload the question bank."
        isEditing={isEditing} saving={saving} saved={saved}
        onEdit={handleEdit} onCancel={handleCancel} onSave={handleSave}
      />

      {error && (
        <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">⚠ {error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT COLUMN - Exam Config + Format Guide */}
        <div className="space-y-4">

          {/* Exam Configuration */}
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
                  <p className="text-white font-bold text-sm">Exam Configuration</p>
                  <p className="text-white/50 text-[11px]">Set scoring and timing rules</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { label: 'Questions / Set', key: 'questionsPerSet' as const, min: 5,  max: 200, suffix: 'Qs'  },
                  { label: 'Minutes / Set',   key: 'minutesPerSet'   as const, min: 5,  max: 300, suffix: 'min' },
                  { label: 'Passing Score',   key: 'passingScore'    as const, min: 1,  max: 100, suffix: '%'   },
                ]).map(({ label, key, min, max, suffix }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">{label}</label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="number" min={min} max={max}
                          value={draft[key]}
                          onChange={e => setDraft(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="w-full px-3 py-3 pr-10 rounded-xl border-2 border-[#E2E8F0] text-lg font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors text-center"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#94A3B8]">{suffix}</span>
                      </div>
                    ) : (
                      <div className="relative px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                        <span className="text-lg font-bold text-[#0A1628]">{draft[key]}</span>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#94A3B8]">{suffix}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Passing Requirement */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Passing Requirement</label>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="pass-all"
                        name="passingRequirement"
                        checked={draft.passingRequirement.type === 'all'}
                        onChange={() => setDraft(prev => ({ 
                          ...prev, 
                          passingRequirement: { type: 'all' } 
                        }))}
                        className="w-4 h-4 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                      />
                      <label htmlFor="pass-all" className="text-sm text-[#0A1628] font-medium">
                        Pass all exam sets
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="pass-count"
                        name="passingRequirement"
                        checked={draft.passingRequirement.type === 'count'}
                        onChange={() => setDraft(prev => ({ 
                          ...prev, 
                          passingRequirement: { type: 'count', requiredPasses: Math.max(1, Math.floor(computedSets || 1 * 0.6)) } 
                        }))}
                        className="w-4 h-4 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                      />
                      <label htmlFor="pass-count" className="text-sm text-[#0A1628] font-medium">
                        Pass specific number of sets
                      </label>
                    </div>
                    {draft.passingRequirement.type === 'count' && (
                      <div className="ml-7 space-y-2">
                        {computedSets ? (
                          <>
                            <label className="text-[10px] text-[#64748B] font-medium">
                              Required passes (out of {computedSets} sets)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={computedSets}
                              value={draft.passingRequirement.requiredPasses || 1}
                              onChange={e => setDraft(prev => ({ 
                                ...prev, 
                                passingRequirement: { 
                                  ...prev.passingRequirement, 
                                  requiredPasses: Math.min(computedSets, Math.max(1, Number(e.target.value))) 
                                } 
                              }))}
                              className="w-24 px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors text-center"
                            />
                          </>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[10px] text-[#94A3B8] italic">
                              Upload questions first to calculate total sets
                            </p>
                            <input
                              type="number"
                              min="1"
                              value={draft.passingRequirement.requiredPasses || 1}
                              onChange={e => setDraft(prev => ({ 
                                ...prev, 
                                passingRequirement: { 
                                  ...prev.passingRequirement, 
                                  requiredPasses: Math.max(1, Number(e.target.value)) 
                                } 
                              }))}
                              className="w-24 px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors text-center"
                            />
                            <p className="text-[10px] text-[#64748B]">
                              Sets will be calculated after upload
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC]">
                    {draft.passingRequirement.type === 'all' ? (
                      <p className="text-sm font-bold text-[#0A1628]">Pass all exam sets</p>
                    ) : (
                      <p className="text-sm font-bold text-[#0A1628]">
                        Pass {draft.passingRequirement.requiredPasses} out of {computedSets || '?'} sets
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Live preview */}
              {totalQuestions !== null && (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 space-y-3">
                  <p className="text-[11px] font-bold text-[#1D4ED8] uppercase tracking-widest">Live Preview</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-lg py-2.5 px-2 border border-[#BFDBFE]">
                      <p className="text-xl font-bold text-[#0A1628]">{totalQuestions}</p>
                      <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Total Qs</p>
                    </div>
                    <div className="bg-white rounded-lg py-2.5 px-2 border border-[#BFDBFE]">
                      <p className="text-xl font-bold text-[#1D4ED8]">{computedSets}</p>
                      <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Exam Sets</p>
                    </div>
                    <div className="bg-white rounded-lg py-2.5 px-2 border border-[#BFDBFE]">
                      <p className="text-xl font-bold text-[#059669]">{draft.passingScore}%</p>
                      <p className="text-[10px] text-[#64748B] font-medium mt-0.5">To Pass</p>
                    </div>
                  </div>
                  {remainder > 0 && (
                    <p className="text-[11px] text-[#60A5FA]">
                      ⚠ Last set: {remainder} fixed + {draft.questionsPerSet - remainder} random fill-in
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Question Format Guide */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#0A1628] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Question Format Guide</p>
                  <p className="text-white/50 text-[11px]">Download sample and see expected format</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-[#92400E] uppercase tracking-widest">Expected Format (.docx)</p>
                  {isEditing && (
                    <a
                      href="/sample-bank-questions.docx"
                      download="sample-bank-questions.docx"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] transition-colors text-[10px] font-bold"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" />
                      </svg>
                      Download Sample
                    </a>
                  )}
                </div>
                <p className="text-xs text-[#78350F] font-mono">1. Question text</p>
                <p className="text-xs text-[#78350F] font-mono">A. Option A &nbsp; B. Option B &nbsp; C. Option C &nbsp; D. Option D</p>
                <p className="text-xs text-[#78350F] font-mono font-bold">ANSWER: A</p>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN - Upload + History */}
        <div className="space-y-4">

          {/* Upload Questions */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#0A1628] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Upload Questions</p>
                  <p className="text-white/50 text-[11px]">Replace active question bank (.docx)</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {!isEditing ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-[#64748B] font-medium mb-2">Upload new exam questions</p>
                  <p className="text-xs text-[#94A3B8]">Click the Edit button above to upload a new question bank</p>
                </div>
              ) : (
                <>
                  {/* Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${examFile ? 'border-[#1D4ED8] bg-[#EFF6FF]' : 'border-[#E2E8F0] hover:border-[#93C5FD] hover:bg-[#F8FAFC]'}`}
                  >
                    <input
                      ref={fileInputRef} type="file" accept=".docx" className="hidden"
                      onChange={e => { setExamFile(e.target.files?.[0] ?? null); setUploadResult(null) }}
                    />
                    {examFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-[#0A1628] truncate max-w-[180px]">{examFile.name}</p>
                          <p className="text-[11px] text-[#64748B]">Click to change file</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-sm font-semibold text-[#64748B]">Click to select .docx file</p>
                        <p className="text-[11px] text-[#CBD5E1] mt-1">Only .docx files accepted</p>
                      </>
                    )}
                  </div>

                  {uploadResult && (
                    <div className={`text-sm px-4 py-3 rounded-xl border ${uploadResult.success ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'}`}>
                      {uploadResult.message}
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!examFile || uploading}
                    className="w-full py-3 rounded-xl bg-[#0A1628] text-white font-bold text-sm hover:bg-[#1E293B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading
                      ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Uploading…</>
                      : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Upload & Replace Questions</>}
                  </button>

                  <p className="text-[11px] text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2 text-center font-medium">
                    ⚠ Uploading new questions resets all user exam records.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Upload History */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#0A1628] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Upload History</p>
                  <p className="text-white/50 text-[11px]">Previous question bank versions</p>
                </div>
              </div>
            </div>
            <div>
              {loadingHistory ? (
                <div className="flex items-center gap-2 text-xs text-[#1D4ED8] p-5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#1D4ED8]" /> Loading history…
                </div>
              ) : uploadHistory.length === 0 ? (
                <p className="text-xs text-[#CBD5E1] italic p-5">No files uploaded yet.</p>
              ) : (
                <div className="divide-y divide-[#F1F5F9] max-h-52 overflow-y-auto">
                  {uploadHistory.map((entry, i) => (
                    <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${i === 0 ? 'bg-[#ECFDF5]' : 'bg-white hover:bg-[#F8FAFC]'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {i === 0 && (
                            <span className="text-[9px] font-bold bg-[#059669] text-white px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider">Active</span>
                          )}
                          <p className="text-xs font-semibold text-[#0F172A] truncate">{entry.fileName}</p>
                        </div>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">
                          {new Date(entry.uploadedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          {' · '}<span className="font-bold text-[#1D4ED8]">{entry.count} questions</span>
                        </p>
                      </div>
                      {entry.downloadUrl ? (
                        <a href={entry.downloadUrl} download={entry.fileName}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors text-[10px] font-bold border border-[#BFDBFE]">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" /></svg>
                          .docx
                        </a>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] text-[#CBD5E1] text-[10px] font-bold border border-[#E2E8F0] cursor-not-allowed">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" /></svg>
                          .docx
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}