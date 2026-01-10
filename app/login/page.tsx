'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { userStorage, mindMapProjectStorage } from '@/lib/storage';
import { User } from '@/types';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser, mapSupabaseUserToAppUser } from '@/lib/supabase/auth';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase Auth 세션 확인
    const checkAuth = async () => {
      try {
        // 이미 로그인된 사용자는 리다이렉트
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }
        
        if (session?.user) {
          console.log('Session found, user:', session.user.id);
          // Supabase Auth에 세션이 있으면 사용자 정보 가져오기
          const user = await getCurrentUser();
          if (user) {
            console.log('User loaded:', user.name);
            // localStorage에도 저장 (기존 코드와의 호환성)
            await userStorage.save(user);
            
            const returnUrl = searchParams.get('returnUrl');
            if (returnUrl) {
              router.replace(returnUrl);
              return;
            }
            
            const projects = await mindMapProjectStorage.load();
            if (projects.length > 0) {
              router.replace('/mindmaps');
            } else {
              router.replace('/badge-selection');
            }
            return;
          }
        }
        
        // localStorage에만 있는 경우도 확인 (기존 사용자)
        const localUser = await userStorage.load();
        if (localUser) {
          const returnUrl = searchParams.get('returnUrl');
          if (returnUrl) {
            router.replace(returnUrl);
            return;
          }
          
          const projects = await mindMapProjectStorage.load();
          if (projects.length > 0) {
            router.replace('/mindmaps');
          } else {
            router.replace('/badge-selection');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };

    checkAuth();

    // URL에서 에러 파라미터 확인
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
    }
  }, [router, searchParams]);

  const handleLogin = async (provider: 'kakao') => {
    setIsLoading(true);

    try {
      const returnUrl = searchParams.get('returnUrl') || '/mindmaps';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`;

      // Supabase Auth를 통한 OAuth 로그인
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectTo,
          // Kakao의 경우 queryParams를 통해 scope를 명시적으로 지정
          // account_email과 profile_image를 제외하고 profile_nickname만 요청
          ...(provider === 'kakao' ? {
            queryParams: {
              scope: 'profile_nickname', // 닉네임만 요청, account_email과 profile_image 제외
            },
          } : {}),
        },
      });

      if (error) {
        console.error('Login failed:', error);
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
        setIsLoading(false);
      }
      // 성공 시 자동으로 OAuth 페이지로 리다이렉트되므로 여기서는 아무것도 하지 않음
    } catch (error) {
      console.error('Login failed:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="safe-area-top bg-white" />
      <div className="flex-1 bg-white px-5 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 mb-8"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                안녕하세요!
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Episode와 함께
                <br />경험을 체계적으로 정리해보세요
              </p>
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error === 'code_expired' 
                    ? '인증 코드가 만료되었습니다. 다시 로그인해주세요.'
                    : error === 'server_error'
                    ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
                    : error === 'session_failed'
                    ? '세션 생성에 실패했습니다. 다시 로그인해주세요.'
                    : '로그인에 실패했습니다. 다시 시도해주세요.'}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleLogin('kakao')}
                disabled={isLoading}
                className="w-full h-[56px] bg-[#fee500] hover:bg-[#fdd835] text-[#3c1e1e] font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 ease-out"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[#3c1e1e] border-t-transparent rounded-full animate-spin mr-3" />
                    로그인하는 중...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 mr-3">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
                      </svg>
                    </div>
                    카카오로 계속하기
                  </div>
                )}
              </Button>

            </div>

            <p className="text-sm text-gray-500 text-center mt-8 leading-relaxed px-4">
              로그인하면 개인정보 처리방침 및 이용약관에 동의하게 됩니다
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

