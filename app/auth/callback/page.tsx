'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/loading-states'

/**
 * 통합 OAuth 콜백 처리 컴포넌트
 * - Supabase의 onAuthStateChange 이벤트 활용
 * - 에러 처리 개선
 * - 단일 콜백 처리 방식
 */
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout
    let subscription: { unsubscribe: () => void } | null = null
    let pollingInterval: NodeJS.Timeout | null = null
    let sessionFound = false

    const next = searchParams.get('next') || '/mindmaps'

    // 세션을 찾았을 때 리다이렉트 처리
    const handleSessionFound = async (session: any) => {
      if (!isMounted || sessionFound) return
      
      sessionFound = true
      clearTimeout(timeoutId)
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      if (subscription) {
        subscription.unsubscribe()
      }

      console.log('[AuthCallback] Session found:', session.user.id)

      try {
        // 온보딩 완료 여부 확인
        const { data: userData } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id' as any, session.user.id as any)
          .maybeSingle()
        
        const onboardingCompleted = userData?.onboarding_completed ?? false
        
        if (isMounted) {
          if (!onboardingCompleted) {
            router.replace('/onboarding/intro')
          } else {
            router.replace(next)
          }
        }
      } catch (error) {
        console.error('[AuthCallback] Error checking onboarding status:', error)
        // 온보딩 체크 실패해도 리다이렉트는 수행
        if (isMounted) {
          router.replace(next)
        }
      }
    }

    const handleCallback = async () => {
      try {
        // 1. 즉시 세션 확인 (Supabase가 URL에서 자동으로 처리했을 수 있음)
        const { data: { session: initialSession }, error: initialError } = await supabase.auth.getSession()
        
        if (initialSession?.user) {
          console.log('[AuthCallback] Initial session found immediately')
          await handleSessionFound(initialSession)
          return
        }

        // 2. onAuthStateChange 이벤트 리스너 등록 (백업)
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted || sessionFound) return

            if (event === 'SIGNED_IN' && session?.user) {
              console.log('[AuthCallback] SIGNED_IN event received')
              await handleSessionFound(session)
            } else if (event === 'SIGNED_OUT') {
              console.log('[AuthCallback] User signed out')
              if (isMounted) {
                router.replace('/login?error=session_failed')
              }
            }
          }
        )
        subscription = authSubscription

        // 3. 폴링 방식으로 세션 확인 (1초마다)
        let pollCount = 0
        const MAX_POLLS = 15 // 최대 15초 대기
        
        pollingInterval = setInterval(async () => {
          if (!isMounted || sessionFound) {
            if (pollingInterval) {
              clearInterval(pollingInterval)
            }
            return
          }

          pollCount++
          console.log(`[AuthCallback] Polling session check (${pollCount}/${MAX_POLLS})`)

          try {
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
              console.error('[AuthCallback] Session check error:', error)
              if (pollCount >= MAX_POLLS) {
                if (pollingInterval) {
                  clearInterval(pollingInterval)
                }
                if (isMounted) {
                  router.replace('/login?error=callback_failed')
                }
              }
              return
            }

            if (session?.user) {
              console.log('[AuthCallback] Session found via polling')
              await handleSessionFound(session)
            } else if (pollCount >= MAX_POLLS) {
              // 최대 폴링 횟수 도달
              if (pollingInterval) {
                clearInterval(pollingInterval)
              }
              if (isMounted) {
                router.replace('/login?error=session_timeout')
              }
            }
          } catch (error) {
            console.error('[AuthCallback] Polling exception:', error)
            if (pollCount >= MAX_POLLS) {
              if (pollingInterval) {
                clearInterval(pollingInterval)
              }
              if (isMounted) {
                router.replace('/login?error=processing_failed')
              }
            }
          }
        }, 1000) // 1초마다 체크

        // 4. 최대 15초 타임아웃 (안전장치)
        timeoutId = setTimeout(() => {
          if (isMounted && !sessionFound) {
            console.error('[AuthCallback] Timeout waiting for session')
            if (pollingInterval) {
              clearInterval(pollingInterval)
            }
            router.replace('/login?error=session_timeout')
          }
        }, 15000)

      } catch (error) {
        console.error('[AuthCallback] Callback processing error:', error)
        if (isMounted) {
          if (subscription) {
            subscription.unsubscribe()
          }
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
          router.replace('/login?error=processing_failed')
        }
      }
    }

    // 약간의 지연 후 콜백 처리 시작 (Supabase 자동 처리 대기)
    const initTimeout = setTimeout(handleCallback, 100)

    return () => {
      isMounted = false
      clearTimeout(initTimeout)
      clearTimeout(timeoutId)
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">로그인 처리 중...</p>
        <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
      </div>
    </div>
  )
}

/**
 * 통합 OAuth 콜백 페이지
 * 모든 OAuth 제공자(카카오, 구글 등)의 콜백을 처리
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" className="text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
