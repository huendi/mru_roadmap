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
  let questionCounter = 1

  // Enhanced flexible regex patterns
  const optionRegexes = [
    /^([A-Fa-f])\.\s*(.+)$/,           // "A. Option text"
    /^([A-Fa-f])\)\s*(.+)$/,           // "A) Option text"  
    /^([A-Fa-f])\s+(.+)$/,             // "A Option text"
    /^([A-Fa-f])\s*-\s*(.+)$/,         // "A - Option text"
    /^([A-Fa-f])\s*–\s*(.+)$/,         // "A – Option text"
  ]
  
  const answerRegexes = [
    /^ANSWER:\s*([A-Fa-f])$/i,         // "ANSWER: A"
    /^Answer:\s*([A-Fa-f])$/i,         // "Answer: A"
    /^answer:\s*([A-Fa-f])$/i,         // "answer: A"
    /^ANS:\s*([A-Fa-f])$/i,            // "ANS: A"
    /^Ans:\s*([A-Fa-f])$/i,            // "Ans: A"
    /^ans:\s*([A-Fa-f])$/i,            // "ans: A"
    /^([A-Fa-f])\s*is\s*the\s*answer$/i, // "A is the answer"
    /^Correct\s*answer:\s*([A-Fa-f])$/i, // "Correct answer: A"
    /^Key:\s*([A-Fa-f])$/i,            // "Key: A"
  ]
  
  const questionStartRegexes = [
    /^(\d+)\.\s*(.+)$/,                // "1. Question text"
    /^(\d+)\)\s*(.+)$/,                // "1) Question text"
    /^(\d+)\s+(.+)$/,                  // "1 Question text"
    /^Q(\d+)\.?\s*(.+)$/i,             // "Q1. Question text" or "Q1 Question text"
    /^Question\s+(\d+):\s*(.+)$/i,     // "Question 1: Question text"
    /^(\d+)\.?\s*(.+)$/,               // "1. Question text" or "1 Question text"
  ]

  const saveCurrentQuestion = () => {
    if (
      current &&
      current.question &&
      current.options &&
      Object.keys(current.options).length >= 2 &&
      current.answer
    ) {
      questions.push({
        id: String(current.num || questionCounter),
        num: current.num || questionCounter,
        question: current.question.trim(),
        options: current.options,
        answer: current.answer.toUpperCase(),
      })
      questionCounter++
    }
  }

  const isOptionLine = (line: string) => {
    return optionRegexes.some(regex => regex.test(line))
  }

  const isAnswerLine = (line: string) => {
    return answerRegexes.some(regex => regex.test(line))
  }

  const isQuestionStart = (line: string) => {
    return questionStartRegexes.some(regex => regex.test(line))
  }

  const extractOption = (line: string) => {
    for (const regex of optionRegexes) {
      const match = line.match(regex)
      if (match) {
        return {
          letter: match[1].toUpperCase(),
          text: match[2].trim()
        }
      }
    }
    return null
  }

  const extractAnswer = (line: string) => {
    for (const regex of answerRegexes) {
      const match = line.match(regex)
      if (match) {
        return match[1].toUpperCase()
      }
    }
    return null
  }

  const extractQuestionStart = (line: string) => {
    for (const regex of questionStartRegexes) {
      const match = line.match(regex)
      if (match) {
        return {
          num: parseInt(match[1], 10),
          text: match[2].trim()
        }
      }
    }
    return null
  }

  for (const line of lines) {
    const questionStart = extractQuestionStart(line)
    const option = extractOption(line)
    const answer = extractAnswer(line)

    if (questionStart) {
      saveCurrentQuestion()
      current = {
        num: questionStart.num,
        question: questionStart.text,
        options: {},
        answer: '',
      }
      questionLines = [questionStart.text]
    } else if (current && option) {
      current.options = current.options || {}
      current.options[option.letter] = option.text
    } else if (current && answer) {
      current.answer = answer
    } else if (current && !isOptionLine(line) && !isAnswerLine(line)) {
      const hasOptions = current.options && Object.keys(current.options).length > 0
      if (!hasOptions) {
        // Check if this might be a new question without numbering
        if (!current.question && line.length > 10 && !isOptionLine(line) && !isAnswerLine(line)) {
          current.question = line
          questionLines = [line]
        } else if (current.question) {
          // Continue the current question text
          current.question = (current.question || '') + ' ' + line
          questionLines.push(line)
        }
      }
    } else if (!current && line.length > 10 && !isOptionLine(line) && !isAnswerLine(line)) {
      // Start a new question without explicit numbering
      current = {
        question: line,
        options: {},
        answer: '',
      }
      questionLines = [line]
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