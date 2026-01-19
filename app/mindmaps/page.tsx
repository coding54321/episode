'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MindMapProject } from '@/types';
import { mindMapProjectStorage, currentProjectStorage } from '@/lib/storage';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Edit2, ChevronRight, Check, X, FolderOpen, Star, Square, CheckSquare2, Users, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import FloatingHeader from '@/components/FloatingHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MindMapsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth(); // 전역 상태에서 사용자 정보 가져오기
  const [projects, setProjects] = useState<MindMapProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'shared'>('all');

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) {
      return;
    }

    const loadData = async () => {
      // 로그인 확인 (전역 상태 사용)
      if (!user) {
        router.push('/login');
        return;
      }

      // 프로젝트 로드
      const savedProjects = await mindMapProjectStorage.load();
      setProjects(savedProjects);
      setIsLoading(false);
    };

    loadData();
  }, [router, user, authLoading]);

  const handleDelete = async (projectId: string) => {
    if (confirm('정말 이 마인드맵을 삭제하시겠습니까?')) {
      await mindMapProjectStorage.delete(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // 현재 프로젝트가 삭제된 경우 첫 번째 프로젝트 선택
      const currentId = currentProjectStorage.load();
      if (currentId === projectId) {
        const remaining = projects.filter(p => p.id !== projectId);
        if (remaining.length > 0) {
          currentProjectStorage.save(remaining[0].id);
        } else {
          currentProjectStorage.clear();
        }
      }
    }
  };

  // 탭에 따라 프로젝트 필터링
  const getFilteredProjects = (): MindMapProject[] => {
    switch (activeTab) {
      case 'personal':
        return projects.filter(p => p.projectType === 'personal');
      case 'shared':
        return projects.filter(p => p.projectType === 'collaborative');
      case 'all':
      default:
        return projects;
    }
  };

  const handleCreateNew = () => {
    router.push('/project-type-selection');
  };

  const handleEditStart = (project: MindMapProject, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditedTitle(project.name);
  };

  const handleEditSave = async (projectId: string) => {
    if (!editedTitle.trim()) {
      setEditingProjectId(null);
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (project) {
      // 이름만 업데이트 (nodes는 제외하여 불필요한 saveNodes 호출 방지)
      const updates = {
        name: editedTitle.trim(),
        updatedAt: Date.now(),
      };
      await mindMapProjectStorage.update(projectId, updates);
      
      // UI 업데이트
      const updatedProject: MindMapProject = {
        ...project,
        ...updates,
      };
      setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    }
    setEditingProjectId(null);
  };

  const handleEditCancel = () => {
    setEditingProjectId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, projectId: string) => {
    if (e.key === 'Enter') {
      handleEditSave(projectId);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleToggleFavorite = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const project = projects.find(p => p.id === projectId);
    if (project) {
      // 즐겨찾기만 업데이트 (nodes는 제외하여 불필요한 saveNodes 호출 방지)
      const updates = {
        isFavorite: !project.isFavorite,
        updatedAt: Date.now(),
      };
      await mindMapProjectStorage.update(projectId, updates);
      
      // UI 업데이트
      const updatedProject: MindMapProject = {
        ...project,
        ...updates,
      };
      setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    }
  };

  const formatRelativeTime = (timestamp: number, isCreated: boolean = false) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    const prefix = isCreated ? '생성' : '수정';
    const suffix = isCreated ? '생성됨' : '수정됨';

    if (seconds < 60) {
      return `방금 ${suffix}`;
    } else if (minutes < 60) {
      return `${minutes}분 전 ${suffix}`;
    } else if (hours < 24) {
      return `${hours}시간 전 ${suffix}`;
    } else if (days < 7) {
      return `${days}일 전 ${suffix}`;
    } else if (weeks < 4) {
      return `${weeks}주 전 ${suffix}`;
    } else {
      // 4주 이상이면 절대 날짜 표시
      return new Date(timestamp).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
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
      {/* 플로팅 헤더 */}
      <FloatingHeader />
      
      {/* 메인 컨텐츠 */}
      <div className="flex-1 px-5 pt-32 pb-12 max-w-7xl mx-auto w-full">
        {/* 페이지 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">마인드맵</h1>
          <p className="text-gray-600 mb-6">경험을 구조화하고 관리하세요</p>
          
          {/* 탭 */}
          <div className="border-b border-gray-200 -mx-5 px-5">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'personal' | 'shared')}>
              <TabsList className="bg-transparent rounded-none p-0 h-auto w-auto justify-start">
                <TabsTrigger 
                  value="all" 
                  className="px-4 py-3 text-base font-medium data-[state=active]:border-b-2 data-[state=active]:border-[#5B6EFF] data-[state=active]:text-[#5B6EFF] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-0 border-b-2 border-transparent shadow-none text-gray-600 hover:text-gray-900"
                >
                  전체
                </TabsTrigger>
                <TabsTrigger 
                  value="personal"
                  className="px-4 py-3 text-base font-medium data-[state=active]:border-b-2 data-[state=active]:border-[#5B6EFF] data-[state=active]:text-[#5B6EFF] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-0 border-b-2 border-transparent shadow-none text-gray-600 hover:text-gray-900"
                >
                  개인 마인드맵
                </TabsTrigger>
                <TabsTrigger 
                  value="shared"
                  className="px-4 py-3 text-base font-medium data-[state=active]:border-b-2 data-[state=active]:border-[#5B6EFF] data-[state=active]:text-[#5B6EFF] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-0 border-b-2 border-transparent shadow-none text-gray-600 hover:text-gray-900"
                >
                  팀 마인드맵
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        {getFilteredProjects().length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              아직 마인드맵이 없어요
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              첫 번째 마인드맵을 만들어보세요
            </p>
            <Button
              onClick={handleCreateNew}
              className="h-14 px-8 bg-[#5B6EFF] hover:bg-[#4B5EEF] text-white font-semibold text-base rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              마인드맵 만들기
            </Button>
          </motion.div>
        ) : (
          <>
            {/* 새 마인드맵 버튼 */}
            <div className="mb-8">
              <Button
                onClick={handleCreateNew}
                className="h-12 px-6 bg-[#5B6EFF] hover:bg-[#4B5EEF] text-white font-semibold rounded-[12px] shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-5 w-5 mr-2" />
                새 마인드맵
              </Button>
            </div>
            {/* 프로젝트 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...getFilteredProjects()].sort((a, b) => {
                // 즐겨찾기 우선 정렬
                if (a.isFavorite && !b.isFavorite) return -1;
                if (!a.isFavorite && b.isFavorite) return 1;
                // 그 다음 최신순
                return b.updatedAt - a.updatedAt;
              }).map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="h-full"
                >
                  <Card className="h-full p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 rounded-[20px] group bg-white flex flex-col card-hover">
                    <Link href={`/mindmap?projectId=${project.id}`} className="flex-1 flex flex-col">
                      <div className="mb-5 flex-1">
                        {editingProjectId === project.id ? (
                          <div className="flex items-center gap-2 mb-3" onClick={(e) => e.preventDefault()}>
                            <input
                              type="text"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              onKeyDown={(e) => handleEditKeyDown(e, project.id)}
                              onBlur={() => handleEditSave(project.id)}
                              autoFocus
                              className="flex-1 text-xl font-bold text-gray-900 border-b-2 border-[#5B6EFF] bg-transparent focus:outline-none px-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSave(project.id)}
                              className="h-8 w-8 p-0 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 mb-3" onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditStart(project, e);
                          }}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button
                                onClick={(e) => handleToggleFavorite(project.id, e)}
                                className={`flex-shrink-0 p-1 rounded-lg transition-all duration-200 ${
                                  project.isFavorite
                                    ? 'text-yellow-500 hover:bg-yellow-50'
                                    : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-50'
                                }`}
                                title={project.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                              >
                                <Star 
                                  className={`h-5 w-5 transition-all duration-200 ${
                                    project.isFavorite ? 'fill-current' : ''
                                  }`}
                                />
                              </button>
                              <h3 className="flex-1 text-xl font-bold line-clamp-2 text-gray-900 leading-tight">
                                {project.name}
                              </h3>
                            </div>
                            {/* 메뉴 아이콘 - 이름과 같은 줄 오른쪽 끝 */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                                >
                                  <MoreVertical className="h-5 w-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditStart(project, e);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  이름 변경하기
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDelete(project.id);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  삭제하기
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      {/* 배지 */}
                      <div className="flex items-center gap-2 mb-5 flex-wrap">
                        {project.badges.slice(0, 3).map(badge => {
                          const badgeLabels: Record<string, string> = {
                            'intern': '인턴',
                            'academic': '학업',
                            'club': '동아리',
                            'project': '프로젝트',
                            'parttime': '아르바이트',
                            'volunteer': '봉사활동',
                            'competition': '공모전',
                            'other': '기타',
                          };
                          return (
                            <span
                              key={badge}
                              className="text-xs font-medium px-3 py-1.5 bg-[#5B6EFF]/10 text-[#4B5EEF] rounded-full"
                            >
                              {badgeLabels[badge] || badge}
                            </span>
                          );
                        })}
                        {project.badges.length > 3 && (
                          <span className="text-xs font-medium px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full">
                            +{project.badges.length - 3}
                          </span>
                        )}
                      </div>

                      {/* 메타 정보 */}
                      <div className="mt-auto space-y-2">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs">{formatRelativeTime(project.updatedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {project.isShared && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <Users className="h-3 w-3" />
                                공동 작업
                              </span>
                            )}
                            <span className="font-medium">
                              {project.nodeCount !== undefined ? project.nodeCount : project.nodes.length}개 노드
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

