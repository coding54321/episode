'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { userStorage, badgeStorage, mindMapProjectStorage, currentProjectStorage } from '@/lib/storage';
import { BadgeType, MindMapProject, MindMapNode } from '@/types';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, Plus, X } from 'lucide-react';
import { applyLayout } from '@/lib/layouts';

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

export default function BadgeSelectionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedBadges, setSelectedBadges] = useState<BadgeType[]>([]);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  // 공동 마인드맵용 경험 입력
  const [experiences, setExperiences] = useState<string[]>(['']);
  const [projectName, setProjectName] = useState('');

  // URL에서 projectType 읽기
  const projectType = (searchParams.get('projectType') || 'personal') as 'personal' | 'collaborative';

  useEffect(() => {
    const checkAuth = async () => {
      const user = await userStorage.load();
      if (!user) {
        router.push('/login');
        return;
      }

      setSelectedBadges([]);
      setCustomLabels({});

      if (projectType === 'collaborative') {
        setExperiences(['']);
        setProjectName('');
      }
    };

    checkAuth();
  }, [router, projectType]);

  const toggleBadge = (badgeId: BadgeType) => {
    setSelectedBadges((prev) => (prev.includes(badgeId) ? prev.filter((id) => id !== badgeId) : [...prev, badgeId]));
  };

  // 공동 마인드맵용 경험 추가/삭제
  const handleAddExperience = () => {
    setExperiences([...experiences, '']);
  };

  const handleRemoveExperience = (index: number) => {
    if (experiences.length > 1) {
      setExperiences(experiences.filter((_, i) => i !== index));
    }
  };

  const handleExperienceChange = (index: number, value: string) => {
    const newExperiences = [...experiences];
    newExperiences[index] = value;
    setExperiences(newExperiences);
  };

  const handleComplete = async () => {
    if (projectType === 'personal' && selectedBadges.length === 0) return;

    if (projectType === 'collaborative') {
      const validExperiences = experiences.filter((e) => e.trim() !== '');
      if (validExperiences.length === 0) {
        alert('최소 1개 이상의 경험을 입력해주세요.');
        return;
      }
      if (!projectName.trim()) {
        alert('프로젝트 이름을 입력해주세요.');
        return;
      }
    }

    const user = await userStorage.load();
    if (!user) {
      router.push('/login');
      return;
    }

    const projectId = crypto.randomUUID();
    const finalProjectName = projectType === 'collaborative' ? projectName.trim() : `${user.name}의 경험 맵`;

    const badgeMap: Record<string, string> = {
      intern: '인턴',
      academic: '학업',
      club: '동아리',
      project: '프로젝트',
      parttime: '아르바이트',
      volunteer: '봉사활동',
      competition: '공모전',
      other: '기타',
    };

    const centerNodeId = `${projectId}_center`;
    const centerNode: MindMapNode = {
      id: centerNodeId,
      label: projectType === 'collaborative' ? finalProjectName : user.name || '나',
      parentId: null,
      children: [],
      x: 500,
      y: 300,
      level: 0,
      nodeType: 'center',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    let initialNodes: MindMapNode[] = [];

    if (projectType === 'collaborative') {
      const validExperiences = experiences.filter((e) => e.trim() !== '');
      const experienceNodes: MindMapNode[] = validExperiences.map((experience, index) => {
        const nodeId = `${projectId}_experience_${index}`;
        centerNode.children.push(nodeId);

        return {
          id: nodeId,
          label: experience.trim(),
          parentId: centerNodeId,
          children: [],
          x: 500,
          y: 300,
          level: 1,
          nodeType: 'experience',
          isManuallyPositioned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });

      initialNodes = [centerNode, ...experienceNodes];
    } else {
      const badgeNodes: MindMapNode[] = selectedBadges.map((badgeId, index) => {
        const nodeId = `${projectId}_badge_${badgeId}_${index}`;
        centerNode.children.push(nodeId);

        const displayLabel =
          badgeId === 'other' && customLabels[index] ? customLabels[index] : badgeMap[badgeId] || badgeId;

        return {
          id: nodeId,
          label: displayLabel,
          parentId: centerNodeId,
          children: [],
          x: 500,
          y: 300,
          level: 1,
          nodeType: 'category',
          badgeType: badgeId,
          customLabel: badgeId === 'other' ? customLabels[index] : undefined,
          isManuallyPositioned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });

      initialNodes = [centerNode, ...badgeNodes];
    }

    const layoutType = 'radial';
    const layoutConfig = { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } };
    const layoutedNodes = applyLayout(initialNodes, layoutType, layoutConfig);

    const newProject: MindMapProject & { userId?: string } = {
      id: projectId,
      name: finalProjectName,
      description:
        projectType === 'collaborative'
          ? `${experiences.filter((e) => e.trim() !== '').length}개의 경험을 관리합니다`
          : `${selectedBadges.length}개의 경험 유형을 관리합니다`,
      badges: projectType === 'collaborative' ? [] : selectedBadges,
      nodes: layoutedNodes,
      layoutType: 'radial',
      layoutConfig: layoutConfig,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true,
      projectType: projectType,
      isShared: projectType === 'collaborative' ? true : false,
      userId: user.id,
    };

    try {
      await mindMapProjectStorage.add(newProject);
      currentProjectStorage.save(projectId);
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(`/mindmap?projectId=${projectId}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('마인드맵 생성에 실패했습니다. 다시 시도해주세요.');
      router.push('/mindmaps');
    }
  };

  const handleSkip = async () => {
    if (projectType === 'collaborative') {
      alert('공동 마인드맵은 최소 1개 이상의 경험을 입력해주세요.');
      return;
    }

    const user = await userStorage.load();
    if (!user) {
      router.push('/login');
      return;
    }

    const projectId = crypto.randomUUID();
    const projectName = `${user.name}의 경험 맵`;

    const centerNodeId = `${projectId}_center`;
    const centerNode: MindMapNode = {
      id: centerNodeId,
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
      layoutType: 'radial',
      layoutConfig: { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true,
      projectType: projectType,
      // handleSkip은 personal에서만 동작
      isShared: false,
      userId: user.id,
    };

    try {
      await mindMapProjectStorage.add(newProject);
      currentProjectStorage.save(projectId);
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(`/mindmap?projectId=${projectId}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('마인드맵 생성에 실패했습니다. 다시 시도해주세요.');
      router.push('/mindmaps');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col">
      <div className="safe-area-top bg-white dark:bg-[#0a0a0a]" />
      <div className="flex-1 bg-white dark:bg-[#0a0a0a] px-5 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 dark:text-[#a0a0a0] mb-8">
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="max-w-md mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <div className="mb-12">
              {projectType === 'collaborative' ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-3">
                    공동 마인드맵을
                    <br />
                    시작해볼까요?
                  </h1>
                  <p className="text-gray-600 dark:text-[#a0a0a0] text-base">프로젝트 이름과 경험을 입력하세요</p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-3">
                    어떤 경험을
                    <br />
                    관리하고 싶으신가요?
                  </h1>
                  <p className="text-gray-600 dark:text-[#a0a0a0] text-base">여러 개를 선택할 수 있어요</p>
                </>
              )}
            </div>

            {projectType === 'collaborative' ? (
              <div className="space-y-4 mb-12">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e5] mb-2">프로젝트 이름</label>
                  <Input
                    type="text"
                    placeholder="예: 팀 프로젝트, 스터디 그룹 등"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="h-12 rounded-[12px] border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-[#e5e5e5] placeholder-gray-500 dark:placeholder-[#606060] focus:border-blue-500 dark:focus:border-[#60A5FA]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e5] mb-2">경험 추가</label>
                  <div className="space-y-3">
                    {experiences.map((experience, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder={`경험 ${index + 1} (예: 웹 개발 프로젝트, 디자인 시스템 구축 등)`}
                          value={experience}
                          onChange={(e) => handleExperienceChange(index, e.target.value)}
                          className="flex-1 h-12 rounded-[12px] border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-[#e5e5e5] placeholder-gray-500 dark:placeholder-[#606060] focus:border-blue-500 dark:focus:border-[#60A5FA]"
                        />
                        {experiences.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveExperience(index)}
                            className="h-12 w-12 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-[#606060] hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddExperience}
                      className="w-full h-12 border-dashed border-2 border-gray-300 dark:border-[#404040] hover:border-blue-500 dark:hover:border-[#60A5FA] text-gray-600 dark:text-[#a0a0a0] hover:text-blue-600 dark:hover:text-[#60A5FA] bg-transparent"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      경험 추가하기
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-[#a0a0a0]">중앙 노드에서 바로 경험을 추가할 수 있어요. 나중에 더 추가할 수 있습니다.</p>
                </div>
              </div>
            ) : (
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
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-[#60A5FA] shadow-sm'
                            : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a] card-hover'
                        }`}
                      >
                        <div className="flex items-center gap-3 px-4">
                          <span className="text-2xl">{badge.emoji}</span>
                          <span className={`font-semibold text-sm ${isSelected ? 'text-blue-700 dark:text-[#60A5FA]' : 'text-gray-700 dark:text-[#e5e5e5]'}`}>
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
                          onChange={(e) => setCustomLabels((prev) => ({ ...prev, [idx]: e.target.value }))}
                          className="w-full h-[48px] px-4 rounded-[12px] border-[1.5px] border-gray-200 dark:border-[#2a2a2a] focus:border-blue-500 dark:focus:border-[#60A5FA] focus:outline-none text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-[#e5e5e5] placeholder-gray-500 dark:placeholder-[#606060]"
                        />
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleComplete}
                disabled={
                  projectType === 'personal'
                    ? selectedBadges.length === 0
                    : experiences.filter((e) => e.trim() !== '').length === 0 || !projectName.trim()
                }
                className="w-full h-[56px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음
              </Button>

              {projectType === 'personal' && (
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="w-full h-[56px] bg-white dark:bg-[#1a1a1a] border-[1.5px] border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a] text-gray-600 dark:text-[#a0a0a0] font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 ease-out"
                >
                  건너뛰기
                </Button>
              )}
            </div>

            {projectType === 'personal' && selectedBadges.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center mt-4">최소 1개 이상 선택해주세요</p>
            )}

            {projectType === 'collaborative' && (
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center mt-4">프로젝트 이름과 최소 1개 이상의 경험을 입력해주세요</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

