'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * OAuth 콜백 처리 컴포넌트
 * useSearchParams를 사용하므로 Suspense로 감싸야 함
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const next = searchParams.get('next') || '/mindmaps';
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // 에러가 있으면 로그인 페이지로 리다이렉트
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          router.replace(`/login?error=${encodeURIComponent(error)}`);
          return;
        }

        if (code) {
          console.log('Exchanging code for session...');
          
          // 인증 코드를 세션으로 교환
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Failed to exchange code for session:', exchangeError);
            // 상세한 에러 정보를 로그에 기록
            console.error('Error details:', {
              message: exchangeError.message,
              status: exchangeError.status,
              name: exchangeError.name,
            });
            
            // 에러 타입에 따라 다른 메시지 표시
            let errorMessage = 'auth_failed';
            if (exchangeError.message?.includes('expired') || exchangeError.message?.includes('invalid')) {
              errorMessage = 'code_expired';
            } else if (exchangeError.message?.includes('server_error')) {
              errorMessage = 'server_error';
            }
            
            router.replace(`/login?error=${errorMessage}`);
            return;
          }

          if (data.session?.user) {
            console.log('Session created successfully, user:', data.session.user.id);
            // 트리거가 자동으로 public.users에 사용자를 생성함
            // 트리거 실행을 위해 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 500));
            // 세션이 생성되었으므로 리다이렉트
            router.replace(next);
            return;
          } else {
            console.error('Session created but no user found');
            router.replace(`/login?error=session_failed`);
            return;
          }
        }

        // code가 없으면 이미 로그인된 상태일 수 있음
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const next = searchParams.get('next') || '/mindmaps';
          router.replace(next);
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Callback error:', error);
        router.replace('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
}

/**
 * OAuth 콜백 페이지
 * 카카오 로그인 후 리다이렉트되는 페이지
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

