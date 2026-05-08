'use client'

// components/Level5Panel.tsx

import React, { useState, useEffect } from 'react'
import { auth } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamConfig {
  examTypes: {
    ic: { 
      trad: { faceToFacePrice: number; onlinePrice: number }
      vul: { faceToFacePrice: number; onlinePrice: number }
      enabled: boolean 
    }
    iiap: { 
      trad: { faceToFacePrice: number; onlinePrice: number }
      vul: { faceToFacePrice: number; onlinePrice: number }
      enabled: boolean 
    }
  }
  schedules: ExamSchedule[]
}

interface ExamSchedule {
  id: string
  examType: 'ic' | 'iiap'
  mode?: 'trad-face-to-face' | 'trad-online' | 'vul-face-to-face' | 'vul-online'  // Combined mode values
  date: string
  time: string
  location: string
  maxSlots: number
  currentSlots: number
  status: 'active' | 'full' | 'cancelled'
}

interface ExamApproval {
  userId: string
  userEmail: string
  userName: string
  examType: 'ic' | 'iiap'
  iiapMode?: 'face-to-face' | 'online'
  scheduleId: string
  scheduleDate: string
  scheduleTime?: string
  scheduleLocation?: string
  receiptUrl?: string
  currentStep: number
  adminDecision?: 'passed' | 'failed' | 'pending'
  adminNotes?: string
  submittedAt: string
  reviewedAt?: string
}

const DEFAULT_CONFIG: ExamConfig = {
  examTypes: {
    ic: { 
      trad: { faceToFacePrice: 1000, onlinePrice: 1015 },
      vul: { faceToFacePrice: 1000, onlinePrice: 1015 },
      enabled: true 
    },
    iiap: { 
      trad: { faceToFacePrice: 1000, onlinePrice: 1015 },
      vul: { faceToFacePrice: 1000, onlinePrice: 1015 },
      enabled: true 
    }
  },
  schedules: []
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

export default function Level5Panel() {
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_CONFIG)
  const [draft, setDraft] = useState<ExamConfig>(DEFAULT_CONFIG)
  const [configLoading, setConfigLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [approvals, setApprovals] = useState<ExamApproval[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(true)
  const [selectedApproval, setSelectedApproval] = useState<ExamApproval | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [processingApproval, setProcessingApproval] = useState(false)

  const [newSchedule, setNewSchedule] = useState<Partial<ExamSchedule>>({
    examType: 'ic',
    mode: 'trad-face-to-face',
    date: '',
    time: '',
    location: '',
    maxSlots: 50,
    currentSlots: 0,
    status: 'active'
  })

  useEffect(() => {
    fetchConfig()
    fetchApprovals()
  }, [])

  const fetchConfig = async () => {
    setConfigLoading(true)
    try {
      const res = await fetch('/api/admin/level5-settings')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setDraft(data)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setConfigLoading(false)
    }
  }

  const fetchApprovals = async () => {
    setApprovalsLoading(true)
    try {
      const res = await fetch('/api/admin/level5-exam-approvals')
      if (res.ok) {
        const data = await res.json()
        setApprovals(data)
      }
    } catch (error) {
      console.error('Error fetching approvals:', error)
    } finally {
      setApprovalsLoading(false)
    }
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
        config: draft,
        adminEmail: auth.currentUser?.email || 'Admin',
      }
      const res = await fetch('/api/admin/level5-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()
      setConfig({ ...draft })
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 3000)

      // Log the settings update
      try {
        const { createAdminLog } = await import('@/lib/admin-logs')
        await createAdminLog(
          auth.currentUser?.email || 'Admin',
          'Level 5 Settings',
          'Settings Update',
          'Saved Level 5 exam fees and schedules configuration'
        )
      } catch (logError) {
        console.warn('Failed to create admin log for Level 5 save:', logError)
      }
    } catch (error) {
      console.error('Save error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration. Please try again.'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleAddSchedule = () => {
    if (!newSchedule.date || !newSchedule.time || !newSchedule.location) return

    const schedule: ExamSchedule = {
      id: Date.now().toString(),
      examType: newSchedule.examType!,
      mode: newSchedule.mode,
      date: newSchedule.date!,
      time: newSchedule.time!,
      location: newSchedule.location!,
      maxSlots: newSchedule.maxSlots!,
      currentSlots: newSchedule.currentSlots!,
      status: newSchedule.status as 'active' | 'full' | 'cancelled'
    }

    setDraft(prev => ({
      ...prev,
      schedules: [...prev.schedules, schedule]
    }))

    setNewSchedule({
      examType: 'ic',
      mode: 'trad-face-to-face',
      date: '',
      time: '',
      location: '',
      maxSlots: 50,
      currentSlots: 0,
      status: 'active'
    })
  }

  const handleRemoveSchedule = (scheduleId: string) => {
    setDraft(prev => ({
      ...prev,
      schedules: prev.schedules.filter(s => s.id !== scheduleId)
    }))
  }

  const handleApproval = async (decision: 'passed' | 'failed') => {
    if (!selectedApproval) return

    setProcessingApproval(true)
    try {
      const res = await fetch('/api/admin/level5-exam-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedApproval.userId,
          decision,
          notes: approvalNotes
        }),
      })

      if (res.ok) {
        await fetchApprovals()
        setSelectedApproval(null)
        setApprovalNotes('')
      }
    } catch (error) {
      console.error('Error processing approval:', error)
    } finally {
      setProcessingApproval(false)
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
        title="Level 5 — Licensure Exam Management"
        description="Configure exam fees and schedules."
        isEditing={isEditing} saving={saving} saved={saved}
        onEdit={handleEdit} onCancel={handleCancel} onSave={handleSave}
      />

      {error && (
        <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">⚠ {error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── LEFT COLUMN — Fee Setup (50%) ── */}
        <div className="space-y-4">

          {/* Exam Types / Pricing */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden h-full">
            <div className="bg-[#0A1628] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Fee Setup</p>
                  <p className="text-white/50 text-[11px]">Set exam fees and pricing</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* IC Exam Pricing */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#0A1628] uppercase tracking-wider">IC Exam</h3>
                
                {/* TRAD Pricing */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wide">TRAD</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Face-to-Face</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₱</span>
                          <input
                            type="number"
                            value={draft.examTypes.ic.trad.faceToFacePrice}
                            onChange={e => setDraft(prev => ({
                              ...prev,
                              examTypes: { 
                                ...prev.examTypes, 
                                ic: { 
                                  ...prev.examTypes.ic, 
                                  trad: { ...prev.examTypes.ic.trad, faceToFacePrice: Number(e.target.value) } 
                                } 
                              }
                            }))}
                            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                          <span className="text-sm font-bold text-[#0A1628]">₱{draft.examTypes.ic.trad.faceToFacePrice}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Online</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₱</span>
                          <input
                            type="number"
                            value={draft.examTypes.ic.trad.onlinePrice}
                            onChange={e => setDraft(prev => ({
                              ...prev,
                              examTypes: { 
                                ...prev.examTypes, 
                                ic: { 
                                  ...prev.examTypes.ic, 
                                  trad: { ...prev.examTypes.ic.trad, onlinePrice: Number(e.target.value) } 
                                } 
                              }
                            }))}
                            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                          <span className="text-sm font-bold text-[#0A1628]">₱{draft.examTypes.ic.trad.onlinePrice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* VUL Pricing */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wide">VUL</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Face-to-Face</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₱</span>
                          <input
                            type="number"
                            value={draft.examTypes.ic.vul.faceToFacePrice}
                            onChange={e => setDraft(prev => ({
                              ...prev,
                              examTypes: { 
                                ...prev.examTypes, 
                                ic: { 
                                  ...prev.examTypes.ic, 
                                  vul: { ...prev.examTypes.ic.vul, faceToFacePrice: Number(e.target.value) } 
                                } 
                              }
                            }))}
                            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                          <span className="text-sm font-bold text-[#0A1628]">₱{draft.examTypes.ic.vul.faceToFacePrice}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Online</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₱</span>
                          <input
                            type="number"
                            value={draft.examTypes.ic.vul.onlinePrice}
                            onChange={e => setDraft(prev => ({
                              ...prev,
                              examTypes: { 
                                ...prev.examTypes, 
                                ic: { 
                                  ...prev.examTypes.ic, 
                                  vul: { ...prev.examTypes.ic.vul, onlinePrice: Number(e.target.value) } 
                                } 
                              }
                            }))}
                            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                          <span className="text-sm font-bold text-[#0A1628]">₱{draft.examTypes.ic.vul.onlinePrice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* IIAP Exam Pricing */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#0A1628] uppercase tracking-wider">IIAP Exam</h3>
                
                {/* TRAD Pricing */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wide">TRAD</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Face-to-Face</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₱</span>
                          <input
                            type="number"
                            value={draft.examTypes.iiap.trad.faceToFacePrice}
                            onChange={e => setDraft(prev => ({
                              ...prev,
                              examTypes: { 
                                ...prev.examTypes, 
                                iiap: { 
                                  ...prev.examTypes.iiap, 
                                  trad: { ...prev.examTypes.iiap.trad, faceToFacePrice: Number(e.target.value) } 
                                } 
                              }
                            }))}
                            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                          <span className="text-sm font-bold text-[#0A1628]">₱{draft.examTypes.iiap.trad.faceToFacePrice}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Online</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₱</span>
                          <input
                            type="number"
                            value={draft.examTypes.iiap.trad.onlinePrice}
                            onChange={e => setDraft(prev => ({
                              ...prev,
                              examTypes: { 
                                ...prev.examTypes, 
                                iiap: { 
                                  ...prev.examTypes.iiap, 
                                  trad: { ...prev.examTypes.iiap.trad, onlinePrice: Number(e.target.value) } 
                                } 
                              }
                            }))}
                            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                          <span className="text-sm font-bold text-[#0A1628]">₱{draft.examTypes.iiap.trad.onlinePrice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* VUL Pricing */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wide">VUL</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Face-to-Face</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₱</span>
                          <input
                            type="number"
                            value={draft.examTypes.iiap.vul.faceToFacePrice}
                            onChange={e => setDraft(prev => ({
                              ...prev,
                              examTypes: { 
                                ...prev.examTypes, 
                                iiap: { 
                                  ...prev.examTypes.iiap, 
                                  vul: { ...prev.examTypes.iiap.vul, faceToFacePrice: Number(e.target.value) } 
                                } 
                              }
                            }))}
                            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                          <span className="text-sm font-bold text-[#0A1628]">₱{draft.examTypes.iiap.vul.faceToFacePrice}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Online</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₱</span>
                          <input
                            type="number"
                            value={draft.examTypes.iiap.vul.onlinePrice}
                            onChange={e => setDraft(prev => ({
                              ...prev,
                              examTypes: { 
                                ...prev.examTypes, 
                                iiap: { 
                                  ...prev.examTypes.iiap, 
                                  vul: { ...prev.examTypes.iiap.vul, onlinePrice: Number(e.target.value) } 
                                } 
                              }
                            }))}
                            className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-[#E2E8F0] text-sm font-bold text-[#0A1628] bg-[#F8FAFC] focus:outline-none focus:border-[#1D4ED8] focus:bg-white transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="px-3 py-3 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] text-center">
                          <span className="text-sm font-bold text-[#0A1628]">₱{draft.examTypes.iiap.vul.onlinePrice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>{/* end Fee Setup card */}

        </div>{/* end LEFT COLUMN */}

        {/* ── RIGHT COLUMN — Scheduling (50%) ── */}
        <div className="space-y-4">

          {/* Schedule Management */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden h-full">
            <div className="bg-[#0A1628] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Scheduling</p>
                  <p className="text-white/50 text-[11px]">Manage exam dates and venues</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Add Schedule Form */}
              {isEditing && (
                <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-3 border border-[#E2E8F0]">
                  <h3 className="text-sm font-bold text-[#0A1628]">Add New Schedule</h3>

                  {/* Row 1 — Exam Type */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">
                      Exam Type
                    </label>
                    <select
                      value={newSchedule.examType}
                      onChange={e => setNewSchedule(prev => ({
                        ...prev,
                        examType: e.target.value as 'ic' | 'iiap',
                        mode: e.target.value === 'ic' ? 'trad-face-to-face' : undefined,
                      }))}
                      className="w-full px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm text-[#0A1628] bg-white focus:outline-none focus:border-[#1D4ED8]"
                    >
                      <option value="ic">IC Exam</option>
                      <option value="iiap">IIAP Exam</option>
                    </select>
                  </div>

                  {/* Row 2 — IC Mode Selection */}
                  {newSchedule.examType === 'ic' && (
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">
                        IC Exam Type
                      </label>
                      
                      {/* TRAD Section */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wide">TRAD</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'trad-face-to-face', label: 'Face-to-face', price: draft.examTypes.ic.trad.faceToFacePrice },
                            { value: 'trad-online', label: 'Online', price: draft.examTypes.ic.trad.onlinePrice },
                          ] as const).map((mode) => (
                            <label
                              key={mode.value}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                                newSchedule.examType === 'ic' && newSchedule.mode === mode.value
                                  ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                                  : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="icMode"
                                value={mode.value}
                                checked={newSchedule.examType === 'ic' && newSchedule.mode === mode.value}
                                onChange={() => setNewSchedule(prev => ({ ...prev, mode: mode.value }))}
                                className="accent-[#1D4ED8]"
                              />
                              <span className="text-sm font-semibold text-[#0A1628]">{mode.label}</span>
                              <span className="text-xs text-[#64748B] ml-auto">₱{mode.price}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* VUL Section */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wide">VUL</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'vul-face-to-face', label: 'Face-to-face', price: draft.examTypes.ic.vul.faceToFacePrice },
                            { value: 'vul-online', label: 'Online', price: draft.examTypes.ic.vul.onlinePrice },
                          ] as const).map((mode) => (
                            <label
                              key={mode.value}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                                newSchedule.examType === 'ic' && newSchedule.mode === mode.value
                                  ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                                  : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="icMode"
                                value={mode.value}
                                checked={newSchedule.examType === 'ic' && newSchedule.mode === mode.value}
                                onChange={() => setNewSchedule(prev => ({ ...prev, mode: mode.value }))}
                                className="accent-[#1D4ED8]"
                              />
                              <span className="text-sm font-semibold text-[#0A1628]">{mode.label}</span>
                              <span className="text-xs text-[#64748B] ml-auto">₱{mode.price}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 2 — IIAP Mode Selection */}
                  {newSchedule.examType === 'iiap' && (
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">
                        IIAP Exam Type
                      </label>
                      
                      {/* TRAD Section */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wide">TRAD</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'trad-face-to-face', label: 'Face-to-face', price: draft.examTypes.iiap.trad.faceToFacePrice },
                            { value: 'trad-online', label: 'Online', price: draft.examTypes.iiap.trad.onlinePrice },
                          ] as const).map((mode) => (
                            <label
                              key={mode.value}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                                newSchedule.examType === 'iiap' && newSchedule.mode === mode.value
                                  ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                                  : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="iiapMode"
                                value={mode.value}
                                checked={newSchedule.examType === 'iiap' && newSchedule.mode === mode.value}
                                onChange={() => setNewSchedule(prev => ({ ...prev, mode: mode.value }))}
                                className="accent-[#1D4ED8]"
                              />
                              <span className="text-sm font-semibold text-[#0A1628]">{mode.label}</span>
                              <span className="text-xs text-[#64748B] ml-auto">₱{mode.price}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* VUL Section */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-[#475569] uppercase tracking-wide">VUL</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'vul-face-to-face', label: 'Face-to-face', price: draft.examTypes.iiap.vul.faceToFacePrice },
                            { value: 'vul-online', label: 'Online', price: draft.examTypes.iiap.vul.onlinePrice },
                          ] as const).map((mode) => (
                            <label
                              key={mode.value}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                                newSchedule.examType === 'iiap' && newSchedule.mode === mode.value
                                  ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                                  : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="iiapMode"
                                value={mode.value}
                                checked={newSchedule.examType === 'iiap' && newSchedule.mode === mode.value}
                                onChange={() => setNewSchedule(prev => ({ ...prev, mode: mode.value }))}
                                className="accent-[#1D4ED8]"
                              />
                              <span className="text-sm font-semibold text-[#0A1628]">{mode.label}</span>
                              <span className="text-xs text-[#64748B] ml-auto">₱{mode.price}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 3 — Date + Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Date</label>
                      <input
                        type="date"
                        value={newSchedule.date}
                        onChange={e => setNewSchedule(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm text-[#0A1628] bg-white focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Time</label>
                      <input
                        type="time"
                        value={newSchedule.time}
                        onChange={e => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm text-[#0A1628] bg-white focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                  </div>

                  {/* Row 4 — Location */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Makati CBD, BGC, Online via Zoom"
                      value={newSchedule.location}
                      onChange={e => setNewSchedule(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm text-[#0A1628] bg-white focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>

                  {/* Row 5 — Max Slots + Add Button */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest block">
                        Max Slots
                      </label>
                      <input
                        type="number"
                        placeholder="50"
                        value={newSchedule.maxSlots}
                        onChange={e => setNewSchedule(prev => ({ ...prev, maxSlots: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-lg border-2 border-[#E2E8F0] text-sm text-[#0A1628] bg-white focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddSchedule}
                        disabled={!newSchedule.date || !newSchedule.time || !newSchedule.location}
                        className="w-full px-4 py-2 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add Schedule
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule List */}
              <div className="space-y-2">
                {draft.schedules.length === 0 ? (
                  <p className="text-xs text-[#CBD5E1] italic text-center py-6">No schedules configured yet.</p>
                ) : (
                  /* Group schedules by examType + mode for easier reading */
                  (() => {
                    const groups: { label: string; color: string; schedules: ExamSchedule[] }[] = [
                      {
                        label: 'IC — TRAD — Face-to-face',
                        color: 'bg-blue-50 border-blue-200 text-blue-700',
                        schedules: draft.schedules.filter(s => s.examType === 'ic' && s.mode === 'trad-face-to-face'),
                      },
                      {
                        label: 'IC — TRAD — Online',
                        color: 'bg-blue-100 border-blue-300 text-blue-800',
                        schedules: draft.schedules.filter(s => s.examType === 'ic' && s.mode === 'trad-online'),
                      },
                      {
                        label: 'IC — VUL — Face-to-face',
                        color: 'bg-purple-50 border-purple-200 text-purple-700',
                        schedules: draft.schedules.filter(s => s.examType === 'ic' && s.mode === 'vul-face-to-face'),
                      },
                      {
                        label: 'IC — VUL — Online',
                        color: 'bg-purple-100 border-purple-300 text-purple-800',
                        schedules: draft.schedules.filter(s => s.examType === 'ic' && s.mode === 'vul-online'),
                      },
                      {
                        label: 'IIAP — TRAD — Face-to-face',
                        color: 'bg-green-50 border-green-200 text-green-700',
                        schedules: draft.schedules.filter(s => s.examType === 'iiap' && s.mode === 'trad-face-to-face'),
                      },
                      {
                        label: 'IIAP — TRAD — Online',
                        color: 'bg-green-100 border-green-300 text-green-800',
                        schedules: draft.schedules.filter(s => s.examType === 'iiap' && s.mode === 'trad-online'),
                      },
                      {
                        label: 'IIAP — VUL — Face-to-face',
                        color: 'bg-amber-50 border-amber-200 text-amber-700',
                        schedules: draft.schedules.filter(s => s.examType === 'iiap' && s.mode === 'vul-face-to-face'),
                      },
                      {
                        label: 'IIAP — VUL — Online',
                        color: 'bg-amber-100 border-amber-300 text-amber-800',
                        schedules: draft.schedules.filter(s => s.examType === 'iiap' && s.mode === 'vul-online'),
                      },
                    ].filter(g => g.schedules.length > 0)

                    return groups.map((group) => (
                      <div key={group.label} className="mb-3">
                        {/* Group header */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-2 ${group.color}`}>
                          <span className="text-xs font-bold uppercase tracking-wider">{group.label}</span>
                          <span className="ml-auto text-xs font-semibold">{group.schedules.length} schedule{group.schedules.length > 1 ? 's' : ''}</span>
                        </div>

                        {/* Schedules in group */}
                        <div className="space-y-1.5 pl-2">
                          {group.schedules.map((schedule) => {
                            const slotsLeft = schedule.maxSlots - schedule.currentSlots
                            const slotsPct  = (schedule.currentSlots / schedule.maxSlots) * 100

                            return (
                              <div key={schedule.id} className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0]">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-[#64748B] space-y-0.5">
                                      <p className="flex items-center gap-1">
                                        <span>📅</span>
                                        <span>{new Date(schedule.date).toLocaleDateString('en-PH', {
                                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                        })}</span>
                                      </p>
                                      <p className="flex items-center gap-1">
                                        <span>🕒</span><span>{schedule.time}</span>
                                      </p>
                                      <p className="flex items-center gap-1">
                                        <span>📍</span>
                                        <span className="truncate">{schedule.location}</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Slots */}
                                  <div className="flex-shrink-0 text-right min-w-[80px]">
                                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-0.5">Slots</p>
                                    <p className={`text-sm font-bold ${slotsLeft <= 5 ? 'text-red-600' : 'text-[#0A1628]'}`}>
                                      {slotsLeft} <span className="text-xs font-normal text-[#94A3B8]">left</span>
                                    </p>
                                    <p className="text-[10px] text-[#94A3B8]">{schedule.currentSlots}/{schedule.maxSlots} filled</p>
                                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                      <div
                                        className={`h-1 rounded-full ${slotsPct >= 80 ? 'bg-red-500' : slotsPct >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        style={{ width: `${slotsPct}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Remove */}
                                  {isEditing && (
                                    <button
                                      onClick={() => handleRemoveSchedule(schedule.id)}
                                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors ml-1"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  })()
                )}
              </div>
            </div>
          </div>{/* end Schedule Management card */}

        </div>{/* end RIGHT COLUMN */}

      </div>{/* end grid */}
    </div>
  )
}