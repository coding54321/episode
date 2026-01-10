'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mindMapProjectStorage, userStorage, assetStorage } from '@/lib/storage';
import { ArchiveItem, BadgeType, STARAsset, MindMapNode, MindMapProject, COMPETENCY_KEYWORDS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Filter, Download, Edit, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import FloatingHeader from '@/components/FloatingHeader';

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
  intern: 'bg-blue-50 text-blue-700 border-blue-200',
  academic: 'bg-purple-50 text-purple-700 border-purple-200',
  club: 'bg-green-50 text-green-700 border-green-200',
  project: 'bg-orange-50 text-orange-700 border-orange-200',
  parttime: 'bg-pink-50 text-pink-700 border-pink-200',
  volunteer: 'bg-teal-50 text-teal-700 border-teal-200',
  competition: 'bg-red-50 text-red-700 border-red-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function ArchivePage() {
  const router = useRouter();
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BadgeType | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    situation: string;
    task: string;
    action: string;
    result: string;
    tags: string[];
  } | null>(null);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      // 로그인 확인
      const user = await userStorage.load();
      if (!user) {
        router.push('/login');
        return;
      }

      await loadArchiveData();
    };

    checkAuthAndLoad();
  }, [router]);

  const loadArchiveData = async () => {
    const projects = await mindMapProjectStorage.load();
    const items: ArchiveItem[] = [];
    const tagsSet = new Set<string>();

    for (const project of projects) {
      // 중심 노드만 있는 경우 (레벨 0만 있는 경우)
      const centerNode = project.nodes.find(n => n.level === 0);
      if (!centerNode) continue;

      // 노드를 레벨별로 그룹화
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
        // '기타'인 경우 customLabel 사용, 없으면 label 사용
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
            // 해당 에피소드의 STAR 에셋 찾기 (없어도 표시)
            const starAsset = await assetStorage.getByNodeId(episodeNode.id);
            const tags = starAsset?.tags || [];
            
            // 태그 수집
            tags.forEach(tag => tagsSet.add(tag));
            
            // STAR 데이터가 없어도 에피소드는 표에 표시
            items.push({
              id: `${project.id}_${episodeNode.id}`,
              projectId: project.id,
              projectName: project.name,
              category: badgeType,
              categoryLabel: categoryLabel,
              experienceName: typeof experienceNode.label === 'string' ? experienceNode.label : '',
              episodeName: typeof episodeNode.label === 'string' ? episodeNode.label : '',
              star: starAsset || null, // STAR가 없으면 null
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

    setArchiveItems(items);
    setFilteredItems(items);
    setAllTags(Array.from(tagsSet).sort());
    setIsLoading(false);
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

  // 필터링 및 검색
  useEffect(() => {
    let filtered = [...archiveItems];

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
  }, [searchQuery, selectedCategory, selectedTag, archiveItems]);

  const handleStartEdit = (item: ArchiveItem) => {
    setEditingItemId(item.id);
    setEditFormData({
      situation: item.star?.situation || '',
      task: item.star?.task || '',
      action: item.star?.action || '',
      result: item.star?.result || '',
      tags: item.star?.tags || item.tags || [],
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditFormData(null);
  };

  const handleSaveEdit = async (item: ArchiveItem) => {
    if (!editFormData) return;

    const episodeNodeId = item.id.split('_')[1];
    
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
      // 업데이트할 필드만 명시적으로 전달
      await assetStorage.update(existingAsset.id, {
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
    
    // 편집 모드 먼저 종료
    setEditingItemId(null);
    setEditFormData(null);
    
    // 데이터 다시 로드 (약간의 딜레이를 주어 localStorage 동기화 보장)
    setTimeout(() => {
      loadArchiveData();
    }, 100);
    
    toast.success('저장되었습니다');
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 플로팅 헤더 */}
      <FloatingHeader />

      {/* 메인 컨텐츠 */}
      <div className="flex-1 px-5 pt-32 pb-12 max-w-7xl mx-auto w-full">
        {/* 페이지 헤더 */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">에피소드 아카이브</h1>
          <p className="text-gray-600">모든 경험을 STAR 기법으로 정리하여 확인하세요</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8 space-y-4">
          {/* 검색바 */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="에피소드, 경험, STAR 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-[12px] border-gray-200"
            />
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">필터:</span>
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
                  className="h-9 px-4 rounded-full border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            총 <span className="font-semibold text-gray-900">{filteredItems.length}</span>개의 에피소드
          </p>
        </div>

        {/* 에피소드 테이블 */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              에피소드가 없습니다
            </h2>
            <p className="text-gray-600 mb-8">
              마인드맵에서 경험과 에피소드를 추가하고 STAR 기법으로 정리해보세요
            </p>
            <Button
              onClick={() => router.push('/badge-selection')}
              className="bg-gray-900 hover:bg-gray-800 text-white font-semibold h-12 px-6 rounded-[12px] shadow-sm"
            >
              마인드맵 작성하기
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-[16px] border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[120px]">
                      프로젝트
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[100px]">
                      대분류
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[140px]">
                      경험
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[140px]">
                      에피소드
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Situation
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[150px]">
                      강점/역량
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-[80px]">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const rows: React.ReactElement[] = [];
                    let lastProject = '';
                    let lastCategory = '';
                    let lastExperience = '';
                    let projectRowSpan = 0;
                    let categoryRowSpan = 0;
                    let experienceRowSpan = 0;

                    // 프로젝트, 대분류, 경험별로 rowSpan 계산
                    const itemsWithSpan = filteredItems.map((item, index) => {
                      const projectKey = item.projectId; // 프로젝트 ID로 구분
                      const categoryKey = `${projectKey}_${item.categoryLabel}`;
                      const experienceKey = `${categoryKey}_${item.experienceName}`;
                      
                      return {
                        ...item,
                        projectKey,
                        categoryKey,
                        experienceKey,
                      };
                    });

                    itemsWithSpan.forEach((item, index) => {
                      const episodeNodeId = item.id.split('_')[1];
                      const isEditing = editingItemId === item.id;
                      
                      // rowSpan 계산
                      const showProject = item.projectKey !== lastProject;
                      const showCategory = item.categoryKey !== lastCategory;
                      const showExperience = item.experienceKey !== lastExperience;
                      
                      if (showProject) {
                        projectRowSpan = itemsWithSpan.filter(i => i.projectKey === item.projectKey).length;
                        lastProject = item.projectKey;
                      }
                      if (showCategory) {
                        categoryRowSpan = itemsWithSpan.filter(i => i.categoryKey === item.categoryKey).length;
                        lastCategory = item.categoryKey;
                      }
                      if (showExperience) {
                        experienceRowSpan = itemsWithSpan.filter(i => i.experienceKey === item.experienceKey).length;
                        lastExperience = item.experienceKey;
                      }

                      rows.push(
                        <tr
                          key={item.id}
                          className={`${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}
                        >
                          {/* 프로젝트 (병합) */}
                          {showProject && (
                            <td
                              rowSpan={projectRowSpan}
                              className="px-4 py-4 text-sm text-gray-900 font-medium border-r border-gray-200 bg-gray-50/50 align-top cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => router.push(`/mindmap/${item.projectId}`)}
                              title="클릭하여 마인드맵으로 이동"
                            >
                              <div className="flex items-center gap-2">
                                <span className="hover:text-blue-600 transition-colors">
                                  {item.projectName}
                                </span>
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </div>
                            </td>
                          )}

                          {/* 대분류 (병합) */}
                          {showCategory && (
                            <td
                              rowSpan={categoryRowSpan}
                              className="px-4 py-4 border-r border-gray-200 bg-gray-50/30 align-top"
                            >
                              <Badge
                                className={`${BADGE_COLORS[item.category]} border font-medium text-xs`}
                              >
                                {item.categoryLabel}
                              </Badge>
                            </td>
                          )}

                          {/* 경험 (병합) */}
                          {showExperience && (
                            <td
                              rowSpan={experienceRowSpan}
                              className="px-4 py-4 text-sm text-gray-700 border-r border-gray-200 align-top"
                            >
                              {item.experienceName}
                            </td>
                          )}

                          {/* 에피소드 */}
                          <td className="px-4 py-4 text-sm text-gray-900 font-medium border-r border-gray-200">
                            {item.episodeName}
                          </td>

                          {/* STAR 항목들 - 편집 모드에 따라 다르게 표시 */}
                          {isEditing && editFormData ? (
                            <>
                              {/* Situation */}
                              <td className="px-4 py-4" colSpan={4}>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Situation</label>
                                    <Textarea
                                      value={editFormData.situation}
                                      onChange={(e) => setEditFormData({ ...editFormData, situation: e.target.value })}
                                      className="min-h-[60px] text-sm"
                                      placeholder="상황을 입력하세요"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Task</label>
                                    <Textarea
                                      value={editFormData.task}
                                      onChange={(e) => setEditFormData({ ...editFormData, task: e.target.value })}
                                      className="min-h-[60px] text-sm"
                                      placeholder="과제를 입력하세요"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Action</label>
                                    <Textarea
                                      value={editFormData.action}
                                      onChange={(e) => setEditFormData({ ...editFormData, action: e.target.value })}
                                      className="min-h-[60px] text-sm"
                                      placeholder="행동을 입력하세요"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Result</label>
                                    <Textarea
                                      value={editFormData.result}
                                      onChange={(e) => setEditFormData({ ...editFormData, result: e.target.value })}
                                      className="min-h-[60px] text-sm"
                                      placeholder="결과를 입력하세요"
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* 역량 태그 편집 */}
                              <td className="px-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-gray-700 block">역량 선택</label>
                                  <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                                    {COMPETENCY_KEYWORDS.map((keyword) => (
                                      <Badge
                                        key={keyword}
                                        variant={editFormData.tags.includes(keyword) ? "default" : "outline"}
                                        className={`cursor-pointer transition-all text-xs ${
                                          editFormData.tags.includes(keyword)
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'hover:bg-gray-100'
                                        }`}
                                        onClick={() => handleToggleTag(keyword)}
                                      >
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </td>

                              {/* 저장/취소 버튼 */}
                              <td className="px-4 py-4 text-center">
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(item)}
                                    className="bg-blue-600 hover:bg-blue-700 h-8"
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    저장
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="h-8"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    취소
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              {/* Situation */}
                              <td className="px-4 py-4 text-sm text-gray-700 max-w-[200px]">
                                {item.star?.situation ? (
                                  <div className="line-clamp-3" title={item.star.situation}>
                                    {item.star.situation}
                                  </div>
                                ) : (
                                  <div className="h-5 flex items-center">
                                    <span className="text-gray-300 text-xs">-</span>
                                  </div>
                                )}
                              </td>

                              {/* Task */}
                              <td className="px-4 py-4 text-sm text-gray-700 max-w-[200px]">
                                {item.star?.task ? (
                                  <div className="line-clamp-3" title={item.star.task}>
                                    {item.star.task}
                                  </div>
                                ) : (
                                  <div className="h-5 flex items-center">
                                    <span className="text-gray-300 text-xs">-</span>
                                  </div>
                                )}
                              </td>

                              {/* Action */}
                              <td className="px-4 py-4 text-sm text-gray-700 max-w-[200px]">
                                {item.star?.action ? (
                                  <div className="line-clamp-3" title={item.star.action}>
                                    {item.star.action}
                                  </div>
                                ) : (
                                  <div className="h-5 flex items-center">
                                    <span className="text-gray-300 text-xs">-</span>
                                  </div>
                                )}
                              </td>

                              {/* Result */}
                              <td className="px-4 py-4 text-sm text-gray-700 max-w-[200px]">
                                {item.star?.result ? (
                                  <div className="line-clamp-3" title={item.star.result}>
                                    {item.star.result}
                                  </div>
                                ) : (
                                  <div className="h-5 flex items-center">
                                    <span className="text-gray-300 text-xs">-</span>
                                  </div>
                                )}
                              </td>

                              {/* 강점/역량 태그 */}
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-1 min-h-[20px]">
                                  {item.tags.length > 0 ? (
                                    item.tags.map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                                      >
                                        {tag}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-gray-300 text-xs">-</span>
                                  )}
                                </div>
                              </td>

                              {/* 편집 버튼 */}
                              <td className="px-4 py-4 text-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEdit(item)}
                                  className="h-8 w-8 p-0 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4 text-gray-600" />
                                </Button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });

                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

