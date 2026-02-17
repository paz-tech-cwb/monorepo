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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isProtectedRoute) {
    const hasSession = request.cookies.get("auth_session")

    if (!hasSession) {
      // No session cookie -- redirect to login page
      const loginUrl = new URL("/", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
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
