'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/auth'
import { LEVEL_REQUIREMENTS } from '@/lib/levels'
import { User } from '@/types'
import { uploadMultipleToCloudinary } from '@/lib/cloudinary'
import Navbar from '@/components/Navbar'

export default function Level1Page() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showJourney, setShowJourney] = useState(false)
  const [introChecked, setIntroChecked] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<{type: string, fileName: string, url: string, level?: number, uploadedAt?: string}[]>([])
  const [uploadingDocuments, setUploadingDocuments] = useState<string | false>(false)
  const [viewingDoc, setViewingDoc] = useState<{url: string, fileName: string} | null>(null)
  const [pendingFiles, setPendingFiles] = useState<{type: string, file: File, previewUrl: string}[]>([])
  const [progressSaved, setProgressSaved] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState<string | false>(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      if (!userData) {
        router.push('/auth')
        return
      }

      if (userData.status === 'pending') {
        router.push('/waiting-for-approval')
        return
      }

      if (userData.status === 'rejected') {
        setError('Your account has been rejected. Please contact support.')
        setLoading(false)
        return
      }

      if (!userData.profileCompleted) {
        router.push('/complete-profile')
        return
      }
      
      if (userData.currentLevel < 1) {
        router.push('/dashboard')
        return
      }
      
      setUser(userData)
      setIntroChecked((userData.requirementsCompleted || []).includes('read_intro'))
      setLoading(false)
      loadUploadedDocuments(userData)
    })

    return unsubscribe
  }, [router])

  const handleIntroCheck = (checked: boolean) => {
    setIntroChecked(checked)
    setProgressSaved(false)
    if (checked) {
      markRequirementComplete('read_intro')
    }
  }

  const markRequirementComplete = async (requirementId: string) => {
    if (!user) return
    
    try {
      const response = await fetch('/api/user/requirement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: user.uid, requirementId }),
      })

      if (!response.ok) {
        throw new Error('Failed to update progress')
      }

      if (user) {
        setUser({
          ...user,
          requirementsCompleted: [...user.requirementsCompleted, requirementId],
        })
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const updateUserLevel = async (newLevel: number) => {
    try {
      const response = await fetch('/api/user/level', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: user?.uid, level: newLevel }), // ← make sure uid is here
      })

      if (!response.ok) {
        throw new Error('Failed to update level')
      }

      if (user) {
        setUser({
          ...user,
          currentLevel: newLevel,
        })
      }
    } catch (error) {
      setError('Failed to update level')
      throw error // ← ADD THIS so handleNextLevel catches it properly
    }
  }

  const handleNextLevel = async () => {
    if (!canProceedToNext) return

    if (!progressSaved) {
      await saveProgress()
    }

    if (user && user.currentLevel < 2) {
      try {
        await updateUserLevel(2)
      } catch {
        setError('Failed to update level')
        return // ← stop here, don't proceed if DB update failed
      }
    }

    router.push('/level/2')
  }

  const viewDocument = (url: string, fileName: string) => {
    const docExists = uploadedDocuments.some(d => d.url === url)
    if (!docExists) {
      setError('Document no longer available')
      return
    }
    setViewingDoc({ url, fileName })
  }

  const loadUploadedDocuments = async (userData: User) => {
    try {
      const response = await fetch(`/api/user/documents?uid=${userData.uid}`)
      
      if (response.ok) {
        const allDocuments = await response.json()
        const level1Documents = allDocuments.filter((doc: any) => doc.level === 1)
        // Trust the DB — no HEAD check, no auto-delete
        setUploadedDocuments(level1Documents)
      } else {
        setError('Failed to load documents. Please refresh the page.')
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const saveUploadedDocuments = async (documents: {type: string, fileName: string, url: string, level?: number, uploadedAt?: string}[]) => {
    if (!user) return
    try {
      const response = await fetch('/api/user/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: user.uid, documents }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save documents')
      }
    } catch (error) {
      console.error('Failed to save documents:', error)
    }
  }

  const handleDocumentUpload = async (docType: string, file: File | null) => {
    if (!file) return

    // Build renamed file: DOCTYPE_Lastname_Firstname.ext
    const fileExt = file.name.split('.').pop()
    const lastName = user?.lastName || 'user'
    const renamedFileName = `${docType.toUpperCase()}_${lastName}.${fileExt}`
    const renamedFile = new File([file], renamedFileName, { type: file.type })

    // Store in memory only — not yet uploaded to Cloudinary
    const previewUrl = URL.createObjectURL(file)
    setPendingFiles(prev => {
      const filtered = prev.filter(p => p.type !== docType)
      return [...filtered, { type: docType, file: renamedFile, previewUrl }]
    })

    setProgressSaved(false)
    setSuccess(`${renamedFileName} ready to save!`)
    setTimeout(() => setSuccess(''), 3000)
  }

  const saveProgress = async () => {
    if (!user) return

    try {
      let currentDocs = [...uploadedDocuments]

      if (pendingFiles.length > 0) {
        setUploadingDocuments('saving')

        for (const pending of pendingFiles) {
          const url = await uploadMultipleToCloudinary(
            [pending.file],
            'mru-roadmap',
            user?.uid,
            user?.name || user?.displayName,
            pending.type
          )

          currentDocs = [
            ...currentDocs.filter(d => d.type !== pending.type),
            {
              type: pending.type,
              fileName: pending.file.name,
              url: url[0],
              level: 1,
              uploadedAt: new Date().toISOString()
            }
          ]

          URL.revokeObjectURL(pending.previewUrl)
        }

        await saveUploadedDocuments(currentDocs)
        setUploadedDocuments(currentDocs)
        setPendingFiles([])
        setUploadingDocuments(false)
      }

      await saveUploadedDocuments(currentDocs)
      setUploadedDocuments(currentDocs)

      if (currentDocs.length >= 3) {
        await markRequirementComplete('documents_uploaded')
      }

      if (introChecked) {
        await markRequirementComplete('read_intro')
      }

      // Sync removals to DB
      const res = await fetch(`/api/user/documents?uid=${user.uid}`)
      if (res.ok) {
        const dbDocs = await res.json()
        const level1DbDocs = dbDocs.filter((d: any) => d.level === 1)
        for (const dbDoc of level1DbDocs) {
          const stillExists = currentDocs.find(d => d.type === dbDoc.type)
          if (!stillExists) {
            await fetch('/api/user/documents', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: user.uid, type: dbDoc.type, level: 1 }),
            })
          }
        }
      }

      setProgressSaved(true)
      setSuccess('Progress saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Failed to save progress:', error)
      setError('Failed to save progress')
      setUploadingDocuments(false)
    }
  }

  const removeDocument = async (docType: string) => {
    try {
      const docToRemove = uploadedDocuments.find(d => d.type === docType)
      if (!docToRemove) return

      // Correct public ID extraction
      // URL: https://res.cloudinary.com/cloud/image/upload/v1234567890/folder/filename.ext
      const urlParts = docToRemove.url.split('/')
      const uploadIndex = urlParts.findIndex(part => part === 'upload')
      const afterUpload = urlParts.slice(uploadIndex + 2) // skip 'upload' AND version
      const publicId = afterUpload.join('/').replace(/\.[^/.]+$/, '')

      // Try image first, then raw for PDFs/docs
      let deleted = false

      const imageRes = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, resourceType: 'image' }),
      })
      const imageResult = await imageRes.json()

      if (imageResult.result === 'ok') {
        deleted = true
      } else {
        const rawRes = await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId, resourceType: 'raw' }),
        })
        const rawResult = await rawRes.json()
        if (rawResult.result === 'ok') deleted = true
      }

      // Remove from UI and DB
      const updatedDocs = uploadedDocuments.filter(d => d.type !== docType)
      setUploadedDocuments(updatedDocs)
      setProgressSaved(false)

      setRemoveConfirm(false)
      setSuccess(deleted ? 'File deleted successfully!' : 'File removed from records.')
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      const updatedDocs = uploadedDocuments.filter(d => d.type !== docType)
      setUploadedDocuments(updatedDocs)
      setProgressSaved(false)   
      setRemoveConfirm(false)
      setSuccess('File removed from records.')
      setTimeout(() => setSuccess(''), 3000)
    }
  } 

  // Proceed needs intro + at least 3 docs
  // Level shown as 100% only when all 6 docs uploaded + intro read
  const isIntroRead = introChecked
  const isDocumentsUploaded = uploadedDocuments.length >= 7
  const canProceedToNext = introChecked && uploadedDocuments.length >= 4
  const levelComplete = isIntroRead && isDocumentsUploaded
  const progressPercentage = Math.round(((isIntroRead ? 50 : 0) + (Math.min(uploadedDocuments.length, 7) / 7) * 50))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Level 1...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
      <Navbar />

      <main className="w-[90%] mx-auto px-4 py-8">
        {/* Notifications at top, full width */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 justify-center w-full max-w-7xl mx-auto">
          {/* Left Side - Introduction (30% on desktop, full on mobile) */}
          <div className="lg:w-[30%] w-full">
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={handleNextLevel}
                disabled={!canProceedToNext}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                  canProceedToNext 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next Level
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Financial Advisor Journey</h2>
                {isIntroRead && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Read
                  </span>
                )}
              </div>

              {!isIntroRead ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Welcome to Your Financial Advisor Journey!</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Congratulations on taking the first step toward becoming a certified Financial Advisor. 
                      This comprehensive training program is designed to equip you with the knowledge, skills, 
                      and credentials needed to succeed in this rewarding profession.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">What You'll Learn</h4>
                    <ul className="text-xs text-gray-700 space-y-1 list-disc pl-4">
                      <li>Financial planning fundamentals</li>
                      <li>Investment strategies</li>
                      <li>Risk assessment</li>
                      <li>Client relationships</li>
                      <li>Regulatory compliance</li>
                      <li>Tax planning</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Your Path to Success</h4>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      7 carefully designed levels building upon each other. Progress through registration, 
                      requirements, mock exams, and achieve certification.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <button
                    onClick={() => setShowJourney(!showJourney)}
                    className="text-blue-600 hover:text-blue-800 underline text-sm font-medium flex items-center space-x-1 mb-4"
                  >
                    <span>View Full Introduction</span>
                    <svg className={`w-3 h-3 transform transition-transform ${showJourney ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showJourney && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">What You'll Learn</h4>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                          <li>Financial planning fundamentals and best practices</li>
                          <li>Investment strategies and portfolio management</li>
                          <li>Risk assessment and management techniques</li>
                          <li>Client relationship management</li>
                          <li>Regulatory compliance and ethical standards</li>
                          <li>Tax planning and optimization strategies</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Your Path to Success</h4>
                        <p className="text-gray-700">
                          This roadmap consists of 7 carefully designed levels, each building upon the previous one. 
                          You'll progress through registration, requirements submission, mock exams, and ultimately 
                          achieve your certification.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Why Choose This Career?</h4>
                        <p className="text-gray-700">
                          Financial Advisors play a crucial role in helping individuals and families achieve their 
                          financial goals while building a successful career with excellent growth potential.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-blue-900 mb-1">Getting Started</h4>
                  <p className="text-xs text-blue-800">
                    Check the box below and upload at least 3 documents to proceed to the next level.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-red-900 mb-1">⚠️ Important Document Warning</h4>
                  <p className="text-xs text-red-800">
                    Do not upload documents that are not the exact required documents. Once uploaded, 
                    documents cannot be removed unless you contact the admin for assistance.
                  </p>
                </div>

                <div className="border-t pt-3">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={introChecked}
                      onChange={(e) => handleIntroCheck(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700">
                      I have read and understand the introduction content
                    </span>
                  </label>
                </div>

                {!isIntroRead && (
                  <button
                    onClick={handleNextLevel}
                    disabled={!canProceedToNext}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors text-sm ${
                      canProceedToNext 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Requirements List (60% on desktop, full on mobile) */}
          <div className="lg:w-[60%] w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Requirements Checklist</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={saveProgress}
                    disabled={progressSaved}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                      progressSaved 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {progressSaved ? 'Saved ✓' : 'Save'}
                  </button>
                </div>
              </div>
              
              {/* Progress Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Documents Uploaded: {uploadedDocuments.length}/7
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Overall Progress:</span>
                    <span className={`text-sm font-bold ${
                      levelComplete ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {progressPercentage}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress Status:</span>
                  <span className={`text-sm font-medium ${
                    progressSaved ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {progressSaved ? '✓ Saved' : '⚠️ Not Saved'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Next Level Eligibility:</span>
                  <span className={`text-sm font-medium ${
                    canProceedToNext ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {canProceedToNext
                      ? '✓ Ready'
                      : `${Math.max(0, 4 - uploadedDocuments.length)} more document${Math.max(0, 4 - uploadedDocuments.length) !== 1 ? 's' : ''} needed (min 4 of 7)`
                    }
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Introduction Status */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        isIntroRead ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span className="font-medium text-gray-900">Read Introduction</span>
                    </div>
                    {isIntroRead ? (
                      <span className="text-green-600 text-sm font-medium">Completed</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Pending</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 ml-7">
                    Check the box in the introduction section after reading
                  </p>
                </div>

                {/* Document Upload Requirements */}
                {[
                  { type: 'resume', name: 'Resume or CV', required: true, samples: [] },
                  { type: 'birth_cert', name: 'Birth Certificate (PSA Copy)', required: true, samples: [] },
                  { type: 'id_pictures', name: '1×1 ID Photo', required: true, samples: ['/requirements1/ID.png'] },
                  { type: 'sss', name: 'SSS', required: true, samples: ['/requirements1/SSS.png', '/requirements1/SSS2.png'] },
                  { type: 'tin', name: 'Tax Identification Number (TIN)', required: true, samples: ['/requirements1/TIN.png', '/requirements1/TIN2.png'] },
                  { type: 'nbi_clearance', name: 'NBI or Police Clearance', required: true, samples: ['/requirements1/NBI.png'] },
                  { type: 'itr', name: 'Income Tax Return (ITR)', required: true, samples: ['/requirements1/ITR.png'] },
                ].map((doc) => (
                  <div key={doc.type} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${
                          uploadedDocuments.find(d => d.type === doc.type)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}></div>
                        <span className="font-medium text-gray-900">
                          {doc.name} {doc.required && <span className="text-red-500">*</span>}
                        </span>
                      </div>
                      {uploadedDocuments.find(d => d.type === doc.type) ? (
                        <span className="text-green-600 text-sm font-medium">Uploaded</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Not uploaded</span>
                      )}
                    </div>

                    {/* Sample Images */}
                    {doc.samples.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1 font-medium">Sample:</p>
                        <div className={`grid gap-2 ${doc.samples.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {doc.samples.map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`Sample ${doc.name} ${i + 1}`}
                              className="w-full max-h-40 object-contain rounded-lg border border-gray-200 bg-gray-50"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(doc.type, e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={
                          uploadingDocuments === 'saving' ||
                          Boolean(uploadedDocuments.find(d => d.type === doc.type))
                        }
                      />

                      {uploadingDocuments === 'saving' && pendingFiles.find(p => p.type === doc.type) && (
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </div>
                      )}

                      {!uploadedDocuments.find(d => d.type === doc.type) && pendingFiles.find(p => p.type === doc.type) && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm text-orange-500 truncate max-w-[70%]">
                            ⏳ {pendingFiles.find(p => p.type === doc.type)?.file.name}
                          </span>
                          <button
                            onClick={() => setPendingFiles(prev => prev.filter(p => p.type !== doc.type))}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {uploadedDocuments.find(d => d.type === doc.type) && (
                        <div className="mt-2 flex flex-col gap-1">
                          <span className="text-sm text-green-600 truncate max-w-full">
                            ✓ {uploadedDocuments.find(d => d.type === doc.type)?.fileName}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => viewDocument(
                                uploadedDocuments.find(d => d.type === doc.type)?.url || '',
                                uploadedDocuments.find(d => d.type === doc.type)?.fileName || ''
                              )}
                              className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => setRemoveConfirm(doc.type)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Level Complete Button */}
        {levelComplete && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Level 1 Complete! Go to Dashboard
            </button>
          </div>
        )}

        {/* Remove Confirmation Modal */}
        {removeConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Remove Document?</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-6">
                Are you sure you want to remove <span className="font-semibold">
                  {[
                    { type: 'resume', name: 'Resume or CV' },
                    { type: 'birth_cert', name: 'Birth Certificate (PSA Copy)' },
                    { type: 'id_pictures', name: '1×1 ID Photo' },
                    { type: 'sss', name: 'SSS' },
                    { type: 'tin', name: 'Tax Identification Number (TIN)' },
                    { type: 'nbi_clearance', name: 'NBI or Police Clearance' },
                    { type: 'itr', name: 'Income Tax Return (ITR)' },
                  ].find(d => d.type === removeConfirm)?.name || removeConfirm}
                </span>?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setRemoveConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeDocument(removeConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Document Viewer Modal */}
        {viewingDoc && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setViewingDoc(null) }}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
              style={{ height: '90vh' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                <p className="text-sm font-semibold text-gray-800 truncate flex-1 pr-4">
                  {viewingDoc.fileName}
                </p>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Viewer */}
              <div className="flex-1 overflow-auto bg-gray-100">
                {viewingDoc.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <div className="flex items-center justify-center min-h-full p-4">
                    <img
                      src={viewingDoc.url}
                      alt={viewingDoc.fileName}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                    />
                  </div>
                  ) : (
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDoc.url)}&embedded=true`}
                      className="w-full h-full"
                      title={viewingDoc.fileName}
                    />
                  )}  
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setViewingDoc(null)}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}