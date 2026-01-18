'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mindMapProjectStorage, assetStorage } from '@/lib/storage';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { ArchiveItem, BadgeType, STARAsset, MindMapNode, MindMapProject, COMPETENCY_KEYWORDS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, Download, Edit, Plus, Save, X, ChevronDown } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { updateNode } from '@/lib/supabase/data';
import { toast } from 'sonner';
import FloatingHeader from '@/components/FloatingHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BADGE_LABELS: Record<BadgeType, string> = {
  intern: '인턴',
  academic: '학업',
  club: '동아리',
  project: '프로젝트',
  parttime: '아르바이트',
  volunteer: '봉사활동',
  competition: '공모전',
  other: '기타',
};

const BADGE_COLORS: Record<BadgeType, string> = {
  intern: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600',
  academic: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-600',
  club: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-600',
  project: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-600',
  parttime: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-600',
  volunteer: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-600',
  competition: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-600',
  other: 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
};

export default function ArchivePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth(); // 전역 상태에서 사용자 정보 가져오기
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BadgeType | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [projects, setProjects] = useState<MindMapProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'collaborative'>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingExperienceNodeId, setEditingExperienceNodeId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    situation: string;
    task: string;
    action: string;
    result: string;
    tags: string[];
    startDate: number | null;
    endDate: number | null;
  } | null>(null);
  const [showTagDialog, setShowTagDialog] = useState(false);

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) {
      return;
    }

    const checkAuthAndLoad = async () => {
      // 로그인 확인 (전역 상태 사용)
      if (!user) {
        router.push('/login');
        return;
      }

      await loadArchiveData();
    };

    checkAuthAndLoad();
  }, [router, user, authLoading]);

  const loadArchiveData = async () => {
    try {
      setIsLoading(true);
      
      const projectsList = await mindMapProjectStorage.load();
      console.log('[archive/page] 프로젝트 목록 로드 시작', { 
        projectsListCount: projectsList.length,
        projectsList: projectsList.map(p => ({ id: p.id, name: p.name }))
      });
      
      const items: ArchiveItem[] = [];
      const tagsSet = new Set<string>();
      const projectsData: MindMapProject[] = [];

      for (const projectSummary of projectsList) {
      // 각 프로젝트의 전체 데이터(노드 포함)를 Supabase에서 로드
      const project = await mindMapProjectStorage.get(projectSummary.id);
      if (!project) {
        console.warn('[archive/page] 프로젝트를 찾을 수 없음', { projectId: projectSummary.id });
        continue;
      }

      // 프로젝트 정보 저장 (center 노드가 없어도 드롭다운에 표시하기 위해 먼저 추가)
      projectsData.push(project);

      console.log('[archive/page] 프로젝트 로드 완료', {
        projectId: project.id,
        projectName: project.name,
        nodeCount: project.nodes.length,
        hasCenterNode: project.nodes.some(n => n.level === 0 || n.nodeType === 'center'),
      });

      // 중심 노드만 있는 경우 (레벨 0만 있는 경우)
      const centerNode = project.nodes.find(n => n.level === 0 || n.nodeType === 'center');
      if (!centerNode) {
        // center 노드가 없어도 프로젝트는 드롭다운에 표시되므로 계속 진행
        console.log('[archive/page] center 노드 없음, 프로젝트만 드롭다운에 표시', { projectId: project.id });
        continue;
      }

      // 팀 마인드맵과 개인 마인드맵 구조 분기 처리
      if (project.projectType === 'collaborative') {
        // 팀 마인드맵: 중앙 노드(level 0) = 경험 층위, 경험 노드(level 1), 에피소드 노드(level 2)
        const experienceNodes = project.nodes.filter(
          (n) => n.parentId === centerNode.id && n.level === 1 && n.nodeType === 'experience'
        );
        
        // 경험이 없으면 프로젝트만 표시
        if (experienceNodes.length === 0) {
          items.push({
            id: `${project.id}_${centerNode.id}`,
            projectId: project.id,
            projectName: project.name,
            category: 'other',
            categoryLabel: '-',
            experienceName: '-',
            episodeName: '-',
            star: null,
            tags: [],
            nodePath: [project.name],
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          });
          continue;
        }
        
        for (const experienceNode of experienceNodes) {
          // 에피소드 노드들 (level 2)
          const episodeNodes = project.nodes.filter(
            (n) => n.parentId === experienceNode.id && n.level === 2
          );
          
          // 에피소드가 없으면 경험까지만 표시
          if (episodeNodes.length === 0) {
            items.push({
              id: `${project.id}_${experienceNode.id}`,
              projectId: project.id,
              projectName: project.name,
              category: 'other',
              categoryLabel: '-',
              experienceName: typeof experienceNode.label === 'string' ? experienceNode.label : '',
              episodeName: '-',
              experienceStartDate: experienceNode.startDate || null,
              experienceEndDate: experienceNode.endDate || null,
              star: null,
              tags: [],
              nodePath: [
                project.name,
                typeof experienceNode.label === 'string' ? experienceNode.label : '',
              ],
              createdAt: experienceNode.createdAt,
              updatedAt: experienceNode.updatedAt,
            });
            continue;
          }
          
          for (const episodeNode of episodeNodes) {
            // 해당 에피소드의 STAR 에셋 찾기 (없어도 표시)
            const starAsset = await assetStorage.getByNodeId(episodeNode.id);
            const tags = starAsset?.tags ? [...starAsset.tags] : [];
            
            // 태그 수집
            tags.forEach(tag => tagsSet.add(tag));
            
            items.push({
              id: `${project.id}_${episodeNode.id}`,
              projectId: project.id,
              projectName: project.name,
              category: 'other',
              categoryLabel: '-',
              experienceName: typeof experienceNode.label === 'string' ? experienceNode.label : '',
              episodeName: typeof episodeNode.label === 'string' ? episodeNode.label : '',
              experienceStartDate: experienceNode.startDate || null,
              experienceEndDate: experienceNode.endDate || null,
              star: starAsset || null,
              tags,
              nodePath: [
                project.name,
                typeof experienceNode.label === 'string' ? experienceNode.label : '',
                typeof episodeNode.label === 'string' ? episodeNode.label : '',
              ],
              createdAt: episodeNode.createdAt,
              updatedAt: episodeNode.updatedAt,
            });
          }
        }
      } else {
        // 개인 마인드맵: 중앙 노드(level 0), 배지 노드(level 1), 경험 노드(level 2), 에피소드 노드(level 3)
      const nodesByLevel = groupNodesByLevel(project.nodes);
      
      // 대분류(배지) 노드들 (level 1)
      const categoryNodes = nodesByLevel[1] || [];
      
      // 대분류가 없으면 프로젝트만 표시
      if (categoryNodes.length === 0) {
        items.push({
          id: `${project.id}_${centerNode.id}`,
          projectId: project.id,
          projectName: project.name,
          category: 'other',
          categoryLabel: '-',
          experienceName: '-',
          episodeName: '-',
          star: null,
          tags: [],
          nodePath: [project.name],
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        });
        continue;
      }
      
      for (const categoryNode of categoryNodes) {
        const badgeType = categoryNode.badgeType || 'other';
        const categoryLabel = categoryNode.customLabel || categoryNode.label || BADGE_LABELS[badgeType];
        
        // 경험 노드들 (level 2)
        const experienceNodes = project.nodes.filter(
          (n) => n.parentId === categoryNode.id && n.level === 2
        );
        
        // 경험이 없으면 대분류까지만 표시
        if (experienceNodes.length === 0) {
          items.push({
            id: `${project.id}_${categoryNode.id}`,
            projectId: project.id,
            projectName: project.name,
            category: badgeType,
            categoryLabel: categoryLabel,
            experienceName: '-',
            episodeName: '-',
            star: null,
            tags: [],
            nodePath: [project.name, categoryLabel],
            createdAt: categoryNode.createdAt,
            updatedAt: categoryNode.updatedAt,
          });
          continue;
        }
        
        for (const experienceNode of experienceNodes) {
          // 에피소드 노드들 (level 3)
          const episodeNodes = project.nodes.filter(
            (n) => n.parentId === experienceNode.id && n.level === 3
          );
          
          // 에피소드가 없으면 경험까지만 표시
          if (episodeNodes.length === 0) {
            items.push({
              id: `${project.id}_${experienceNode.id}`,
              projectId: project.id,
              projectName: project.name,
              category: badgeType,
              categoryLabel: categoryLabel,
              experienceName: typeof experienceNode.label === 'string' ? experienceNode.label : '',
              episodeName: '-',
              experienceStartDate: experienceNode.startDate || null,
              experienceEndDate: experienceNode.endDate || null,
              star: null,
              tags: [],
              nodePath: [
                project.name,
                categoryLabel,
                typeof experienceNode.label === 'string' ? experienceNode.label : '',
              ],
              createdAt: experienceNode.createdAt,
              updatedAt: experienceNode.updatedAt,
            });
            continue;
          }
          
          for (const episodeNode of episodeNodes) {
            const starAsset = await assetStorage.getByNodeId(episodeNode.id);
            const tags = starAsset?.tags ? [...starAsset.tags] : [];
            
            tags.forEach(tag => tagsSet.add(tag));
            
            items.push({
              id: `${project.id}_${episodeNode.id}`,
              projectId: project.id,
              projectName: project.name,
              category: badgeType,
              categoryLabel: categoryLabel,
              experienceName: typeof experienceNode.label === 'string' ? experienceNode.label : '',
              episodeName: typeof episodeNode.label === 'string' ? episodeNode.label : '',
                experienceStartDate: experienceNode.startDate || null,
                experienceEndDate: experienceNode.endDate || null,
                star: starAsset || null,
              tags,
              nodePath: [
                project.name,
                categoryLabel,
                typeof experienceNode.label === 'string' ? experienceNode.label : '',
                typeof episodeNode.label === 'string' ? episodeNode.label : '',
              ],
              createdAt: episodeNode.createdAt,
              updatedAt: episodeNode.updatedAt,
            });
            }
          }
        }
      }
    }

      setArchiveItems(items);
      setFilteredItems(items);
      setAllTags(Array.from(tagsSet).sort());
      
      // 프로젝트 목록 저장 (중복 제거)
      const uniqueProjects = projectsData.filter((project, index, self) =>
        index === self.findIndex((p) => p.id === project.id)
      );
      
      console.log('[archive/page] 프로젝트 데이터 저장 직전', {
        projectsDataCount: projectsData.length,
        uniqueProjectsCount: uniqueProjects.length,
        projectNames: uniqueProjects.map(p => p.name),
        projectIds: uniqueProjects.map(p => p.id),
      });
      
      setProjects(uniqueProjects);
      
      console.log('[archive/page] 데이터 로드 완료', {
        totalItems: items.length,
        totalProjects: uniqueProjects.length,
        projectNames: uniqueProjects.map(p => p.name),
        projectIds: uniqueProjects.map(p => p.id),
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load archive data:', error);
      setIsLoading(false);
      toast.error('데이터를 불러오는데 실패했습니다.');
    }
  };

  const groupNodesByLevel = (nodes: MindMapNode[]) => {
    const grouped: Record<number, MindMapNode[]> = {};
    nodes.forEach((node) => {
      if (!grouped[node.level]) {
        grouped[node.level] = [];
      }
      grouped[node.level].push(node);
    });
    return grouped;
  };

  // 프로젝트 타입별 필터링 함수
  const getFilteredItemsByType = (): ArchiveItem[] => {
    let filtered = [...archiveItems];

    // 프로젝트 타입 필터
    if (activeTab === 'personal') {
      filtered = filtered.filter((item) => {
        const project = projects.find(p => p.id === item.projectId);
        return project?.projectType === 'personal';
      });
    } else if (activeTab === 'collaborative') {
      filtered = filtered.filter((item) => {
        const project = projects.find(p => p.id === item.projectId);
        return project?.projectType === 'collaborative';
      });
    }
    // 'all'인 경우 필터링 없음

    return filtered;
  };

  // 필터링 및 검색
  useEffect(() => {
    let filtered = getFilteredItemsByType();

    // 프로젝트 필터
    if (selectedProjectId !== 'all') {
      filtered = filtered.filter((item) => item.projectId === selectedProjectId);
    }

    // 카테고리 필터
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // 태그 필터
    if (selectedTag !== 'all') {
      filtered = filtered.filter((item) => item.tags.includes(selectedTag));
    }

    // 검색
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.episodeName.toLowerCase().includes(query) ||
          item.experienceName.toLowerCase().includes(query) ||
          item.projectName.toLowerCase().includes(query) ||
          item.categoryLabel.toLowerCase().includes(query) ||
          (item.star?.situation?.toLowerCase().includes(query)) ||
          (item.star?.task?.toLowerCase().includes(query)) ||
          (item.star?.action?.toLowerCase().includes(query)) ||
          (item.star?.result?.toLowerCase().includes(query))
      );
    }

    setFilteredItems(filtered);
  }, [searchQuery, selectedCategory, selectedTag, selectedProjectId, archiveItems, activeTab, projects]);

  const handleStartEdit = async (item: ArchiveItem) => {
    // 에피소드가 없는 경우 (episodeName이 '-'인 경우) 편집 불가
    if (item.episodeName === '-' || !item.episodeName || item.episodeName.trim() === '') {
      toast.error('에피소드가 없습니다. 먼저 마인드맵에서 에피소드를 생성해주세요.', {
        description: '마인드맵 페이지로 이동하여 에피소드를 추가한 후 다시 시도해주세요.',
        action: {
          label: '마인드맵으로 이동',
          onClick: () => router.push(`/mindmap?projectId=${item.projectId}`),
        },
        duration: 5000,
      });
      return;
    }
    
    // 경험 노드 ID 찾기
    const project = await mindMapProjectStorage.get(item.projectId);
    let experienceNodeId: string | null = null;
    
    if (project) {
      // 에피소드 노드 ID 추출 (item.id 형식: projectId_episodeNodeId)
      const firstUnderscoreIndex = item.id.indexOf('_');
      const episodeNodeId = firstUnderscoreIndex !== -1 ? item.id.substring(firstUnderscoreIndex + 1) : null;
      
      if (episodeNodeId) {
        const episodeNode = project.nodes.find(n => n.id === episodeNodeId);
        if (episodeNode && episodeNode.parentId) {
          experienceNodeId = episodeNode.parentId;
        }
      }
    }
    
    setEditingItemId(item.id);
    setEditingExperienceNodeId(experienceNodeId);
    setEditFormData({
      situation: item.star?.situation || '',
      task: item.star?.task || '',
      action: item.star?.action || '',
      result: item.star?.result || '',
      // readonly string[]을 string[]로 변환 (스프레드 연산자 사용)
      tags: item.star?.tags ? [...item.star.tags] : item.tags || [],
      startDate: item.experienceStartDate || null,
      endDate: item.experienceEndDate || null,
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingExperienceNodeId(null);
    setEditFormData(null);
  };

  const handleSaveEdit = async (item: ArchiveItem) => {
    if (!editFormData) return;

    try {
      // item.id 형식: projectId_nodeId
      // 하지만 노드 ID 자체에 언더스코어가 있을 수 있으므로, 
      // 프로젝트 ID는 일반적으로 UUID 형식이므로 첫 번째 언더스코어 이후가 노드 ID
      const firstUnderscoreIndex = item.id.indexOf('_');
      if (firstUnderscoreIndex === -1 || firstUnderscoreIndex === item.id.length - 1) {
        console.error('Invalid item ID format:', item.id);
        toast.error('잘못된 노드 ID입니다.');
        return;
      }
      
      // 첫 번째 언더스코어 이후의 모든 부분이 노드 ID
      const episodeNodeId = item.id.substring(firstUnderscoreIndex + 1);
      
      if (!episodeNodeId || episodeNodeId.trim() === '') {
        console.error('Failed to extract node ID from item ID:', item.id);
        toast.error('노드 ID를 찾을 수 없습니다.');
        return;
      }
      
      // STAR 에셋 생성 또는 업데이트
      const existingAsset = await assetStorage.getByNodeId(episodeNodeId);
    
    const content = [
      editFormData.situation && `상황(Situation): ${editFormData.situation}`,
      editFormData.task && `과제(Task): ${editFormData.task}`,
      editFormData.action && `행동(Action): ${editFormData.action}`,
      editFormData.result && `결과(Result): ${editFormData.result}`,
    ].filter(Boolean).join('\n\n');

    // 기존 asset이 있으면 업데이트, 없으면 추가
    if (existingAsset) {
        // 업데이트할 필드만 명시적으로 전달 (nodeId 포함 필요)
      await assetStorage.update(existingAsset.id, {
          nodeId: episodeNodeId, // nodeId를 포함하여 전달
        title: item.episodeName,
        situation: editFormData.situation,
        task: editFormData.task,
        action: editFormData.action,
        result: editFormData.result,
        content: content,
        tags: editFormData.tags, // 태그 배열 전체를 업데이트
      });
    } else {
      // 새 asset 추가
      const starAsset: STARAsset = {
        id: `asset_${Date.now()}`,
        nodeId: episodeNodeId,
        title: item.episodeName,
        situation: editFormData.situation,
        task: editFormData.task,
        action: editFormData.action,
        result: editFormData.result,
        content: content,
        tags: editFormData.tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await assetStorage.add(starAsset);
    }
    
    // 경험 노드의 기간 정보 업데이트
    if (editingExperienceNodeId && (editFormData.startDate !== null || editFormData.endDate !== null)) {
      await updateNode(item.projectId, editingExperienceNodeId, {
        startDate: editFormData.startDate,
        endDate: editFormData.endDate,
      });
    }
    
    // 저장 후 해당 노드의 STAR asset을 다시 가져와서 상태 업데이트
    const updatedStarAsset = await assetStorage.getByNodeId(episodeNodeId);
    
    // 해당 아이템의 STAR asset과 기간 정보를 직접 업데이트
    setArchiveItems(prevItems => {
      return prevItems.map(prevItem => {
        if (prevItem.id === item.id) {
          return {
            ...prevItem,
            star: updatedStarAsset || null,
            // readonly string[]을 string[]로 변환 (스프레드 연산자 사용)
            tags: updatedStarAsset?.tags ? [...updatedStarAsset.tags] : [],
            experienceStartDate: editFormData.startDate,
            experienceEndDate: editFormData.endDate,
          };
        }
        return prevItem;
      });
    });
    
    // 필터링된 아이템도 업데이트
    setFilteredItems(prevItems => {
      return prevItems.map(prevItem => {
        if (prevItem.id === item.id) {
          return {
            ...prevItem,
            star: updatedStarAsset || null,
            // readonly string[]을 string[]로 변환 (스프레드 연산자 사용)
            tags: updatedStarAsset?.tags ? [...updatedStarAsset.tags] : [],
          };
        }
        return prevItem;
      });
    });
    
    // 태그 목록도 업데이트 (새 태그가 추가된 경우)
    if (updatedStarAsset?.tags && updatedStarAsset.tags.length > 0) {
      setAllTags(prevTags => {
        const newTags = new Set([...prevTags, ...updatedStarAsset!.tags!]);
        return Array.from(newTags).sort();
      });
    }
    
    // 편집 모드 종료
    setEditingItemId(null);
    setEditFormData(null);
    
    toast.success('저장되었습니다');
    } catch (error) {
      console.error('Failed to save STAR asset:', error);
      toast.error('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleToggleTag = (tag: string) => {
    if (!editFormData) return;
    
    setEditFormData({
      ...editFormData,
      tags: editFormData.tags.includes(tag)
        ? editFormData.tags.filter(t => t !== tag)
        : [...editFormData.tags, tag],
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-[#a0a0a0]">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
      {/* 플로팅 헤더 */}
      <FloatingHeader />

      {/* 메인 컨텐츠 */}
      <div className="flex-1 px-5 pt-32 pb-12 max-w-7xl mx-auto w-full">
        {/* Sticky 헤더 영역 */}
        <div className="sticky top-[64px] z-40 bg-white dark:bg-[#0a0a0a] -mx-5 px-5 pt-4 pb-4 mb-6 border-b border-gray-200 dark:border-[#2a2a2a]">
          {/* 페이지 헤더 */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-2">에피소드 보관함</h1>
            <p className="text-gray-600 dark:text-[#a0a0a0] mb-4">모든 경험을 STAR 기법으로 정리하여 확인하세요</p>
            
            {/* 탭 */}
            <div className="border-b border-gray-200 dark:border-[#2a2a2a] -mx-5 px-5">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'personal' | 'collaborative')}>
                <TabsList className="bg-transparent rounded-none p-0 h-auto w-auto justify-start">
                  <TabsTrigger 
                    value="all" 
                    className="px-4 py-3 text-base font-medium data-[state=active]:border-b-2 data-[state=active]:border-[#5B6EFF] data-[state=active]:text-[#5B6EFF] dark:data-[state=active]:text-[#7B8FFF] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-0 border-b-2 border-transparent shadow-none text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5]"
                  >
                    전체
                  </TabsTrigger>
                  <TabsTrigger 
                    value="personal"
                    className="px-4 py-3 text-base font-medium data-[state=active]:border-b-2 data-[state=active]:border-[#5B6EFF] data-[state=active]:text-[#5B6EFF] dark:data-[state=active]:text-[#7B8FFF] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-0 border-b-2 border-transparent shadow-none text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5]"
                  >
                    개인 마인드맵
                  </TabsTrigger>
                  <TabsTrigger 
                    value="collaborative"
                    className="px-4 py-3 text-base font-medium data-[state=active]:border-b-2 data-[state=active]:border-[#5B6EFF] data-[state=active]:text-[#5B6EFF] dark:data-[state=active]:text-[#7B8FFF] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-0 border-b-2 border-transparent shadow-none text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5]"
                  >
                    팀 마인드맵
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="space-y-4 mb-4">
            {/* 검색바 */}
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 dark:text-[#606060] absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="에피소드, 경험, STAR 내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-[12px] border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-[#e5e5e5] placeholder-gray-500 dark:placeholder-[#606060] focus:border-blue-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50"
              />
            </div>

            {/* 필터 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* 프로젝트 선택 드롭다운 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 px-4 rounded-full border-2 justify-between ${
                      selectedProjectId !== 'all'
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-[#60A5FA] text-blue-700 dark:text-[#60A5FA]'
                        : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] text-gray-900 dark:text-[#e5e5e5] hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <span className="font-semibold text-sm">
                      {selectedProjectId === 'all'
                        ? '전체 마인드맵'
                        : projects.find(p => p.id === selectedProjectId)?.name || '마인드맵 선택'}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] max-h-[400px] overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => {
                      console.log('[archive/page] 전체 마인드맵 선택');
                      setSelectedProjectId('all');
                    }}
                    className={`cursor-pointer ${
                      selectedProjectId === 'all' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <span className="font-semibold">전체 마인드맵</span>
                  </DropdownMenuItem>
                  {projects.length > 0 ? (
                    <>
                      <div className="h-px bg-gray-200 dark:bg-[#2a2a2a] my-1" />
                      {projects.map((project) => {
                        console.log('[archive/page] 드롭다운 프로젝트 렌더링', { projectId: project.id, projectName: project.name });
                        return (
                          <DropdownMenuItem
                            key={project.id}
                            onClick={() => {
                              console.log('[archive/page] 프로젝트 선택', { projectId: project.id, projectName: project.name });
                              setSelectedProjectId(project.id);
                            }}
                            className={`cursor-pointer ${
                              selectedProjectId === project.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                            }`}
                          >
                            <span className={selectedProjectId === project.id ? 'font-semibold' : ''}>
                              {project.name}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </>
                  ) : (
                    <DropdownMenuItem disabled className="text-gray-400 dark:text-[#606060]">
                      {isLoading ? '로딩 중...' : '프로젝트가 없습니다'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500 dark:text-[#a0a0a0]" />
                <span className="text-sm font-medium text-gray-700 dark:text-[#e5e5e5]">필터:</span>
              </div>

              {/* 카테고리 필터 */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="h-9 rounded-full"
                >
                  전체
                </Button>
                {Object.entries(BADGE_LABELS).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(key as BadgeType)}
                    className="h-9 rounded-full"
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {/* 태그 필터 */}
              {allTags.length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-200" />
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="h-9 px-4 rounded-full border border-gray-200 dark:border-[#2a2a2a] text-sm font-medium text-gray-700 dark:text-[#e5e5e5] bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                  >
                    <option value="all">모든 역량</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </>
              )}

            </div>
          </div>

          {/* 결과 카운트 */}
          <div>
            <p className="text-sm text-gray-600 dark:text-[#a0a0a0]">
              총 <span className="font-semibold text-gray-900 dark:text-[#e5e5e5]">{filteredItems.length}</span>개의 에피소드
            </p>
          </div>
        </div>

        {/* 에피소드 테이블 */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-3">
              에피소드가 없습니다
            </h2>
            <p className="text-gray-600 dark:text-[#a0a0a0] mb-8">
              마인드맵에서 경험과 에피소드를 추가하고 STAR 기법으로 정리해보세요
            </p>
            <Button
              onClick={() => router.push('/badge-selection')}
              className="bg-gray-900 dark:bg-[#1e3a8a] hover:bg-gray-800 dark:hover:bg-[#1e40af] text-white font-semibold h-12 px-6 rounded-[12px] shadow-sm"
            >
              마인드맵 작성하기
            </Button>
          </div>
        ) : editingItemId && editFormData ? (
          // 편집 뷰: 왼쪽 에피소드 목록, 중앙 STAR 입력, 오른쪽 강점/역량 + 저장/취소
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[16px] border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
            <div className="flex h-[600px]">
              {/* 왼쪽: 에피소드 목록 (프로젝트별 그룹화) */}
              <div className="w-64 border-r border-gray-200 dark:border-[#2a2a2a] overflow-y-auto bg-gray-50 dark:bg-[#0a0a0a]">
                <div className="p-4 border-b border-gray-200 dark:border-[#2a2a2a]">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">에피소드</h3>
                </div>
                <div className="p-2">
                  {(() => {
                    // 프로젝트별로 그룹화
                    const groupedByProject = filteredItems.reduce((acc, item) => {
                      if (!acc[item.projectId]) {
                        acc[item.projectId] = [];
                      }
                      acc[item.projectId].push(item);
                      return acc;
                    }, {} as Record<string, ArchiveItem[]>);
                      
                    return Object.entries(groupedByProject).map(([projectId, items]) => {
                      const project = projects.find(p => p.id === projectId);
                      return (
                        <div key={projectId} className="mb-4">
                          <div className="px-2 py-2 mb-2">
                            <h4 className="text-xs font-semibold text-gray-700 dark:text-[#a0a0a0] uppercase">
                              {project?.name || '알 수 없음'}
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {items.map((item) => {
                              const isSelected = editingItemId === item.id;
                              return (
                                <div
                          key={item.id}
                                  onClick={() => {
                                    if (item.episodeName !== '-' && item.episodeName && item.episodeName.trim() !== '') {
                                      handleStartEdit(item);
                                    }
                                  }}
                                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-[#5B6EFF] text-white border-2 border-white'
                                      : 'bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
                                  } ${item.episodeName === '-' || !item.episodeName || item.episodeName.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                  <div className={`text-xs font-medium mb-1 ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-[#a0a0a0]'}`}>
                                    {item.categoryLabel !== '-' ? (
                                      <Badge className={`${BADGE_COLORS[item.category]} border text-xs`}>
                                {item.categoryLabel}
                              </Badge>
                                    ) : null}
                                  </div>
                                  <div className={`text-sm font-semibold mb-1 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-[#e5e5e5]'}`}>
                                    {item.experienceName !== '-' ? item.experienceName : item.projectName}
                                  </div>
                                  <div className={`text-xs line-clamp-2 ${isSelected ? 'text-white/90' : 'text-gray-600 dark:text-[#a0a0a0]'}`}>
                                    {item.episodeName !== '-' ? item.episodeName : '에피소드 없음'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* 중앙: STAR 입력 필드 */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {/* 기간 입력 */}
                                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] mb-2 block">기간</label>
                    <DateRangePicker
                      startDate={editFormData.startDate}
                      endDate={editFormData.endDate}
                      onDateChange={(startDate, endDate) => {
                        setEditFormData({ ...editFormData, startDate, endDate });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] mb-2 block">SITUATION</label>
                                    <Textarea
                                      value={editFormData.situation}
                                      onChange={(e) => setEditFormData({ ...editFormData, situation: e.target.value })}
                      className="min-h-[120px] text-sm bg-gray-50 dark:bg-[#0a0a0a] border-gray-300 dark:border-[#404040] text-gray-900 dark:text-[#e5e5e5] resize-none"
                                      placeholder="상황을 입력하세요"
                                    />
                                  </div>
                                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] mb-2 block">TASK</label>
                                    <Textarea
                                      value={editFormData.task}
                                      onChange={(e) => setEditFormData({ ...editFormData, task: e.target.value })}
                      className="min-h-[120px] text-sm bg-gray-50 dark:bg-[#0a0a0a] border-gray-300 dark:border-[#404040] text-gray-900 dark:text-[#e5e5e5] resize-none"
                                      placeholder="과제를 입력하세요"
                                    />
                                  </div>
                                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] mb-2 block">ACTION</label>
                                    <Textarea
                                      value={editFormData.action}
                                      onChange={(e) => setEditFormData({ ...editFormData, action: e.target.value })}
                      className="min-h-[120px] text-sm bg-gray-50 dark:bg-[#0a0a0a] border-gray-300 dark:border-[#404040] text-gray-900 dark:text-[#e5e5e5] resize-none"
                                      placeholder="행동을 입력하세요"
                                    />
                                  </div>
                                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] mb-2 block">RESULT</label>
                                    <Textarea
                                      value={editFormData.result}
                                      onChange={(e) => setEditFormData({ ...editFormData, result: e.target.value })}
                      className="min-h-[120px] text-sm bg-gray-50 dark:bg-[#0a0a0a] border-gray-300 dark:border-[#404040] text-gray-900 dark:text-[#e5e5e5] resize-none"
                                      placeholder="결과를 입력하세요"
                                    />
                                  </div>
                                </div>
              </div>

              {/* 오른쪽: 강점/역량 + 저장/취소 */}
              <div className="w-64 border-l border-gray-200 dark:border-[#2a2a2a] flex flex-col bg-gray-50 dark:bg-[#0a0a0a]">
                <div className="p-4 border-b border-gray-200 dark:border-[#2a2a2a]">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">강점/역량</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2 mb-4">
                    {editFormData.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {editFormData.tags.map((tag) => (
                                      <Badge
                            key={tag}
                            variant="outline"
                            className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-[#60A5FA] border-blue-200 dark:border-blue-600 text-xs cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50"
                            onClick={() => handleToggleTag(tag)}
                                      >
                            {tag}
                                      </Badge>
                                    ))}
                                  </div>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTagDialog(true)}
                      className="w-full h-10 bg-gray-200 dark:bg-[#2a2a2a] hover:bg-gray-300 dark:hover:bg-[#404040] text-gray-700 dark:text-[#e5e5e5] border-gray-300 dark:border-[#404040]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      태그 추가
                    </Button>
                                </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-[#2a2a2a] space-y-2">
                                  <Button
                                    size="sm"
                    onClick={() => {
                      const currentItem = filteredItems.find(item => item.id === editingItemId);
                      if (currentItem) {
                        handleSaveEdit(currentItem);
                      }
                    }}
                    className="w-full bg-[#5B6EFF] hover:bg-[#4B5EEF] text-white h-10"
                                  >
                                    저장
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                    className="w-full h-10"
                                  >
                                    취소
                                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 표시 뷰: 프로젝트별로 제목과 테이블 분리
          <div className="space-y-8">
            {(() => {
              // 프로젝트별로 그룹화
              const groupedByProject = filteredItems.reduce((acc, item) => {
                if (!acc[item.projectId]) {
                  acc[item.projectId] = [];
                }
                acc[item.projectId].push(item);
                return acc;
              }, {} as Record<string, ArchiveItem[]>);

              return Object.entries(groupedByProject).map(([projectId, items]) => {
                const project = projects.find(p => p.id === projectId);
                return (
                  <div key={projectId} className="space-y-4">
                    {/* 프로젝트 제목 */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-[#e5e5e5]">
                        {project?.name || '알 수 없음'}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/mindmap?projectId=${projectId}`)}
                        className="text-sm text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5]"
                      >
                        마인드맵 열기
                      </Button>
                    </div>

                    {/* 프로젝트별 테이블 */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[16px] border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-[#2a2a2a]">
                            <tr>
                              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] w-[200px]">
                                에피소드
                              </th>
                              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] w-[140px]">
                                기간
                              </th>
                              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">
                                SITUATION
                              </th>
                              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">
                                TASK
                              </th>
                              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">
                                ACTION
                              </th>
                              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">
                                RESULT
                              </th>
                              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] w-[150px]">
                                강점/역량
                              </th>
                              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] w-[80px]">
                                작업
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                            {items.map((item) => {
                              const isEditable = item.episodeName !== '-' && item.episodeName && item.episodeName.trim() !== '';
                              return (
                                <tr
                                  key={item.id}
                                  className={`hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors ${
                                    isEditable ? 'cursor-pointer' : ''
                                  }`}
                                  onClick={() => {
                                    if (isEditable) {
                                      handleStartEdit(item);
                                    }
                                  }}
                                >
                                  {/* 에피소드 카드 */}
                                  <td className="px-4 py-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        {item.categoryLabel !== '-' && (
                                          <Badge className={`${BADGE_COLORS[item.category]} border text-xs`}>
                                            {item.categoryLabel}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] mb-1">
                                        {item.experienceName !== '-' ? item.experienceName : item.projectName}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-[#a0a0a0] line-clamp-2">
                                        {item.episodeName !== '-' ? item.episodeName : '에피소드 없음'}
                                      </div>
                                </div>
                              </td>

                                  {/* 기간 */}
                                  <td className="px-4 py-4">
                                    <div className="text-xs text-gray-600 dark:text-[#a0a0a0]">
                                      {item.experienceStartDate && item.experienceEndDate ? (
                                        `${format(new Date(item.experienceStartDate), 'yyyy.MM.dd', { locale: ko })} - ${format(new Date(item.experienceEndDate), 'yyyy.MM.dd', { locale: ko })}`
                                      ) : item.experienceStartDate ? (
                                        `${format(new Date(item.experienceStartDate), 'yyyy.MM.dd', { locale: ko })} - 진행중`
                                      ) : (
                                        '-'
                                      )}
                                    </div>
                                  </td>

                                  {/* SITUATION */}
                                  <td className="px-4 py-4">
                                    <div className="min-h-[40px] flex items-start">
                                {item.star?.situation ? (
                                        <div className="text-sm text-gray-700 dark:text-[#e5e5e5] line-clamp-3" title={item.star.situation}>
                                    {item.star.situation}
                                  </div>
                                ) : (
                                        <span className="text-xs text-gray-400 dark:text-[#606060]">s</span>
                                )}
                                    </div>
                              </td>

                                  {/* TASK */}
                                  <td className="px-4 py-4">
                                    <div className="min-h-[40px] flex items-start">
                                {item.star?.task ? (
                                        <div className="text-sm text-gray-700 dark:text-[#e5e5e5] line-clamp-3" title={item.star.task}>
                                    {item.star.task}
                                  </div>
                                ) : (
                                        <span className="text-xs text-gray-400 dark:text-[#606060]">t</span>
                                )}
                                    </div>
                              </td>

                                  {/* ACTION */}
                                  <td className="px-4 py-4">
                                    <div className="min-h-[40px] flex items-start">
                                {item.star?.action ? (
                                        <div className="text-sm text-gray-700 dark:text-[#e5e5e5] line-clamp-3" title={item.star.action}>
                                    {item.star.action}
                                  </div>
                                ) : (
                                        <span className="text-xs text-gray-400 dark:text-[#606060]">a</span>
                                )}
                                    </div>
                              </td>

                                  {/* RESULT */}
                                  <td className="px-4 py-4">
                                    <div className="min-h-[40px] flex items-start">
                                {item.star?.result ? (
                                        <div className="text-sm text-gray-700 dark:text-[#e5e5e5] line-clamp-3" title={item.star.result}>
                                    {item.star.result}
                                  </div>
                                ) : (
                                        <span className="text-xs text-gray-400 dark:text-[#606060]">r</span>
                                )}
                                    </div>
                              </td>

                                  {/* 강점/역량 */}
                              <td className="px-4 py-4">
                                    <div className="min-h-[40px]">
                                  {item.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {item.tags.map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-[#60A5FA] border-blue-200 dark:border-blue-600 text-xs"
                                      >
                                        {tag}
                                      </Badge>
                                          ))}
                                        </div>
                                  ) : (
                                        <span className="text-xs text-gray-400 dark:text-[#606060]">강점/역량</span>
                                  )}
                                </div>
                              </td>

                              {/* 편집 버튼 */}
                              <td className="px-4 py-4 text-center">
                                    {isEditable ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(item);
                                        }}
                                    className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-[#2a2a2a]"
                                  >
                                    <Edit className="h-4 w-4 text-gray-600 dark:text-[#a0a0a0]" />
                                  </Button>
                                    ) : (
                                      <span className="text-xs text-gray-400 dark:text-[#606060]">-</span>
                                )}
                              </td>
                        </tr>
                      );
                            })}
                </tbody>
              </table>
            </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* 태그 선택 다이얼로그 */}
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>추가할 태그를 선택하세요</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {COMPETENCY_KEYWORDS.map((keyword) => (
                <button
                  key={keyword}
                  onClick={() => {
                    if (editFormData) {
                      handleToggleTag(keyword);
                    }
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    editFormData?.tags.includes(keyword)
                      ? 'bg-[#5B6EFF] text-white border-[#5B6EFF]'
                      : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-[#e5e5e5] hover:border-[#5B6EFF] hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  {keyword}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTagDialog(false)}
              >
                닫기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

