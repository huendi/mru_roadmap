# Google Sign-In Setup Guide

This guide explains how to set up Google Sign-In for your MRU Roadmap application.

## Firebase Console Setup

1. **Enable Google Sign-In Provider**
   - Go to Firebase Console → Authentication → Sign-in method
   - Click on "Google" 
   - Enable the toggle switch
   - Add your authorized domains (e.g., localhost:3000, yourdomain.com)
   - Save your configuration

2. **OAuth Consent Screen**
   - Go to Google Cloud Console → APIs & Services → OAuth consent screen
   - Configure the consent screen with:
     - App name: "MRU Roadmap - Financial Advisor Program"
     - User support email: support@mru.sunlife.ph
     - Developer contact information
   - Add required scopes for email and profile
   - Verify your app if needed

## Application Flow

### 1. User Authentication
- Users click "Continue with Google" button
- Google OAuth popup opens
- User authenticates with Google account
- Firebase returns user data

### 2. User Creation/Retrieval
- System checks if user exists in Firestore by UID
- If not exists, creates new user with:
  - uid, name, email, profile picture
  - role: "user" (except for admin emails)
  - status: "pending" (except for admin emails)
  - currentLevel: 1

### 3. Status-Based Routing
- **pending** → `/waiting-for-approval` page
- **approved** → `/dashboard` (full access)
- **rejected** → Error message
- **admin** → `/admin` (admin dashboard)

### 4. Admin Approval
- Admins access `/admin` page
- View all users with their status
- Approve/reject user accounts
- Users get immediate access upon approval

## Admin Emails
Admin accounts are automatically created for these emails:
- minda@wendu_dadev.com

To add more admin emails, update `ADMIN_EMAILS` in `/src/lib/auth.ts`:
```typescript
const ADMIN_EMAILS = ['minda_wendu@dadev.com']
```

## Security Notes
- Admin accounts have immediate access (no approval needed)
- Regular users require admin approval
- User status is checked on every protected route
- Firebase handles OAuth security

## Testing
1. Test with a regular Gmail account (should go to pending)
2. Test with admin email (should go to dashboard)
3. Test admin approval workflow
4. Test rejection handling

## Troubleshooting
- **Popup blocked**: Enable popups for your domain
- **OAuth error**: Check Firebase console configuration
- **No redirect**: Check user status logic in components
- **Admin not working**: Verify admin email in code
