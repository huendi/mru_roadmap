import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const name = req.nextUrl.searchParams.get('name') || 'document'

  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}