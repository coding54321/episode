'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Lock, Users, ChevronLeft, Check } from 'lucide-react';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';

export default function ProjectTypeSelectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth();
  const [selectedType, setSelectedType] = useState<'personal' | 'collaborative' | null>(null);

  useEffect(() => {
    // 인증 확인
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, authLoading, router]);

  const handleSelect = (type: 'personal' | 'collaborative') => {
    setSelectedType(type);
  };

  const handleNext = () => {
    if (!selectedType) return;
    router.push(`/badge-selection?projectType=${selectedType}`);
  };

  const handleBack = () => {
    router.push('/mindmaps');
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="safe-area-top bg-white" />
      <div className="flex-1 bg-white px-5 py-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 mb-8 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                어떤 마인드맵을
                <br />만들까요?
              </h1>
              <p className="text-gray-600 text-base">
                개인용 또는 공동 작업용 중 선택하세요
              </p>
            </div>

            <div className="space-y-4 mb-12">
              {/* 개인 마인드맵 */}
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleSelect('personal')}
                className={`relative w-full h-[100px] rounded-[20px] border-[2px] transition-all duration-200 ease-out ${
                  selectedType === 'personal'
                    ? 'bg-blue-50 border-blue-500 shadow-lg scale-[1.02]'
                    : 'bg-white border-gray-200 hover:border-gray-300 card-hover'
                }`}
              >
                <div className="flex flex-row items-center gap-4 h-full px-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedType === 'personal'
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}>
                    <Lock className={`w-8 h-8 ${
                      selectedType === 'personal'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 flex flex-col items-start">
                    <h3 className={`font-bold text-lg mb-1 ${
                      selectedType === 'personal'
                        ? 'text-blue-700'
                        : 'text-gray-700'
                    }`}>
                      개인 마인드맵
                    </h3>
                    <p className={`text-sm text-left ${
                      selectedType === 'personal'
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}>
                      나만 사용하는 마인드맵
                    </p>
                  </div>
                </div>
                {selectedType === 'personal' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </motion.button>

              {/* 팀 마인드맵 */}
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => handleSelect('collaborative')}
                className={`relative w-full h-[100px] rounded-[20px] border-[2px] transition-all duration-200 ease-out ${
                  selectedType === 'collaborative'
                    ? 'bg-blue-50 border-blue-500 shadow-lg scale-[1.02]'
                    : 'bg-white border-gray-200 hover:border-gray-300 card-hover'
                }`}
              >
                <div className="flex flex-row items-center gap-4 h-full px-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedType === 'collaborative'
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}>
                    <Users className={`w-8 h-8 ${
                      selectedType === 'collaborative'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 flex flex-col items-start">
                    <h3 className={`font-bold text-lg mb-1 ${
                      selectedType === 'collaborative'
                        ? 'text-blue-700'
                        : 'text-gray-700'
                    }`}>
                      팀 마인드맵
                    </h3>
                    <p className={`text-sm text-left ${
                      selectedType === 'collaborative'
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}>
                      팀원들과 함께 사용하는 마인드맵
                    </p>
                  </div>
                </div>
                {selectedType === 'collaborative' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </motion.button>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleNext}
                disabled={!selectedType}
                className="w-full h-[56px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음
              </Button>
            </div>

            {!selectedType && (
              <p className="text-sm text-gray-500 text-center mt-4">
                마인드맵 타입을 선택해주세요
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
