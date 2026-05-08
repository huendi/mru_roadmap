# Exam Set Loading Issue - Fix Required

## Problem Identified
The exam sets (1, 2, 3, 4, etc.) in Level 4 are failing to load questions because the Firebase Admin SDK is not properly configured.

## Root Cause
The `.env.local` file is missing the required Firebase Admin SDK environment variables. Without these, the API endpoints cannot connect to Firestore to fetch:
- Exam type configurations
- Question banks
- User exam records

## Solution Steps

### 1. Get Firebase Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `mount-rushmore-unit-85e78`
3. Click Settings (gear icon) -> Project settings
4. Go to Service accounts tab
5. Click "Generate new private key"
6. Select JSON format and download

### 2. Create .env.local File
Create a `.env.local` file in the project root with the following content (replace with your actual values):

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=mount-rushmore-unit-85e78
FIREBASE_CLIENT_EMAIL=your-service-account-email@mount-rushmore-unit-85e78.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important:** 
- Copy the exact values from your downloaded JSON file
- Keep the `\n` characters for line breaks in the private key
- Wrap the entire private key in quotes
- Never commit this file to version control

### 3. Restart Development Server
After creating the `.env.local` file, restart your Next.js development server:
```bash
npm run dev
```

## What This Fixes
After proper configuration, the following will work:
- Exam set questions will load correctly when clicking "Start Set 1", "Start Set 2", etc.
- Exam configurations will be retrieved from Firebase
- User exam progress will be saved and loaded properly
- All Level 4 exam functionality will work as expected

## Verification
To verify the fix works:
1. Navigate to `/level/4`
2. Select your exam category and delivery modes
3. Click on any exam set (Set 1, Set 2, etc.)
4. The questions should load and display properly

## Technical Details
The API endpoints that require Firebase Admin SDK:
- `/api/level4/config` - Loads exam configuration
- `/api/level4/questions` - Loads questions for specific exam sets
- `/api/user/level4-exam-types` - Loads available exam types for user
- `/api/user/level4-exams` - Saves exam results

Without proper Firebase Admin SDK configuration, these endpoints return 404 or 500 errors, causing the exam loading failure.
