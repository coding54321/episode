'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { userStorage, mindMapProjectStorage } from '@/lib/storage';
import { User } from '@/types';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 이미 로그인된 사용자는 마인드맵 목록으로 리다이렉트
    const user = userStorage.load();
    if (user) {
      const projects = mindMapProjectStorage.load();
      
      if (projects.length > 0) {
        router.push('/mindmaps');
      } else {
        router.push('/badge-selection');
      }
    }
  }, [router]);

  const handleLogin = async (provider: 'kakao' | 'google') => {
    setIsLoading(true);

    // 실제 인증 플로우를 시뮬레이션
    try {
      // 로딩 시간을 늘려서 실제 인증하는 느낌을 줌
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockUser: User = {
        id: `user_${Date.now()}`,
        name: provider === 'kakao' ? '카카오 사용자' : '구글 사용자',
        email: provider === 'kakao' ? 'kakao@example.com' : 'google@example.com',
        provider,
        createdAt: Date.now(),
      };

      userStorage.save(mockUser);

      // 마인드맵 프로젝트가 있는지 체크
      const { mindMapProjectStorage } = await import('@/lib/storage');
      const projects = mindMapProjectStorage.load();
      
      if (projects.length > 0) {
        router.push('/mindmaps');
      } else {
        router.push('/badge-selection');
      }
    } catch (error) {
      console.error('Login failed:', error);
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

              <Button
                onClick={() => handleLogin('google')}
                disabled={isLoading}
                variant="outline"
                className="w-full h-[56px] bg-white border-[1.5px] border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 ease-out"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-3" />
                    로그인하는 중...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 mr-3">
                      <svg viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    Google로 계속하기
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

