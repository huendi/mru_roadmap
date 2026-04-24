import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()

  const correctPin = process.env.ADMIN_PIN

  if (pin === correctPin) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, message: 'Invalid PIN' })
}