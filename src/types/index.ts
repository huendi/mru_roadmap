import { Timestamp } from 'firebase/firestore'

export interface User {
  advisorType?: 'new' | 'returnee'
  uid: string
  email: string
  displayName?: string
  name?: string // Combined full name (auto-generated: firstName + middleName + lastName)
  firstName?: string
  middleName?: string // Optional
  lastName?: string
  contact?: string
  birthday?: string
  birthplace?: string
  // Split address fields
  houseStreet?: string   // Optional
  barangay?: string
  municipalityCity?: string
  province?: string      // Empty string for NCR (no province)
  region?: string        // e.g. "National Capital Region", "Region V (Bicol Region)"
  zipCode?: string
  address?: string // Keep for backward compatibility
  gender?: 'male' | 'female' | 'other' | null
  civilStatus?: string
  educationalAttainment?: string
  currentJob?: string
  profileImage?: string
  role?: 'user' | 'admin'
  status?: 'pending' | 'active' | 'disabled' | 'approved' | 'rejected' | 'frozen'
  deleteReason?: string
  photoURL?: string // Keep for backward compatibility
  hasPassword?: boolean // Track if user has password set
  currentLevel: number
  requirementsCompleted: string[]
  examScores: ExamScore[]
  profileCompleted: boolean
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}

export interface ExamScore {
  level: number
  score: number
  totalQuestions: number
  passed: boolean
  date: Date
}

export interface Level {
  id: number
  title: string
  description: string
  requirements: string[]
  isUnlocked: boolean
  isCompleted: boolean
  progress?: number
}

export interface Requirement {
  id: string
  title: string
  description: string
  type: 'checkbox' | 'file' | 'text'
  isCompleted: boolean
  value?: string
  fileName?: string
}

export interface ExamQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

export interface Level4ExamAttempt {
  id: string
  examId: string
  setNumber?: number
  score: number
  correctAnswers: number
  totalQuestions: number
  passed: boolean
  dateTaken: string
  bankVersion?: string
  durationMinutes?: number | null
}

export interface Exam {
  id: string
  level: number
  title: string
  questions: ExamQuestion[]
  passingScore: number
  timeLimit?: number
}

export interface AdminLog {
  id: string
  actorName: string        // Admin Name who performed the action
  targetUserName: string   // User Name who was affected
  activity: string         // What was done (Account Approval Request, Level 2 Certificate Request, etc.)
  action: string           // Outcome (Approved, Rejected, Passed, Failed, Deleted, Disabled)
  timestamp: Date          // When it happened
  targetUserEmail?: string // Optional: target user's email for reference
}

// Extended user types for admin approval pages
export interface UserWithCertDoc extends User {
  certDoc?: {
    url?: string
    fileName?: string
    status?: 'pending' | 'approved' | 'rejected'
    type?: string
    level?: number
    uploadedAt?: string | Date
    approvedAt?: string
    rejectedAt?: string
    rejectionReason?: string
  }
}

export interface UserWithExamSubmission extends User {
  examSubmission?: {
    examType?: 'ic' | 'iiap'
    iiapMode?: 'face-to-face' | 'online'
    icMode?: string
    scheduleId?: string
    scheduleDate?: string | Date
    receiptUrl?: string
    receiptFileName?: string
    currentStep?: number
    adminDecision?: 'passed' | 'failed' | 'pending'
    status?: 'passed' | 'failed' | 'pending'  // Alternative status field
    adminNotes?: string
    submittedAt?: string | Date
    reviewedAt?: string
    selectedExams?: string[]  // Array of selected exam names
  }
}