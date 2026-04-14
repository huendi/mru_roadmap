import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/admin', '/level']

// Admin only routes
const adminRoutes = ['/admin']

// Public routes
const publicRoutes = ['/', '/auth', '/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  if (!isProtected) {
    return NextResponse.next()
  }

  // For API routes, let them handle auth themselves
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For protected pages, we'll check auth on the client side
  // This is a simplified middleware - the actual auth check happens in the components
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
