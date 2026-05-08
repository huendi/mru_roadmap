'use client'

// admin/settings/components/Level4Panel.tsx

import { useState, useEffect, useRef } from 'react'
import { auth } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string | number
  fileName: string
  uploadedAt: string
  count: number
  downloadUrl?: string
  examCategory?: string
  examSubtype?: string
  examTypeId?: string
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
  const [availableExamTypes, setAvailableExamTypes] = useState<any[]>([])
  const [loadingExamTypes, setLoadingExamTypes] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadResultTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Exam type state management
  const [examCategory, setExamCategory]     = useState<'iiap' | 'ic'>('iiap')
  const [examSubtype, setExamSubtype]       = useState<'trad' | 'vul'>('trad')
  const [deletingExam, setDeletingExam]     = useState<string | null>(null)

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
    fetchExamTypes()
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

  const fetchExamTypes = async () => {
    setLoadingExamTypes(true)
    try {
      const res = await fetch('/api/admin/level4-exam-types')
      if (res.ok) {
        const data = await res.json()
        const examTypes = Object.entries(data || {})
          .filter(([_, config]: [string, any]) => config.isActive === true)
          .map(([id, config]: [string, any]) => ({
            id,
            name: config.name,
            category: config.category,
            deliveryMode: config.deliveryMode,
            questionCount: config.questionCount,
            fileName: config.fileName,
            uploadedAt: config.uploadedAt,
            // Include exam configuration fields
            questionsPerSet: config.questionsPerSet,
            minutesPerSet: config.minutesPerSet,
            passingScore: config.passingScore,
            passingRequirement: config.passingRequirement
          }))
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        setAvailableExamTypes(examTypes)
      }
    } catch { /* silent */ }
    finally { setLoadingExamTypes(false) }
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
      const payload = {
        ...draft,
        adminEmail: auth.currentUser?.email || 'Admin',
      }
      const res = await fetch('/api/admin/level4-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setConfig({ ...draft })
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 3000)

      // Log the settings update
      try {
        const { createAdminLog } = await import('@/lib/admin-logs')
        await createAdminLog(
          auth.currentUser?.email || 'Admin',
          'Level 4 Settings',
          'Settings Update',
          'Saved Level 4 exam configuration'
        )
      } catch (logError) {
        console.warn('Failed to create admin log for Level 4 save:', logError)
      }
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
    fd.append('examCategory', examCategory.toUpperCase())
    fd.append('examSubtype', examSubtype.toUpperCase())
    fd.append('questionsPerSet', draft.questionsPerSet.toString())
    fd.append('minutesPerSet', draft.minutesPerSet.toString())
    fd.append('passingScore', draft.passingScore.toString())
    fd.append('passingRequirement', JSON.stringify(draft.passingRequirement))
    
    try {
      const res  = await fetch('/api/admin/upload-questions', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        const examTypeName = `${examCategory.toUpperCase()}_${examSubtype.toUpperCase()}`
        const passingRequirement = draft.passingRequirement.type === 'all' 
          ? `Pass all ${data.totalSets} exam sets`
          : `Pass ${draft.passingRequirement.requiredPasses} of ${data.totalSets} exam sets`
        const examConfigInfo = `Exam set: ${data.totalSets} | Per set: ${draft.questionsPerSet} | Minutes: ${draft.minutesPerSet} | Passing rate: ${draft.passingScore}% | ${passingRequirement}`
        setUploadResult({ 
          success: true, 
          message: `✅ ${data.count} questions uploaded for ${examTypeName}. ${data.totalSets} exam sets created.\n${examConfigInfo} ${data.affectedUsers > 0 ? `${data.affectedUsers} users will be notified to reset their progress.` : ''}` 
        })
        // Clear upload result after 20 seconds
        if (uploadResultTimerRef.current) {
          clearTimeout(uploadResultTimerRef.current)
        }
        uploadResultTimerRef.current = setTimeout(() => {
          setUploadResult(null)
        }, 20000)
        
        setTotalQuestions(data.count)
        
        // Reset upload form to empty state
        setExamFile(null)
        setExamCategory('iiap')
        setExamSubtype('trad')
        if (fileInputRef.current) fileInputRef.current.value = ''
        
        // Reset exam configuration to default
        setDraft(DEFAULT_CONFIG)
        
        fetchHistory()
        fetchExamTypes()
      } else {
        setUploadResult({ success: false, message: data.error || 'Upload failed.' })
      }
    } catch {
      setUploadResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteExam = async (examTypeId: string, examName: string) => {
    if (!confirm(`Are you sure you want to delete "${examName}"? This will permanently remove:\n\n- All questions for this exam type\n- All user exam records\n- Associated upload history\n\nThis action cannot be undone.`)) {
      return
    }

    setDeletingExam(examTypeId)
    try {
      const res = await fetch('/api/admin/level4-exam-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examTypeId })
      })
      
      const data = await res.json()
      if (res.ok) {
        setUploadResult({ 
          success: true, 
          message: `✅ Successfully deleted "${examName}" and all associated data.`
        })
        
        // Clear upload result after 10 seconds
        if (uploadResultTimerRef.current) {
          clearTimeout(uploadResultTimerRef.current)
        }
        uploadResultTimerRef.current = setTimeout(() => {
          setUploadResult(null)
        }, 10000)
        
        // Refresh data
        fetchHistory()
        fetchExamTypes()
        
        // Update total questions if this was the only exam type
        if (availableExamTypes.length === 1) {
          setTotalQuestions(0)
        }
      } else {
        setUploadResult({
          success: false,
          message: data.error || 'Failed to delete exam type.'
        })
        
        // Clear upload result after 10 seconds
        if (uploadResultTimerRef.current) {
          clearTimeout(uploadResultTimerRef.current)
        }
        uploadResultTimerRef.current = setTimeout(() => {
          setUploadResult(null)
        }, 10000)
      }
    } catch (error) {
      console.error('Delete exam error:', error)
      setUploadResult({
        success: false,
        message: 'Network error. Please try again.'
      })
      
      // Clear upload result after 10 seconds
      if (uploadResultTimerRef.current) {
        clearTimeout(uploadResultTimerRef.current)
      }
      uploadResultTimerRef.current = setTimeout(() => {
        setUploadResult(null)
      }, 10000)
    } finally {
      setDeletingExam(null)
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* LEFT SIDE (65%) - Upload Exam Flow */}
        <div className="lg:col-span-8 space-y-4">

          {/* Upload Exam Flow - Only show in edit mode */}
          {isEditing && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="bg-[#0A1628] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Upload Exam</p>
                    <p className="text-white/50 text-[11px]">Set exam type, upload file, configure, and submit</p>
                  </div>
                </div>
              </div>
            <div className="p-5 space-y-6">
              {isEditing && (
                <>
                  {/* Step 1: Set Exam Type */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center">1</div>
                      <h3 className="text-sm font-bold text-[#0A1628]">Set Exam Type</h3>
                    </div>
                    <div className="ml-8 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Exam Category</label>
                          <select 
                            value={examCategory}
                            onChange={e => setExamCategory(e.target.value as 'iiap' | 'ic')}
                            className="w-full px-3 py-2.5 rounded-xl border-2 border-[#E2E8F0] text-sm text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          >
                            <option value="iiap">IIAP</option>
                            <option value="ic">IC</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Subtype</label>
                          <select 
                            value={examSubtype}
                            onChange={e => setExamSubtype(e.target.value as 'trad' | 'vul')}
                            className="w-full px-3 py-2.5 rounded-xl border-2 border-[#E2E8F0] text-sm text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          >
                            <option value="trad">TRAD</option>
                            <option value="vul">VUL</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Upload File */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center">2</div>
                      <h3 className="text-sm font-bold text-[#0A1628]">Upload File</h3>
                    </div>
                    <div className="ml-8">
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
                      {examFile && (
                        <div className="mt-3 text-center">
                          <p className="text-xs text-[#1D4ED8] font-medium">
                            📄 File selected: {examFile.name}
                          </p>
                          <p className="text-xs text-[#64748B] mt-1">
                            Questions will be counted after upload
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Set Exam Config */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center">3</div>
                      <h3 className="text-sm font-bold text-[#0A1628]">Set Exam Configuration</h3>
                    </div>
                    <div className="ml-8 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {([
                          { label: 'Questions / Set', key: 'questionsPerSet' as const, min: 5,  max: 200, suffix: 'Qs'  },
                          { label: 'Minutes / Set',   key: 'minutesPerSet'   as const, min: 5,  max: 300, suffix: 'min' },
                          { label: 'Passing Score',   key: 'passingScore'    as const, min: 1,  max: 100, suffix: '%'   },
                        ]).map(({ label, key, min, max, suffix }) => (
                          <div key={key} className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">{label}</label>
                            <div className="relative">
                              <input
                                type="number" min={min} max={max}
                                value={draft[key]}
                                onChange={e => setDraft(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                className="w-full px-3 py-3 pr-10 rounded-xl border-2 border-[#E2E8F0] text-lg font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors text-center"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#94A3B8]">{suffix}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Passing Requirement */}
                      <div className="space-y-3">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Passing Requirement</label>
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
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Submit */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center">4</div>
                      <h3 className="text-sm font-bold text-[#0A1628]">Submit</h3>
                    </div>
                    <div className="ml-8 space-y-4">
                      {uploadResult && (
                        <div className={`text-base px-4 py-4 rounded-xl border whitespace-pre-line ${uploadResult.success ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'}`}>
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
                          : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" /></svg> Upload & Submit Exam</>}
                      </button>

                      <p className="text-[11px] text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2 text-center font-medium">
                        ⚠ Smart Reset: Only users currently taking this exam type will be notified to reset their progress.
                      </p>
                    </div>
                  </div>
                </>
              )}

                          </div>
          </div>
          )}

          {/* Available Exam Types */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#0A1628] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Available Exam Types</p>
                  <p className="text-white/50 text-[11px]">Currently active exams users can take</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {/* Smart Reset Message at the top - Only show in view mode */}
              {!isEditing && (
                <div className="mb-4">
                  <p className="text-[11px] text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2 font-medium">
                    ⚠ Smart Reset: Only users currently taking this exam type will be notified to reset their progress.
                  </p>
                </div>
              )}
              {loadingExamTypes ? (
                <div className="flex items-center gap-2 text-xs text-[#1D4ED8]">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#1D4ED8]" /> Loading exam types…
                </div>
              ) : availableExamTypes.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-[#CBD5E1] font-medium">No exam types available</p>
                  <p className="text-xs text-[#94A3B8] mt-1">Upload questions to create exam types</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableExamTypes.map((examType, i) => {
                    const questionsPerSet = examType.questionsPerSet || draft.questionsPerSet
                    const examSets = examType.questionCount ? Math.floor(examType.questionCount / questionsPerSet) + (examType.questionCount % questionsPerSet > 0 ? 1 : 0) : 0
                    const remainder = examType.questionCount ? examType.questionCount % questionsPerSet : 0
                                        return (
                      <div key={examType.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                examType.category === 'IIAP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {examType.category}
                              </span>
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                examType.deliveryMode === 'TRAD' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {examType.deliveryMode}
                              </span>
                                                          </div>
                            <h4 className="text-sm font-semibold text-[#0A1628]">{examType.id}</h4>
                            
                            {/* Exam Summary */}
                            <div className="mt-3 space-y-2">
                              <div className="text-xs text-[#64748B]">
                                <span className="font-medium">Exam set: {examSets}</span> | 
                                <span className="font-medium"> Per set: <span className="font-bold text-[#0A1628]">{examType.questionsPerSet || draft.questionsPerSet}</span></span> | 
                                <span className="font-medium"> Minutes: <span className="font-bold text-[#0A1628]">{examType.minutesPerSet || draft.minutesPerSet}</span></span> | 
                                <span className="font-medium"> Passing rate: <span className="font-bold text-[#059669]">{examType.passingScore || draft.passingScore}%</span></span> | 
                                <span className="font-medium"> Passing requirement: <span className="font-bold text-[#1D4ED8]">
                                  {(examType.passingRequirement || draft.passingRequirement).type === 'all' 
                                    ? `Pass all ${examSets} exam sets`
                                    : `Pass ${(examType.passingRequirement || draft.passingRequirement).requiredPasses} of ${examSets} exam sets`}
                                </span></span>
                              </div>
                              {remainder > 0 && (
                                <p className="text-[11px] text-[#60A5FA]">
                                  ⚠ Last set: {remainder} fixed + {(examType.questionsPerSet || draft.questionsPerSet) - remainder} random fill-in
                                </p>
                              )}
                            </div>
                            
                            <p className="text-xs text-[#64748B] mt-2">
                              {examType.questionCount} questions · {examType.fileName}
                            </p>
                            <p className="text-xs text-[#94A3B8] mt-1">
                              Uploaded {new Date(examType.uploadedAt).toLocaleString('en-PH', {
                                month: 'short', day: 'numeric', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing && (
                              <button
                                onClick={() => handleDeleteExam(examType.id, examType.name || examType.id)}
                                disabled={deletingExam === examType.id}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                              {deletingExam === examType.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </>
                              )}
                            </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT SIDE (35%) - Format + History */}
        <div className="lg:col-span-4 space-y-4">

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
                  <p className="text-white font-bold text-sm">Format Guide</p>
                  <p className="text-white/50 text-[11px]">Expected question format</p>
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
                  <p className="text-white font-bold text-sm">History</p>
                  <p className="text-white/50 text-[11px]">Previous uploads</p>
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
                <div className="divide-y divide-[#F1F5F9]">
                  {(isEditing ? uploadHistory : uploadHistory.slice(0, 1)).map((entry, i) => (
                    <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${i === 0 ? 'bg-[#ECFDF5]' : 'bg-white hover:bg-[#F8FAFC]'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isEditing && (
                            <span className="text-[9px] font-bold bg-[#1D4ED8] text-white px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider">Latest</span>
                          )}
                          <p className="text-xs font-semibold text-[#0F172A] truncate">
                            {entry.examTypeId ? `${entry.examTypeId}_${new Date(entry.uploadedAt).toLocaleString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/[\/\s:]/g, '')}` : entry.fileName}
                          </p>
                        </div>
                        <p className="text-[10px] text-[#94A3B8] mt-0.5">
                          {new Date(entry.uploadedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          {' · '}<span className="font-bold text-[#1D4ED8]">{entry.count} questions</span>
                        </p>
                      </div>
                      {entry.downloadUrl && isEditing ? (
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
                  {!isEditing && uploadHistory.length > 1 && (
                    <div className="px-4 py-3 bg-[#F8FAFC] text-center">
                      <p className="text-xs text-[#64748B] italic">
                        {uploadHistory.length - 1} more file{uploadHistory.length - 1 > 1 ? 's' : ''} available in edit mode
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
