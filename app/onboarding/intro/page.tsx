'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { supabase } from '@/lib/supabase/client';

export default function OnboardingIntroPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleNext = () => {
    router.push('/onboarding/job-selection');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 진행 표시기 */}
      <div className="flex justify-center items-center pt-12 pb-8">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full ${
                step === 1 ? 'bg-[#5B6EFF]' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md text-center"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
            episode는
            <br />
            마인드맵으로 당신의 경험 정리를
            <br />
            돕는 서비스입니다
          </h1>
          <p className="text-lg text-gray-600 mb-12 leading-relaxed">
            마인드맵으로 경험을 정리해보세요
          </p>

          <Button
            onClick={handleNext}
            className="w-full h-[56px] bg-[#5B6EFF] hover:bg-[#4A5EE8] text-white font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200"
          >
            다음
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
