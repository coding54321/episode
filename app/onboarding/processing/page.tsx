'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { MindMapNode, MindMapProject, BadgeType } from '@/types';
import { mindMapProjectStorage, currentProjectStorage, userStorage } from '@/lib/storage';
import { applyLayout } from '@/lib/layouts';

export default function OnboardingProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <OnboardingProcessingContent />
    </Suspense>
  );
}

function OnboardingProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useUnifiedAuth();
  const hasFile = searchParams.get('hasFile') === 'true';
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!hasFile) {
      router.push('/onboarding/experience-start');
      return;
    }

    // 시뮬레이션: 진행률 증가
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // 완료 시 초안 완성 페이지로 이동
          setTimeout(() => {
            router.push('/onboarding/draft-complete');
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [user, authLoading, router, hasFile]);

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

  // 마인드맵 미리보기 데이터 (시뮬레이션)
  const previewNodes: MindMapNode[] = [
    {
      id: 'center',
      label: user?.name ? `${user.name}의 마인드맵` : '마인드맵',
      parentId: null,
      children: ['intern', 'parttime', 'club'],
      x: 500,
      y: 300,
      level: 0,
      nodeType: 'center',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'intern',
      label: '인턴',
      parentId: 'center',
      children: [],
      x: 300,
      y: 300,
      level: 1,
      nodeType: 'category',
      badgeType: 'intern',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'parttime',
      label: '아르바이트',
      parentId: 'center',
      children: ['oliveyoung'],
      x: 700,
      y: 300,
      level: 1,
      nodeType: 'category',
      badgeType: 'parttime',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'oliveyoung',
      label: '올리브영',
      parentId: 'parttime',
      children: ['episode'],
      x: 800,
      y: 300,
      level: 2,
      nodeType: 'experience',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'episode',
      label: '아르바이트 에피소드',
      parentId: 'oliveyoung',
      children: [],
      x: 900,
      y: 300,
      level: 3,
      nodeType: 'episode',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'club',
      label: '동아리',
      parentId: 'center',
      children: ['badminton'],
      x: 500,
      y: 500,
      level: 1,
      nodeType: 'category',
      badgeType: 'club',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'badminton',
      label: '배드민턴 동아리 PING PONG',
      parentId: 'club',
      children: [],
      x: 500,
      y: 600,
      level: 2,
      nodeType: 'experience',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 진행 표시기 */}
      <div className="flex justify-center items-center pt-12 pb-8">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full ${
                step === 4 ? 'bg-[#5B6EFF]' : step < 4 ? 'bg-[#5B6EFF]' : 'bg-gray-300'
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
          className="w-full max-w-2xl"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            episode가 당신의 경험을
            <br />
            마인드맵으로 정리하고 있어요!
          </h1>
          <p className="text-sm text-gray-500 mb-8 text-center">
            잠시만 기다려주세요...
          </p>

          {/* 진행률 바 */}
          <div className="mb-12">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#5B6EFF]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">{progress}%</p>
          </div>

          {/* 마인드맵 미리보기 */}
          <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
            <div className="relative w-full h-96 bg-gray-50 rounded-lg overflow-hidden">
              {/* 간단한 마인드맵 시각화 */}
              <svg className="w-full h-full">
                {/* 연결선 */}
                <line
                  x1="50%"
                  y1="50%"
                  x2="25%"
                  y2="50%"
                  stroke="#E5E7EB"
                  strokeWidth="2"
                />
                <line
                  x1="50%"
                  y1="50%"
                  x2="75%"
                  y2="50%"
                  stroke="#E5E7EB"
                  strokeWidth="2"
                />
                <line
                  x1="50%"
                  y1="50%"
                  x2="50%"
                  y2="75%"
                  stroke="#E5E7EB"
                  strokeWidth="2"
                />
                <line
                  x1="75%"
                  y1="50%"
                  x2="85%"
                  y2="50%"
                  stroke="#E5E7EB"
                  strokeWidth="2"
                />
                <line
                  x1="50%"
                  y1="75%"
                  x2="50%"
                  y2="85%"
                  stroke="#E5E7EB"
                  strokeWidth="2"
                />

                {/* 중심 노드 */}
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="40"
                  fill="#5B6EFF"
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-white font-semibold"
                >
                  {user?.name || '마인드맵'}
                </text>

                {/* 하위 노드들 */}
                <rect x="15%" y="45%" width="80" height="40" rx="8" fill="#DBEAFE" />
                <text x="19%" y="52%" className="text-xs fill-gray-700">인턴</text>

                <rect x="70%" y="45%" width="100" height="40" rx="8" fill="#E9D5FF" />
                <text x="74%" y="52%" className="text-xs fill-gray-700">아르바이트</text>

                <rect x="45%" y="70%" width="100" height="40" rx="8" fill="#A7F3D0" />
                <text x="49%" y="77%" className="text-xs fill-gray-700">동아리</text>
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
