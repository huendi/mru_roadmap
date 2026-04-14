# Firebase Admin SDK Setup Guide

To enable complete user deletion (including Firebase Authentication), you need to set up the Firebase Admin SDK.

## Step 1: Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mount-rushmore-unit-85e78`
3. Click on **Settings** (gear icon) → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Select **JSON** format
7. Click **"Create"** and download the JSON file

## Step 2: Add Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=mount-rushmore-unit-85e78
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-private-key-here\n-----END PRIVATE KEY-----\n"
```

**Important:** The private key should be copied from the downloaded JSON file. Make sure to:
- Keep the `\n` characters for line breaks
- Wrap the entire key in quotes
- Don't add extra spaces or modify the key format

## Step 3: Install Firebase Admin SDK

```bash
npm install firebase-admin
```

## Step 4: Restart Your Development Server

After adding the environment variables, restart your Next.js development server:

```bash
npm run dev
```

## Step 5: Test the Deletion

Now when you delete a user from the admin panel, it will:
1. ✅ Delete the user from Firestore (immediate)
2. ✅ Delete the user from Firebase Authentication (via Admin SDK)
3. ✅ Show appropriate success/error messages

## Troubleshooting

### Common Issues:

1. **"Firebase Admin SDK initialization error"**
   - Check that your environment variables are correctly set
   - Ensure the private key format is correct (with \n for line breaks)
   - Make sure the service account has necessary permissions

2. **"Failed to delete user from Firebase Auth"**
   - The user might not exist in Firebase Auth
   - Check the console logs for specific error messages
   - Firestore deletion will still work even if Auth deletion fails

3. **Environment variables not loading**
   - Make sure `.env.local` is in your project root
   - Restart your development server after adding variables
   - Check that the file name is exactly `.env.local` (not `.env`)

## Security Notes

- **Never commit** `.env.local` to version control
- **Keep the private key secure** - it gives admin access to your Firebase project
- **Only use in server-side code** - never expose these credentials to the browser

## Verification

After setup, you can verify the deletion works by:
1. Deleting a user from the admin panel
2. Checking the browser console for success messages
3. Verifying the user no longer appears in Firebase Authentication console
4. Confirming the user is removed from Firestore

The deletion is now complete and secure! 🎉
