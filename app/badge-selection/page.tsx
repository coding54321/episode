'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { userStorage, badgeStorage, mindMapProjectStorage, currentProjectStorage } from '@/lib/storage';
import { BadgeType, MindMapProject, MindMapNode } from '@/types';
import { motion } from 'framer-motion';
import { Check, ChevronLeft } from 'lucide-react';

const BADGES: { id: BadgeType; label: string; emoji: string }[] = [
  { id: 'intern', label: '인턴', emoji: '💼' },
  { id: 'academic', label: '학업', emoji: '📚' },
  { id: 'club', label: '동아리', emoji: '🎯' },
  { id: 'project', label: '프로젝트', emoji: '🚀' },
  { id: 'parttime', label: '아르바이트', emoji: '💰' },
  { id: 'volunteer', label: '봉사활동', emoji: '❤️' },
  { id: 'competition', label: '공모전', emoji: '🏆' },
  { id: 'other', label: '기타', emoji: '✨' },
];

export default function BadgeSelectionPage() {
  const router = useRouter();
  const [selectedBadges, setSelectedBadges] = useState<BadgeType[]>([]);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkAuth = async () => {
      // 로그인 확인
      const user = await userStorage.load();
      if (!user) {
        router.push('/login');
        return;
      }

      // 새 마인드맵 생성 시 이전 선택 초기화
      setSelectedBadges([]);
      setCustomLabels({});
    };

    checkAuth();
  }, [router]);

  const toggleBadge = (badgeId: BadgeType) => {
    setSelectedBadges(prev => {
      if (prev.includes(badgeId)) {
        return prev.filter(id => id !== badgeId);
      } else {
        return [...prev, badgeId];
      }
    });
  };

  const handleComplete = async () => {
    if (selectedBadges.length === 0) return;
    
    // 마인드맵 프로젝트 생성 및 이동
    const user = await userStorage.load();
    if (!user) {
      router.push('/login');
      return;
    }

    // 새 마인드맵 프로젝트 생성 (UUID 형식)
    const projectId = crypto.randomUUID();
    const projectName = `${user.name}의 경험 맵`;
    
    const badgeMap: Record<string, string> = {
      'intern': '인턴',
      'academic': '학업',
      'club': '동아리',
      'project': '프로젝트',
      'parttime': '아르바이트',
      'volunteer': '봉사활동',
      'competition': '공모전',
      'other': '기타',
    };

    // 중앙 노드 생성
    const centerNode: MindMapNode = {
      id: 'center',
      label: user.name || '나',
      parentId: null,
      children: [],
      x: 500,
      y: 300,
      level: 0,
      nodeType: 'center',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 배지 노드들 생성
    const badgeNodes: MindMapNode[] = selectedBadges.map((badgeId, index) => {
      const angle = (index / selectedBadges.length) * 2 * Math.PI;
      const radius = 200;
      const nodeId = `badge_${badgeId}_${index}`;
      
      centerNode.children.push(nodeId);
      
      // '기타'인 경우 사용자가 입력한 라벨 사용
      const displayLabel = badgeId === 'other' && customLabels[index] 
        ? customLabels[index] 
        : badgeMap[badgeId] || badgeId;
      
      return {
        id: nodeId,
        label: displayLabel,
        parentId: 'center',
        children: [],
        x: 500 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        level: 1,
        nodeType: 'category',
        badgeType: badgeId,
        customLabel: badgeId === 'other' ? customLabels[index] : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    });

    const newProject: MindMapProject & { userId?: string } = {
      id: projectId,
      name: projectName,
      description: `${selectedBadges.length}개의 경험 유형을 관리합니다`,
      badges: selectedBadges,
      nodes: [centerNode, ...badgeNodes],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true,
      userId: user.id,
    };

    await mindMapProjectStorage.add(newProject);
    currentProjectStorage.save(projectId);
    
    router.push(`/mindmap/${projectId}`);
  };

  const handleSkip = async () => {
    // 건너뛰기: 배지 없이 중심 노드만 있는 마인드맵 생성
    const user = await userStorage.load();
    if (!user) {
      router.push('/login');
      return;
    }

    // 새 마인드맵 프로젝트 생성 (중심 노드만, UUID 형식)
    const projectId = crypto.randomUUID();
    const projectName = `${user.name}의 경험 맵`;

    // 중앙 노드만 생성
    const centerNode: MindMapNode = {
      id: 'center',
      label: user.name || '나',
      parentId: null,
      children: [],
      x: 500,
      y: 300,
      level: 0,
      nodeType: 'center',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newProject: MindMapProject & { userId?: string } = {
      id: projectId,
      name: projectName,
      description: '경험을 관리합니다',
      badges: [],
      nodes: [centerNode],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true,
      userId: user.id,
    };

    await mindMapProjectStorage.add(newProject);
    currentProjectStorage.save(projectId);
    
    router.push(`/mindmap/${projectId}`);
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

        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                어떤 경험을
                <br />관리하고 싶으신가요?
              </h1>
              <p className="text-gray-600 text-base">
                여러 개를 선택할 수 있어요
              </p>
            </div>

            <div className="space-y-3 mb-12">
              <div className="grid grid-cols-2 gap-3">
                {BADGES.map((badge, index) => {
                  const isSelected = selectedBadges.includes(badge.id);
                  return (
                    <motion.button
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => toggleBadge(badge.id)}
                      className={`relative h-[72px] rounded-[16px] border-[1.5px] transition-all duration-200 ease-out ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4">
                        <span className="text-2xl">{badge.emoji}</span>
                        <span className={`font-semibold text-sm ${
                          isSelected ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          {badge.label}
                        </span>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* '기타' 선택 시 커스텀 입력 필드 표시 */}
              {selectedBadges.map((badgeId, idx) => {
                if (badgeId === 'other') {
                  return (
                    <motion.div
                      key={`custom-${idx}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3"
                    >
                      <input
                        type="text"
                        placeholder="기타 경험 유형을 입력하세요 (예: 어학연수, 창업 등)"
                        value={customLabels[idx] || ''}
                        onChange={(e) => setCustomLabels(prev => ({ ...prev, [idx]: e.target.value }))}
                        className="w-full h-[48px] px-4 rounded-[12px] border-[1.5px] border-gray-200 focus:border-blue-500 focus:outline-none text-sm"
                      />
                    </motion.div>
                  );
                }
                return null;
              })}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleComplete}
                disabled={selectedBadges.length === 0}
                className="w-full h-[56px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음
              </Button>

              <Button
                onClick={handleSkip}
                variant="outline"
                className="w-full h-[56px] bg-white border-[1.5px] border-gray-200 hover:border-gray-300 text-gray-600 font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 ease-out"
              >
                건너뛰기
              </Button>
            </div>

            {selectedBadges.length === 0 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                최소 1개 이상 선택해주세요
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

