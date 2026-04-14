import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { publicId, resourceType } = await request.json()

    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId' }, { status: 400 })
    }

    const cloudinary = require('cloudinary').v2
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    console.log('Deleting from Cloudinary:', { publicId, resourceType })

    // Try the given resourceType first, then fallback to others
    const typesToTry = [resourceType, 'image', 'raw', 'video'].filter(Boolean)
    const seen = new Set()

    for (const type of typesToTry) {
      if (seen.has(type)) continue
      seen.add(type)

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: type,
      })

      console.log(`Tried [${type}]:`, result)

      if (result.result === 'ok' || result.result === 'not found') {
        return NextResponse.json({ success: true, result: result.result })
      }
    }

    return NextResponse.json({ success: false, error: 'Could not delete from Cloudinary' }, { status: 500 })

  } catch (error: any) {
    console.error('Cloudinary delete error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}