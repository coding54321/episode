'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { supabase } from '@/lib/supabase/client';
import { MindMapNode, MindMapProject, BadgeType } from '@/types';
import { mindMapProjectStorage, currentProjectStorage, userStorage } from '@/lib/storage';
import { applyLayout } from '@/lib/layouts';

export default function OnboardingDraftCompletePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleCreateMindMap = async () => {
    if (!user || isCreating) return;

    setIsCreating(true);

    try {
      // 마인드맵 프로젝트 생성 (시뮬레이션 데이터 기반)
      const projectId = crypto.randomUUID();
      const projectName = user.name ? `${user.name}의 마인드맵` : '마인드맵';

      const centerNodeId = `${projectId}_center`;
      const centerNode: MindMapNode = {
        id: centerNodeId,
        label: user.name || '나',
        parentId: null,
        children: ['intern', 'parttime', 'club'],
        x: 500,
        y: 300,
        level: 0,
        nodeType: 'center',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const badgeNodes: MindMapNode[] = [
        {
          id: 'intern',
          label: '인턴',
          parentId: centerNodeId,
          children: [],
          x: 500,
          y: 300,
          level: 1,
          nodeType: 'category',
          badgeType: 'intern',
          isManuallyPositioned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'parttime',
          label: '아르바이트',
          parentId: centerNodeId,
          children: ['oliveyoung'],
          x: 500,
          y: 300,
          level: 1,
          nodeType: 'category',
          badgeType: 'parttime',
          isManuallyPositioned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'oliveyoung',
          label: '올리브영',
          parentId: 'parttime',
          children: ['episode'],
          x: 500,
          y: 300,
          level: 2,
          nodeType: 'experience',
          isManuallyPositioned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'episode',
          label: '아르바이트 에피소드',
          parentId: 'oliveyoung',
          children: [],
          x: 500,
          y: 300,
          level: 3,
          nodeType: 'episode',
          isManuallyPositioned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'club',
          label: '동아리',
          parentId: centerNodeId,
          children: ['badminton'],
          x: 500,
          y: 300,
          level: 1,
          nodeType: 'category',
          badgeType: 'club',
          isManuallyPositioned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'badminton',
          label: '배드민턴 동아리 PING PONG',
          parentId: 'club',
          children: [],
          x: 500,
          y: 300,
          level: 2,
          nodeType: 'experience',
          isManuallyPositioned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const initialNodes = [centerNode, ...badgeNodes];
      const layoutType = 'radial';
      const layoutConfig = { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } };
      const layoutedNodes = applyLayout(initialNodes, layoutType, layoutConfig);

      const newProject: MindMapProject & { userId?: string } = {
        id: projectId,
        name: projectName,
        description: '온보딩을 통해 생성된 마인드맵',
        badges: ['intern', 'parttime', 'club'] as BadgeType[],
        nodes: layoutedNodes,
        layoutType: 'radial',
        layoutConfig: layoutConfig,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true,
        projectType: 'personal',
        isShared: false,
        userId: user.id,
      };

      await mindMapProjectStorage.add(newProject);
      currentProjectStorage.save(projectId);

      // 온보딩 완료 표시
      await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id' as any, user.id as any);

      // 마인드맵 워크스페이스로 이동
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(`/mindmap?projectId=${projectId}`);
    } catch (error) {
      console.error('Failed to create mind map:', error);
      alert('마인드맵 생성에 실패했습니다. 다시 시도해주세요.');
      setIsCreating(false);
    }
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
      {/* 진행 표시기 */}
      <div className="flex justify-center items-center pt-12 pb-8">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full ${
                step === 5 ? 'bg-[#5B6EFF]' : 'bg-[#5B6EFF]'
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
          <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {user?.name || '님'}의 마인드맵 초안이
            <br />
            이렇게 완성되었어요!
          </h1>

          {/* 마인드맵 미리보기 */}
          <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm mb-8">
            <div className="relative w-full h-96 bg-gray-50 rounded-lg overflow-hidden">
              <svg className="w-full h-full">
                {/* 연결선 */}
                <line x1="50%" y1="50%" x2="25%" y2="50%" stroke="#E5E7EB" strokeWidth="2" />
                <line x1="50%" y1="50%" x2="75%" y2="50%" stroke="#E5E7EB" strokeWidth="2" />
                <line x1="50%" y1="50%" x2="50%" y2="75%" stroke="#E5E7EB" strokeWidth="2" />
                <line x1="75%" y1="50%" x2="85%" y2="50%" stroke="#E5E7EB" strokeWidth="2" />
                <line x1="50%" y1="75%" x2="50%" y2="85%" stroke="#E5E7EB" strokeWidth="2" />

                {/* 중심 노드 */}
                <circle cx="50%" cy="50%" r="40" fill="#5B6EFF" />
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
                <text x="19%" y="52%" className="text-xs fill-gray-700">
                  인턴
                </text>

                <rect x="70%" y="45%" width="100" height="40" rx="8" fill="#E9D5FF" />
                <text x="74%" y="52%" className="text-xs fill-gray-700">
                  아르바이트
                </text>

                <rect x="85%" y="45%" width="80" height="40" rx="8" fill="#E9D5FF" />
                <text x="89%" y="52%" className="text-xs fill-gray-700">
                  올리브영
                </text>

                <rect x="45%" y="70%" width="100" height="40" rx="8" fill="#A7F3D0" />
                <text x="49%" y="77%" className="text-xs fill-gray-700">
                  동아리
                </text>
              </svg>
            </div>
          </div>

          <Button
            onClick={handleCreateMindMap}
            disabled={isCreating}
            className="w-full h-[56px] bg-[#5B6EFF] hover:bg-[#4A5EE8] text-white font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCreating ? '생성 중...' : '마인드맵 생성하기'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
