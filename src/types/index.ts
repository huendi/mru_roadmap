export interface User {
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
  province?: string
  zipCode?: string
  address?: string // Keep for backward compatibility
  gender?: 'male' | 'female' | 'other' | null
  civilStatus?: string
  educationalAttainment?: string
  currentJob?: string
  profileImage?: string
  role?: 'user' | 'admin'
  status?: 'pending' | 'active' | 'disabled' | 'approved' | 'rejected'
  photoURL?: string // Keep for backward compatibility
  hasPassword?: boolean // Track if user has password set
  currentLevel: number
  requirementsCompleted: string[]
  examScores: ExamScore[]
  profileCompleted: boolean
  createdAt: Date
  updatedAt: Date
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

export interface Exam {
  id: string
  level: number
  title: string
  questions: ExamQuestion[]
  passingScore: number
  timeLimit?: number
}