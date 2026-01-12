import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// 보호된 라우트 정의
const protectedRoutes = [
  '/mindmaps',
  '/mindmap',
  '/gap-diagnosis',
  '/archive',
  '/badge-selection'
]

// 공유 라우트 패턴 (인증 불필요)
const shareRoutePattern = /^\/share\/[^/]+$/

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // 공유 페이지는 인증 체크 제외
  if (shareRoutePattern.test(pathname)) {
    return NextResponse.next()
  }

  // 정적 파일, API 라우트, 인증 콜백은 처리하지 않음
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  // 보호된 라우트에 대해서만 세션 검증
  // 참고: Supabase는 기본적으로 localStorage를 사용하므로 Middleware에서 쿠키 기반 검증은 제한적입니다.
  // 클라이언트 사이드에서 추가 검증이 필요합니다.
  if (isProtectedRoute) {
    try {
      // Supabase는 localStorage를 사용하므로 Middleware에서 직접 세션을 검증하기 어렵습니다.
      // 대신, 클라이언트에서 설정한 세션 쿠키나 헤더를 확인합니다.
      
      // 1. Authorization 헤더 확인 (API 요청의 경우)
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (supabaseUrl && supabaseAnonKey) {
          const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          })

          const { data: { user }, error } = await supabase.auth.getUser(token)
          
          if (error || !user) {
            const loginUrl = new URL('/login', req.url)
            loginUrl.searchParams.set('returnUrl', pathname)
            loginUrl.searchParams.set('error', 'session_expired')
            return NextResponse.redirect(loginUrl)
          }

          // 토큰이 유효하면 계속 진행
          return NextResponse.next()
        }
      }

      // 2. 쿠키에서 세션 정보 확인 (클라이언트에서 설정한 경우)
      // Supabase는 기본적으로 쿠키를 사용하지 않지만, 일부 설정에서는 사용할 수 있습니다.
      const sessionCookie = req.cookies.get('sb-access-token') || 
                           req.cookies.get('supabase-auth-token') ||
                           Array.from(req.cookies.getAll()).find(c => 
                             c.name.includes('sb-') && c.name.includes('auth-token')
                           )

      if (sessionCookie) {
        // 쿠키가 있으면 통과 (실제 검증은 클라이언트에서 수행)
        // 보안을 위해 클라이언트 사이드에서 추가 검증 필요
        return NextResponse.next()
      }

      // 3. 세션 정보가 없으면 로그인 페이지로 리다이렉트하지 않고 통과
      // 클라이언트 사이드에서 인증 상태를 확인하고 필요시 리다이렉트하도록 함
      // 이렇게 하면 첫 로드 시 무한 리다이렉트를 방지할 수 있습니다.
      return NextResponse.next()
    } catch (error) {
      // 에러 발생 시에도 통과 (클라이언트에서 처리)
      console.error('[Middleware] Auth check error:', error)
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}