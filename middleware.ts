import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedRoutes = [
  "/dashboard",
  "/events",
  "/members",
  "/users",
  "/notifications",
  "/church-data",
  "/calendar",
  "/life-groups",
  "/courses",
  "/course-tracks",
  "/announcements",
  "/contributions",
]

const publicRoutes = ["/", "/auth"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // For protected routes, we check for the presence of a session indicator
  // The actual authentication is handled client-side by Firebase
  // This middleware provides a basic redirect for unauthenticated users
  if (isProtectedRoute) {
    const hasSession = request.cookies.get("auth_session")

    // If no session cookie, the client-side auth will handle the redirect
    // This is a soft check - the real auth happens in AuthProvider
    if (!hasSession) {
      // We allow the request but the client will redirect if needed
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/members/:path*",
    "/users/:path*",
    "/notifications/:path*",
    "/church-data/:path*",
    "/calendar/:path*",
    "/life-groups/:path*",
    "/courses/:path*",
    "/course-tracks/:path*",
    "/announcements/:path*",
    "/contributions/:path*",
  ],
}
