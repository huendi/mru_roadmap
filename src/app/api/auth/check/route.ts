import { NextResponse } from 'next/server'
import { auth } from '@/lib/firebase'
import { onAuthStateChange, isAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = auth.currentUser
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return new Promise<NextResponse>((resolve) => {
      const unsubscribe = onAuthStateChange((user) => {
        unsubscribe()
        if (user) {
          resolve(NextResponse.json({ user }))
        } else {
          resolve(NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401 }
          ))
        }
      })
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
