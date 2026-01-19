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
    let retryCount = 0
    const MAX_RETRIES = 3
    const RETRY_DELAY = 2000 // 2초

    const handleCallback = async () => {
      const next = searchParams.get('next') || '/mindmaps'
      let sessionFound = false

      try {
        // Supabase가 URL에서 자동으로 세션을 처리하도록 대기
        // onAuthStateChange 이벤트를 활용하여 더 안정적으로 처리
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted || sessionFound) return

            if (event === 'SIGNED_IN' && session?.user) {
              console.log('[AuthCallback] Login successful:', session.user.id)
              sessionFound = true
              clearTimeout(timeoutId)
              
              // 세션이 localStorage에 저장될 때까지 충분히 대기 (배포 환경 대응)
              setTimeout(async () => {
                if (isMounted) {
                  // 온보딩 완료 여부 확인
                  const { data: userData } = await supabase
                    .from('users')
                    .select('onboarding_completed')
                    .eq('id' as any, session.user.id as any)
                    .maybeSingle()
                  
                  const onboardingCompleted = userData?.onboarding_completed ?? false
                  
                  if (!onboardingCompleted) {
                    // 온보딩 미완료 시 온보딩 시작
                    router.replace('/onboarding/intro')
                  } else {
                    // 온보딩 완료 시 기존 로직대로 이동
                    router.replace(next)
                  }
                }
              }, 500) // 100ms → 500ms로 증가
            } else if (event === 'SIGNED_OUT') {
              console.log('[AuthCallback] User signed out')
              if (isMounted) {
                router.replace('/login?error=session_failed')
              }
            }
          }
        )
        subscription = authSubscription

        // 최대 30초 대기 후 타임아웃 (10초 → 30초로 증가)
        timeoutId = setTimeout(() => {
          if (isMounted && !sessionFound) {
            console.error('[AuthCallback] Timeout waiting for session')
            // 재시도 로직
            if (retryCount < MAX_RETRIES) {
              retryCount++
              console.log(`[AuthCallback] Retrying session check (${retryCount}/${MAX_RETRIES})`)
              setTimeout(() => {
                if (isMounted) {
                  checkSessionWithRetry()
                }
              }, RETRY_DELAY)
            } else {
              router.replace('/login?error=session_timeout')
            }
          }
        }, 30000) // 10초 → 30초로 증가

        // 세션 확인 함수 (재시도 로직 포함)
        const checkSessionWithRetry = async () => {
          try {
            // 세션 확인 (즉시 체크)
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
              console.error('[AuthCallback] Session check error:', error)
              // 재시도 가능한 에러인 경우 재시도
              if (retryCount < MAX_RETRIES && !error.message?.includes('Invalid')) {
                retryCount++
                console.log(`[AuthCallback] Retrying after error (${retryCount}/${MAX_RETRIES})`)
                setTimeout(() => {
                  if (isMounted && !sessionFound) {
                    checkSessionWithRetry()
                  }
                }, RETRY_DELAY)
                return
              }
              
              if (isMounted && !sessionFound) {
                router.replace('/login?error=callback_failed')
              }
              if (subscription) {
                subscription.unsubscribe()
              }
              return
            }

            if (session?.user) {
              console.log('[AuthCallback] Session found:', session.user.id)
              sessionFound = true
              clearTimeout(timeoutId)
              if (subscription) {
                subscription.unsubscribe()
              }
              
              // 세션이 localStorage에 저장될 때까지 충분히 대기
              setTimeout(async () => {
                if (isMounted) {
                  // 온보딩 완료 여부 확인
                  const { data: userData } = await supabase
                    .from('users')
                    .select('onboarding_completed')
                    .eq('id' as any, session.user.id as any)
                    .maybeSingle()
                  
                  const onboardingCompleted = userData?.onboarding_completed ?? false
                  
                  if (!onboardingCompleted) {
                    // 온보딩 미완료 시 온보딩 시작
                    router.replace('/onboarding/intro')
                  } else {
                    // 온보딩 완료 시 기존 로직대로 이동
                    router.replace(next)
                  }
                }
              }, 500) // 100ms → 500ms로 증가
            } else {
              // 세션이 없으면 onAuthStateChange 이벤트를 기다림
              // 이벤트가 발생하지 않으면 타임아웃으로 처리됨
              console.log('[AuthCallback] No session found, waiting for onAuthStateChange event...')
            }
          } catch (error) {
            console.error('[AuthCallback] Session check exception:', error)
            // 재시도 가능한 경우 재시도
            if (retryCount < MAX_RETRIES && isMounted && !sessionFound) {
              retryCount++
              console.log(`[AuthCallback] Retrying after exception (${retryCount}/${MAX_RETRIES})`)
              setTimeout(() => {
                if (isMounted && !sessionFound) {
                  checkSessionWithRetry()
                }
              }, RETRY_DELAY)
            } else if (isMounted && !sessionFound) {
              router.replace('/login?error=processing_failed')
            }
          }
        }

        // 초기 세션 확인
        await checkSessionWithRetry()

      } catch (error) {
        console.error('[AuthCallback] Callback processing error:', error)
        if (isMounted && !sessionFound) {
          // 재시도 가능한 경우 재시도
          if (retryCount < MAX_RETRIES) {
            retryCount++
            console.log(`[AuthCallback] Retrying after processing error (${retryCount}/${MAX_RETRIES})`)
            setTimeout(() => {
              if (isMounted && !sessionFound) {
                handleCallback()
              }
            }, RETRY_DELAY)
          } else {
            router.replace('/login?error=processing_failed')
          }
        }
      }
    }

    // 약간의 지연 후 콜백 처리 시작 (Supabase 자동 처리 대기)
    const initTimeout = setTimeout(handleCallback, 300)

    return () => {
      isMounted = false
      clearTimeout(initTimeout)
      clearTimeout(timeoutId)
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
