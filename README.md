# MRU Roadmap - Financial Advisor Training Platform

A comprehensive platform for tracking progress to become a certified financial advisor.

## Features

- **Public Landing Page**: Accessible without login
- **User Authentication**: Firebase email/password authentication
- **Level System**: 7-level progression system with unlock logic
- **Dashboard**: Track current level, requirements, and progress
- **Mock Exams**: Multiple-choice questions with auto-scoring
- **Progress Tracking**: Store user data in Firestore

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Firebase (Authentication + Firestore)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password) and Firestore Database
3. Get your Firebase configuration values

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Update `.env.local` with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Level Structure

### Level 1 – Registration & Orientation
- User registration with email/password
- Complete basic profile
- Read introduction about Financial Advisor journey

### Level 2 – Requirements Submission
- Upload/mark checklist of requirements (IDs, forms, etc.)
- Minimum 3 requirements required to unlock next level

### Level 3 – Mock Exam (Level 1)
- Multiple-choice exam
- 80% passing score required
- Auto-save results in Firestore

### Levels 4-6 – Coming Soon
- Reserved for future content

### Level 7 – Final Assessment & Certification
- Final exam or task
- Certification upon completion

## Project Structure

```
src/
├── app/
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # User dashboard
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Landing page
├── lib/
│   └── firebase.ts     # Firebase configuration
└── types/
    └── index.ts        # TypeScript type definitions
```

## Deployment

Deploy to Vercel:

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
