'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { mindMapProjectStorage } from '@/lib/storage';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { MindMapProject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, FolderOpen, Clock, BarChart3, FileText, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import FloatingHeader from '@/components/FloatingHeader';
import Link from 'next/link';

export default function NewTabPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, loading: authLoading } = useUnifiedAuth();
  
  const [availableProjects, setAvailableProjects] = useState<MindMapProject[]>([]);
  const [recentProjects, setRecentProjects] = useState<MindMapProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const projectsList = await mindMapProjectStorage.load();
        // 현재 프로젝트 제외
        const filtered = projectsList.filter(p => p.id !== projectId);
        setAvailableProjects(filtered);
        
        // 최근 수정된 순으로 정렬하여 최근 10개만
        const sorted = [...filtered].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setRecentProjects(sorted.slice(0, 10));
      } catch (error) {
        console.error('Failed to load projects:', error);
        toast.error('프로젝트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [user, authLoading, projectId, router]);

  // 다른 프로젝트를 탭으로 열기
  const handleOpenProjectInTab = async (targetProjectId: string) => {
    try {
      // 프로젝트 정보 가져오기
      const targetProject = await mindMapProjectStorage.get(targetProjectId);
      if (!targetProject) {
        toast.error('프로젝트를 찾을 수 없습니다.');
        return;
      }

      // 해당 프로젝트 페이지로 이동 (탭은 자동으로 추가됨)
      router.push(`/mindmap/${targetProjectId}`);
    } catch (error) {
      console.error('Failed to open project:', error);
      toast.error('프로젝트를 열 수 없습니다.');
    }
  };

  // 새 마인드맵 만들기
  const handleCreateNewMindmap = () => {
    router.push('/project-type-selection');
  };

  // 빠른 액세스
  const handleQuickAccess = (path: string) => {
    router.push(path);
  };

  // 검색 필터링
  const filteredRecentProjects = recentProjects.filter(proj =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllProjects = availableProjects.filter(proj =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 시간 포맷팅
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes > 0 ? `${minutes}분 전` : '방금';
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-[#a0a0a0]">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-[#0a0a0a]">
      {/* 헤더 */}
      <FloatingHeader />
      
      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 상단 액션 버튼들 */}
          <div className="mb-8">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {/* 새 마인드맵 만들기 */}
              <button
                onClick={handleCreateNewMindmap}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-[#e5e5e5]">새 마인드맵</span>
              </button>

              {/* 공백 진단 */}
              <button
                onClick={() => handleQuickAccess('/gap-diagnosis-standalone')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-[#e5e5e5]">공백 진단</span>
              </button>

              {/* 에피소드 아카이브 */}
              <button
                onClick={() => handleQuickAccess('/archive')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-[#e5e5e5]">아카이브</span>
              </button>

              {/* 빈 공간 (추후 확장용) */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gray-100 dark:bg-[#0a0a0a] border border-transparent opacity-30">
                  <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-[#2a2a2a] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-[#606060]">준비 중</span>
                </div>
              ))}
            </div>
          </div>

          {/* 검색바 */}
          <div className="mb-8">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 dark:text-[#606060] absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="파일 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-xl border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-[#e5e5e5] placeholder-gray-500 dark:placeholder-[#606060] focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 text-base"
              />
            </div>
          </div>

          {/* 최근 파일 */}
          {filteredRecentProjects.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e5e5e5] mb-4">최근 파일</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecentProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleOpenProjectInTab(proj.id)}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <FolderOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] truncate mb-1">
                        {proj.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-[#a0a0a0] flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {proj.updatedAt ? formatTimeAgo(proj.updatedAt) : '알 수 없음'}
                        {proj.projectType === 'collaborative' && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            공동
                          </span>
                        )}
                        {proj.projectType === 'personal' && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                            개인
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 모든 마인드맵 */}
          {filteredAllProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#e5e5e5] mb-4">모든 마인드맵</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAllProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleOpenProjectInTab(proj.id)}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <FolderOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5] truncate mb-1">
                        {proj.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-[#a0a0a0] flex items-center gap-2">
                        {proj.projectType === 'collaborative' && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            공동
                          </span>
                        )}
                        {proj.projectType === 'personal' && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                            개인
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 빈 상태 */}
          {filteredRecentProjects.length === 0 && filteredAllProjects.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">📁</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-3">
                {searchQuery ? '검색 결과가 없습니다' : '마인드맵이 없습니다'}
              </h2>
              <p className="text-gray-600 dark:text-[#a0a0a0] mb-8">
                {searchQuery 
                  ? '다른 검색어를 시도해보세요'
                  : '새 마인드맵을 만들어 시작해보세요'
                }
              </p>
              {!searchQuery && (
                <Button
                  onClick={handleCreateNewMindmap}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 px-6 rounded-xl"
                >
                  새 마인드맵 만들기
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
