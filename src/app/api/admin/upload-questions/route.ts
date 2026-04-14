// app/api/admin/upload-questions/route.ts
// Accepts a .docx file, parses questions, saves them to Firestore,
// uploads file to Cloudinary, and records upload history.

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { uploadBufferToCloudinary } from '@/lib/cloudinary-server'
import mammoth from 'mammoth'

interface Question {
  id: string
  num: number
  question: string
  options: { [key: string]: string }
  answer: string
}

// ─────────────────────────────────────────────
// Parse DOCX text into questions
// ─────────────────────────────────────────────
function parseQuestions(text: string): Question[] {
  const questions: Question[] = []

  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  let current: Partial<Question> | null = null
  let questionLines: string[] = []

  const optionRegex = /^([A-F])\.\s+(.+)$/
  const answerRegex = /^ANSWER:\s*([A-F])$/i
  const questionStartRegex = /^(\d+)\.\s+(.+)$/

  const saveCurrentQuestion = () => {
    if (
      current &&
      current.num !== undefined &&
      current.question &&
      current.options &&
      Object.keys(current.options).length >= 2 &&
      current.answer
    ) {
      questions.push({
        id: String(current.num),
        num: current.num,
        question: current.question.trim(),
        options: current.options,
        answer: current.answer.toUpperCase(),
      })
    }
  }

  for (const line of lines) {
    const qMatch = line.match(questionStartRegex)
    const optMatch = line.match(optionRegex)
    const ansMatch = line.match(answerRegex)

    if (qMatch) {
      saveCurrentQuestion()
      current = {
        num: parseInt(qMatch[1], 10),
        question: qMatch[2],
        options: {},
        answer: '',
      }
      questionLines = [qMatch[2]]
    } else if (current && optMatch) {
      current.options = current.options || {}
      current.options[optMatch[1].toUpperCase()] = optMatch[2].trim()
    } else if (current && ansMatch) {
      current.answer = ansMatch[1].toUpperCase()
    } else if (current && !optMatch && !ansMatch && questionLines.length > 0) {
      const hasOptions = current.options && Object.keys(current.options).length > 0
      if (!hasOptions) {
        current.question = (current.question || '') + ' ' + line
        questionLines.push(line)
      }
    }
  }

  saveCurrentQuestion()
  return questions
}

// ─────────────────────────────────────────────
// API ROUTE
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are accepted.' }, { status: 400 })
    }

    // Convert file → buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text
    const { value: rawText } = await mammoth.extractRawText({ buffer })

    
    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from file.' },
        { status: 400 }
      )
    }

    // Parse questions
    const questions = parseQuestions(rawText)

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No valid questions found.' },
        { status: 400 }
      )
    }

    // ─────────────────────────────────────────────
    // Upload file to Cloudinary
    // ─────────────────────────────────────────────
    const uploadRes = await uploadBufferToCloudinary(buffer, file.name)

    const downloadUrl = uploadRes.secure_url
    const storagePath = uploadRes.public_id

    // ─────────────────────────────────────────────
    // Delete existing questions
    // ─────────────────────────────────────────────
    const existingSnapshot = await adminDb.collection('questions').get()
    const deletePromises = existingSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(deletePromises)

    // ─────────────────────────────────────────────
    // Save new questions (batch write)
    // ─────────────────────────────────────────────
    const BATCH_SIZE = 400

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = adminDb.batch()
      const chunk = questions.slice(i, i + BATCH_SIZE)

      chunk.forEach(q => {
        const ref = adminDb.collection('questions').doc(String(q.num))
        batch.set(ref, q)
      })

      await batch.commit()
    }

    // ─────────────────────────────────────────────
    // Save upload history
    // ─────────────────────────────────────────────
    await adminDb.collection('question_uploads').add({
      fileName: file.name,
      count: questions.length,
      storagePath,
      downloadUrl,
      uploadedAt: new Date().toISOString(),
    })

    // ─────────────────────────────────────────────
    // Response
    // ─────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      count: questions.length,
      message: `Successfully uploaded ${questions.length} questions.`,
    })

  } catch (error: any) {
    console.error('Upload questions error:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to process file.' },
      { status: 500 }
    )
  }
}