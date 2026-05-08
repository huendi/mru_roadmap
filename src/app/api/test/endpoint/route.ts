// Simple test endpoint to verify API is working
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  console.log('🧪 Test endpoint called successfully')
  return NextResponse.json({ 
    success: true, 
    message: 'API endpoint is working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('🧪 Test POST received:', body)
    return NextResponse.json({ 
      success: true, 
      message: 'POST endpoint working',
      received: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test POST error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
