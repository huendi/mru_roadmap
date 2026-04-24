import { Level, Requirement, Exam, ExamQuestion } from '@/types'

export const LEVELS_DATA: Level[] = [
  {
    id: 1,
    title: 'Basic Requirements',
    description: 'Submit all required documents to get started',
    requirements: ['Read introduction', 'Upload documents'],
    isUnlocked: true,
    isCompleted: false,
  },
  {
    id: 2,
    title: 'Sun Life Training Course',
    description: 'Complete SLTC and upload your certificate',
    requirements: ['Upload SLTC Certificate'],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 3,
    title: 'Review for IC/IIAP Exam',
    description: 'Study the reviewers for your chosen exam type',
    requirements: ['Complete reviewer materials'],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 4,
    title: 'Mock Exam',
    description: 'Take all 4 mock exams with passing grade',
    requirements: ['Pass mock exams'],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 5,
    title: 'Pay & Take Licensure Exam',
    description: 'Schedule and take your IC or IIAP licensure exam',
    requirements: [],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 6,
    title: 'Submit CA Forms & Requirements',
    description: 'Submit CA forms, licensing fee, rookie training, and caddying',
    requirements: [],
    isUnlocked: false,
    isCompleted: false,
  },
  {
    id: 7,
    title: 'Contract Signing & Coding',
    description: 'Complete contract signing and coding process',
    requirements: [],
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
      description: 'Upload all 7 required documents',
      type: 'file',
      isCompleted: false,
    },
  ],
  2: [
    {
      id: 'sltc_certificate',
      title: 'Upload SLTC Certificate',
      description: 'Upload proof of completing Sun Life Training Course',
      type: 'file',
      isCompleted: false,
    },
  ],
  3: [
    {
      id: 'watched_video_1',
      title: 'Review Video 1',
      description: 'Watch review video 1',
      type: 'checkbox',
      isCompleted: false,
    },
    {
      id: 'watched_video_2',
      title: 'Review Video 2',
      description: 'Watch review video 2',
      type: 'checkbox',
      isCompleted: false,
    },
    {
      id: 'watched_video_3',
      title: 'Review Video 3',
      description: 'Watch review video 3',
      type: 'checkbox',
      isCompleted: false,
    },
  ],
  4: [
    {
      id: 'mock_exam_1',
      title: 'Mock Exam 1',
      description: 'Pass with required grade',
      type: 'checkbox',
      isCompleted: false,
    },
    {
      id: 'mock_exam_2',
      title: 'Mock Exam 2',
      description: 'Pass with required grade',
      type: 'checkbox',
      isCompleted: false,
    },
    {
      id: 'mock_exam_3',
      title: 'Mock Exam 3',
      description: 'Pass with required grade',
      type: 'checkbox',
      isCompleted: false,
    },
    {
      id: 'mock_exam_4',
      title: 'Mock Exam 4',
      description: 'Pass with required grade',
      type: 'checkbox',
      isCompleted: false,
    },
  ],
  5: [],
  6: [],
  7: [],
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
  level1DocCount?: number,
  advisorType?: 'new' | 'returnee',
  minDocsToPass?: number
): number => {
  if (currentLevel >= 7) return 7

  const requirements = completedRequirements || []
  const docCount = level1DocCount ?? 0

  // ✅ If the user's DB level is already ≥ 2, they already passed Level 1.
  // Don't re-gate them on intro/docs — trust currentLevel as a floor.
  const level1AlreadyPassed = currentLevel >= 2
  const introRead = requirements.includes('read_intro')
  const minPass = minDocsToPass ?? 4
  const level1Unlocked = level1AlreadyPassed || (introRead && docCount >= minPass)

  if (!level1Unlocked) return 1

  // ✅ Returnee advisor special progression: skip 3, 4, 5 and go directly to 6
  if (advisorType === 'returnee') {
    const level2Req = LEVEL_REQUIREMENTS[2] || []
    const level2Completed = level2Req.every(req => requirements.includes(req.id))
    
    if (currentLevel === 2 && level2Completed) {
      return 6 // Jump directly to level 6
    }
    // Don't auto-unlock level 7 - level 6 needs to be completed first
    if (currentLevel >= 6) {
      return currentLevel
    }
    return currentLevel
  }

  // ✅ Return at least currentLevel — never downgrade what DB already granted
  const floor = Math.max(1, currentLevel)

  // Validate the chain from level 2 up to currentLevel to find where they're blocked
  for (let lvl = 2; lvl <= currentLevel; lvl++) {
    const lvlReqs = LEVEL_REQUIREMENTS[lvl] || []
    // ✅ Skip empty-requirement levels (5, 6, 7) — they're never "blocked"
    if (lvlReqs.length === 0) continue
    const allCompleted = lvlReqs.every(req => requirements.includes(req.id))
    if (!allCompleted) return Math.max(floor, lvl)
  }

  if (currentLevel < 7) return currentLevel + 1
  return currentLevel
}

// NEW — tells dashboard which levels are accessible for returnee FA
export const getUnlockedLevels = (
  currentLevel: number,
  completedRequirements: string[],
  level1DocCount: number,
  advisorType?: 'new' | 'returnee'
): number[] => {
  const RETURNEE_SKIP = [3, 4, 5]
  const allLevels = [1, 2, 3, 4, 5, 6, 7]
  const maxUnlocked = getNextUnlockedLevel(currentLevel, completedRequirements, level1DocCount, advisorType)

  return allLevels.filter(id => {
    if (advisorType === 'returnee' && RETURNEE_SKIP.includes(id)) return false
    return id <= maxUnlocked
  })
}

export const getLevelProgress = (levelId: number, completedRequirements: string[]): number => {
  const requirements = LEVEL_REQUIREMENTS[levelId] || []
  
  // For levels 5, 6, and 7, show 0% progress until they're properly implemented
  if (requirements.length === 0 && (levelId === 5 || levelId === 6 || levelId === 7)) return 0
  if (requirements.length === 0) return 100
  
  // Ensure completedRequirements is an array
  const reqs = completedRequirements || []
  
  const completedCount = requirements.filter(req => 
    reqs.includes(req.id)
  ).length
  
  return Math.round((completedCount / requirements.length) * 100)
}
