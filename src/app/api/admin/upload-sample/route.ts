// app/api/admin/upload-sample/route.ts
// Uploads a sample image to Cloudinary and returns the URL.
// Used by Level1Panel admin settings.

import { NextRequest, NextResponse } from 'next/server'

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET ?? 'mru-roadmap'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', UPLOAD_PRESET)
    fd.append('folder', 'requirements1-samples')

    const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: fd,
    })
    const data = await res.json()

    if (!data.secure_url) {
      console.error('Cloudinary error:', data)
      return NextResponse.json({ error: 'Cloudinary upload failed.' }, { status: 500 })
    }

    return NextResponse.json({ url: data.secure_url, publicId: data.public_id })
  } catch (error) {
    console.error('upload-sample error:', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
