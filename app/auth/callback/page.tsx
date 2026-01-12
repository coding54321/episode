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

    const handleCallback = async () => {
      const next = searchParams.get('next') || '/mindmaps'

      try {
        // Supabase가 URL에서 자동으로 세션을 처리하도록 대기
        // onAuthStateChange 이벤트를 활용하여 더 안정적으로 처리
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return

            if (event === 'SIGNED_IN' && session?.user) {
              console.log('[AuthCallback] Login successful:', session.user.id)
              
              // 약간의 지연 후 리다이렉트 (세션 저장 완료 대기)
              setTimeout(() => {
                if (isMounted) {
                  router.replace(next)
                }
              }, 100)
            } else if (event === 'SIGNED_OUT') {
              console.log('[AuthCallback] User signed out')
              if (isMounted) {
                router.replace('/login?error=session_failed')
              }
            }
          }
        )

        // 최대 10초 대기 후 타임아웃
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error('[AuthCallback] Timeout waiting for session')
            router.replace('/login?error=session_timeout')
          }
        }, 10000)

        // 세션 확인 (즉시 체크)
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[AuthCallback] Session check error:', error)
          if (isMounted) {
            router.replace('/login?error=callback_failed')
          }
          subscription.unsubscribe()
          return
        }

        if (session?.user) {
          console.log('[AuthCallback] Session found immediately:', session.user.id)
          clearTimeout(timeoutId)
          subscription.unsubscribe()
          
          // 약간의 지연 후 리다이렉트
          setTimeout(() => {
            if (isMounted) {
              router.replace(next)
            }
          }, 100)
        } else {
          // 세션이 없으면 onAuthStateChange 이벤트를 기다림
          // 이벤트가 발생하지 않으면 타임아웃으로 처리됨
        }

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('[AuthCallback] Callback processing error:', error)
        if (isMounted) {
          router.replace('/login?error=processing_failed')
        }
      }
    }

    // 약간의 지연 후 콜백 처리 시작 (Supabase 자동 처리 대기)
    const initTimeout = setTimeout(handleCallback, 300)

    return () => {
      isMounted = false
      clearTimeout(initTimeout)
      clearTimeout(timeoutId)
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
