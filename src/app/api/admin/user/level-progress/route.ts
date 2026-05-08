import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { adminAuth } from '@/lib/admin-auth'

const LEVEL3_VIDEO_REQUIREMENTS = ['watched_video_1', 'watched_video_2', 'watched_video_3']

function getLevel2Progress(requirements: string[], certStatus?: string): number {
  const trainingGuideCompleted = requirements.includes('training_guide_completed')
  const sltcLinkClicked = requirements.includes('sltc_link_clicked')
  const hasCertificate = !!certStatus

  let progress = 0
  if (trainingGuideCompleted) progress += 33.33
  if (sltcLinkClicked) progress += 33.33
  if (hasCertificate) {
    progress += certStatus === 'approved' ? 33.34 : 16.67
  }
  return Math.round(progress)
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await adminAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 })
    }

    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data() || {}
    const requirements: string[] = Array.isArray(userData.requirementsCompleted) ? userData.requirementsCompleted : []

    const [docsSettingsDoc, level5Doc, level4AttemptsSnap, level4SelectionDoc] = await Promise.all([
      adminDb.collection('settings').doc('level1').get(),
      userRef.collection('levelProgress').doc('level5').get(),
      userRef.collection('level4Exams').get(),
      userRef.get(),
    ])

    const uploadedDocuments = Array.isArray(userData.uploadedDocuments) ? userData.uploadedDocuments : []
    const level1Docs = uploadedDocuments.filter((d: any) => d.level === 1)
    const level2Cert = uploadedDocuments.find((d: any) => d.level === 2 && d.type === 'certificate')

    const level1Settings = docsSettingsDoc.exists ? docsSettingsDoc.data() : null
    const totalDocs = level1Settings?.requirements?.length ?? level1Settings?.totalDocs ?? 7
    const minDocsToPass = level1Settings?.minDocsToPass ?? 4
    const level1Progress = Math.round((Math.min(level1Docs.length, totalDocs) / totalDocs) * 100)

    const watchedVideos = LEVEL3_VIDEO_REQUIREMENTS.filter((req) => requirements.includes(req)).length
    const level3Progress = Math.round((watchedVideos / LEVEL3_VIDEO_REQUIREMENTS.length) * 100)

    const level4Selection = (level4SelectionDoc.data() || {}).level4ExamSelection || null
    const confirmedExams = Array.isArray(level4Selection?.confirmedExams) ? level4Selection.confirmedExams : []
    const level4Attempts = level4AttemptsSnap.docs.map((d) => d.data())
    const level4Progress = confirmedExams.length > 0
      ? (() => {
          let totalScore = 0
          confirmedExams.forEach((exam: any) => {
            const questionsPerSet = exam?.questionsPerSet ?? 50
            const questionCount = exam?.questionCount ?? 0
            const examSets = Math.floor(questionCount / questionsPerSet) + (questionCount % questionsPerSet > 0 ? 1 : 0)
            const requiredForExam = exam?.passingRequirement?.type === 'count'
              ? (exam?.passingRequirement?.requiredPasses ?? examSets)
              : examSets

            const examAttemptsForType = level4Attempts.filter((attempt: any) => attempt.examId === exam.id)
            const passedSets = new Set<number>()
            const attemptedSets = new Set<number>()
            examAttemptsForType.forEach((attempt: any) => {
              if (attempt.setNumber !== undefined) {
                attemptedSets.add(Number(attempt.setNumber))
                if (attempt.passed) passedSets.add(Number(attempt.setNumber))
              }
            })

            const partialProgress = attemptedSets.size - passedSets.size
            const examScore = requiredForExam > 0
              ? (passedSets.size / requiredForExam * 100) + (partialProgress / requiredForExam * 25)
              : 0
            totalScore += examScore
          })
          return Math.round(Math.min(totalScore / confirmedExams.length, 100))
        })()
      : 0

    const level5Data = level5Doc.exists ? level5Doc.data() : null
    const level5Progress = level5Data?.adminDecision === 'passed' ? 100
      : level5Data?.receiptUploaded || (level5Data?.currentStep ?? 0) >= 4 ? 75
      : level5Data?.scheduleId || (level5Data?.currentStep ?? 0) >= 3 ? 50
      : level5Data?.examType || (level5Data?.currentStep ?? 0) >= 2 ? 25
      : (level5Data?.currentStep ?? 0) >= 1 ? 10 : 0

    const progressPayload = {
      level1: {
        progress: level1Progress,
        docsCount: level1Docs.length,
        minDocsToPass,
        totalDocs,
        completed: requirements.includes('read_intro') && level1Docs.length >= minDocsToPass,
      },
      level2: {
        progress: getLevel2Progress(requirements, level2Cert?.status),
        certificateStatus: level2Cert?.status || null,
      },
      level3: {
        progress: level3Progress,
        watchedVideos,
        totalVideos: LEVEL3_VIDEO_REQUIREMENTS.length,
      },
      level4: {
        progress: level4Progress,
        confirmedExamCount: confirmedExams.length,
      },
      level5: {
        progress: level5Progress,
        raw: level5Data || null,
      },
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(progressPayload)
  } catch (error: any) {
    console.error('Failed to fetch unified level progress:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch progress' }, { status: 500 })
  }
}
