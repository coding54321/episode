'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mindMapProjectStorage } from '@/lib/storage';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import type { MindMapProject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FolderOpen, Clock, BarChart3, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  currentProjectId: string;
  onOpenProject: (projectId: string) => void;
  onCreateProject: (projectType: 'personal' | 'collaborative') => void;
};

export default function NewTabPanel({ currentProjectId, onOpenProject, onCreateProject }: Props) {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth();

  const [availableProjects, setAvailableProjects] = useState<MindMapProject[]>([]);
  const [recentProjects, setRecentProjects] = useState<MindMapProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const projectsList = await mindMapProjectStorage.load();
        const filtered = projectsList.filter((p) => p.id !== currentProjectId);
        setAvailableProjects(filtered);

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
  }, [user, authLoading, currentProjectId]);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes > 0 ? `${minutes}분 전` : '방금';
  };

  const filteredRecent = useMemo(
    () => recentProjects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [recentProjects, searchQuery]
  );
  const filteredAll = useMemo(
    () => availableProjects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [availableProjects, searchQuery]
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => onCreateProject('personal')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900">개인 마인드맵</span>
            </button>
            <button
              onClick={() => onCreateProject('collaborative')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900">팀 마인드맵</span>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="파일 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-xl border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-base"
            />
          </div>
        </div>

        {filteredRecent.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 파일</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecent.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => onOpenProject(proj.id)}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate mb-1">{proj.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {proj.updatedAt ? formatTimeAgo(proj.updatedAt) : '알 수 없음'}
                      {proj.projectType === 'collaborative' && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          공동
                        </span>
                      )}
                      {proj.projectType === 'personal' && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
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

        {filteredAll.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">모든 마인드맵</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAll.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => onOpenProject(proj.id)}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate mb-1">{proj.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {proj.projectType === 'collaborative' && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          공동
                        </span>
                      )}
                      {proj.projectType === 'personal' && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
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

        {filteredRecent.length === 0 && filteredAll.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📁</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {searchQuery ? '검색 결과가 없습니다' : '마인드맵이 없습니다'}
            </h2>
            <p className="text-gray-600 mb-8">
              {searchQuery ? '다른 검색어를 시도해보세요' : '새 마인드맵을 만들어 시작해보세요'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/project-type-selection')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 px-6 rounded-xl">
                새 마인드맵 만들기
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

