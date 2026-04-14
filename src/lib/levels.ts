import { Level, Requirement, Exam, ExamQuestion } from '@/types'

export const LEVELS_DATA: Level[] = [
  {
    id: 1,
    title: 'Requirements',
    description: 'Read introduction and upload required documents',
    requirements: ['Read introduction', 'Upload documents'],
    isUnlocked: true,
    isCompleted: false,
  },
  {
    id: 2,
    title: 'Reviewer',
    description: 'Upload required documents and forms',
    requirements: ['Upload ID', 'Submit form A', 'Submit form B'],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 3,
    title: 'Mock Exam',
    description: 'Take the first mock exam',
    requirements: ['Pass mock exam with 80%'],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 4,
    title: 'Level 4 - Coming Soon',
    description: 'Additional content will be available soon',
    requirements: ['j'],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 5,
    title: 'Level 5 - Coming Soon',
    description: 'Additional content will be available soon',
    requirements: [],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 6,
    title: 'Level 6 - Coming Soon',
    description: 'Additional content will be available soon',
    requirements: [],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 7,
    title: 'Final Assessment & Certification',
    description: 'Complete final assessment and receive certification',
    requirements: ['Pass final exam'],
    isUnlocked: false,
    isCompleted: false,
  },
]

export const LEVEL_REQUIREMENTS: { [key: number]: Requirement[] } = {
  1: [
    {
      id: 'read_intro',
      title: 'Read Introduction',
      description: 'Read about the Financial Advisor journey',
      type: 'checkbox',
      isCompleted: false,
    },
    {
      id: 'documents_uploaded',
      title: 'Upload Required Documents',
      description: 'Upload at least 3 required documents',
      type: 'file',
      isCompleted: false,
    },
  ],
  2: [
    {
      id: 'upload_id',
      title: 'Upload Valid ID',
      description: 'Upload government-issued identification',
      type: 'file',
      isCompleted: false,
    },
    {
      id: 'form_a',
      title: 'Submit Form A',
      description: 'Application form for financial advising',
      type: 'file',
      isCompleted: false,
    },
    {
      id: 'form_b',
      title: 'Submit Form B',
      description: 'Background check authorization',
      type: 'file',
      isCompleted: false,
    },
  ],
  3: [
    {
      id: 'mock_exam',
      title: 'Mock Exam Level 1',
      description: 'Pass with 80% or higher',
      type: 'checkbox',
      isCompleted: false,
    },
  ],
}

export const MOCK_EXAMS: { [key: number]: Exam } = {
  3: {
    id: 'mock_exam_1',
    level: 3,
    title: 'Financial Advisor Mock Exam - Level 1',
    passingScore: 80,
    timeLimit: 30, // minutes
    questions: [
      {
        id: 'q1',
        question: 'What is the primary role of a financial advisor?',
        options: [
          'To sell financial products',
          'To help clients achieve their financial goals',
          'To manage investment portfolios only',
          'To provide tax advice exclusively'
        ],
        correctAnswer: 1,
        explanation: 'A financial advisor\'s primary role is to help clients achieve their financial goals through comprehensive financial planning.'
      },
      {
        id: 'q2',
        question: 'Which of the following is a key component of financial planning?',
        options: [
          'Only investment management',
          'Budgeting, saving, investing, and risk management',
          'Just retirement planning',
          'Only tax planning'
        ],
        correctAnswer: 1,
        explanation: 'Comprehensive financial planning includes budgeting, saving, investing, and risk management.'
      },
      {
        id: 'q3',
        question: 'What is diversification in investing?',
        options: [
          'Putting all money in one stock',
          'Spreading investments across different assets',
          'Only investing in bonds',
          'Timing the market perfectly'
        ],
        correctAnswer: 1,
        explanation: 'Diversification means spreading investments across different assets to reduce risk.'
      },
      {
        id: 'q4',
        question: 'What is the purpose of an emergency fund?',
        options: [
          'To invest in stocks',
          'To cover unexpected expenses',
          'To buy a house',
          'To fund retirement'
        ],
        correctAnswer: 1,
        explanation: 'An emergency fund is designed to cover unexpected expenses without disrupting long-term financial goals.'
      },
      {
        id: 'q5',
        question: 'Which factor most affects credit score?',
        options: [
          'Age',
          'Payment history',
          'Income level',
          'Education level'
        ],
        correctAnswer: 1,
        explanation: 'Payment history is the most significant factor affecting credit scores, typically accounting for 35% of the score.'
      }
    ],
  },
}

export const getNextUnlockedLevel = (
  currentLevel: number,
  completedRequirements: string[],
  level1DocCount?: number
): number => {
  if (currentLevel >= 7) return 7

  const requirements = completedRequirements || []
  const docCount = level1DocCount ?? 0
  const introRead = requirements.includes('read_intro')

  // Always check level 1 unlock condition first
  const level1Unlocked = introRead && docCount >= 4

  if (!level1Unlocked) return 1

  if (currentLevel <= 1) return 2 // unlocked but not yet progressed

  // Level 2+ → standard requirement check
  const currentLevelReqs = LEVEL_REQUIREMENTS[currentLevel] || []
  const allCurrentReqsCompleted = currentLevelReqs.every(req =>
    requirements.includes(req.id)
  )

  if (allCurrentReqsCompleted && currentLevel < 7) {
    return currentLevel + 1
  }

  return currentLevel
}

export const getLevelProgress = (levelId: number, completedRequirements: string[]): number => {
  const requirements = LEVEL_REQUIREMENTS[levelId] || []
  if (requirements.length === 0) return 100
  
  // Ensure completedRequirements is an array
  const reqs = completedRequirements || []
  
  const completedCount = requirements.filter(req => 
    reqs.includes(req.id)
  ).length
  
  return Math.round((completedCount / requirements.length) * 100)
}
