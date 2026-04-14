# Cloudinary Setup Guide

## 1. Create Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. Create a new cloud (or use your existing one)

## 2. Get Your Credentials

From your Cloudinary dashboard, you'll need:
- **Cloudinary URL**: `cloudinary://<your_api_key>:<your_api_secret>@divtweyoo`

## 3. Create Upload Preset

1. Go to Settings → Upload
2. Click "Add upload preset"
3. Name: `moutnrushmoreunit`
4. Settings:
   - Signing mode: Unsigned
   - Allowed formats: jpg, jpeg, png, pdf, doc, docx
   - Max file size: 5MB
   - Folder: `mru-roadmap` (optional)
5. Save preset

## 4. Environment Variables

Create a `.env.local` file in your project root:

```env
run devNEXT_PUBLIC_CLOUDINARY_URL=cloudinary://697576995163947:rLKqLdhIzttgZd-jemz02YCHpP0@divtweyoo
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=moutnrushmoreunit
```

## 5. Update Configuration

The configuration is already updated in `src/lib/cloudinary.ts`:

```typescript
const CLOUDINARY_URL = process.env.NEXT_PUBLIC_CLOUDINARY_URL || 'cloudinary://697576995163947:rLKqLdhIzttgZd-jemz02YCHpP0@divtweyoo'

// Parse cloud name from URL
const CLOUDINARY_CLOUD_NAME = CLOUDINARY_URL.split('@')[1] || 'divtweyoo'
const CLOUDINARY_API_KEY = CLOUDINARY_URL.split('@')[0]?.replace('cloudinary://', '') || ''
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'moutnrushmoreunit'
```

## 6. Test Upload

1. Restart your development server
2. Go to `/auth` and try registering with a profile picture
3. Check if the image uploads successfully to Cloudinary

## Security Notes

- The current setup uses unsigned upload preset for simplicity
- For production, consider using signed uploads with server-side signature generation
- Never expose your API Secret in client-side code
- Consider implementing additional file validation on the server side

## Features Implemented

✅ **Profile Picture Upload** - Registration and profile pages
✅ **Multiple Document Upload** - Level 1 requirements (10 max, 3 min)
✅ **Cloud Storage** - All files stored in Cloudinary
✅ **URL Storage** - Only URLs saved in Firestore
✅ **File Validation** - Type and size checking
✅ **Progress Tracking** - Document upload requirements
