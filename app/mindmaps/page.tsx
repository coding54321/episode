'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MindMapProject } from '@/types';
import { mindMapProjectStorage, currentProjectStorage, userStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Edit2, ChevronRight, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Header from '@/components/Header';

export default function MindMapsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<MindMapProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');

  useEffect(() => {
    // 로그인 확인
    const user = userStorage.load();
    if (!user) {
      router.push('/login');
      return;
    }

    // 프로젝트 로드
    const savedProjects = mindMapProjectStorage.load();
    setProjects(savedProjects);
    setIsLoading(false);
  }, [router]);

  const handleDelete = (projectId: string) => {
    if (confirm('정말 이 마인드맵을 삭제하시겠습니까?')) {
      mindMapProjectStorage.delete(projectId);
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

  const handleCreateNew = () => {
    router.push('/badge-selection');
  };

  const handleEditStart = (project: MindMapProject, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditedTitle(project.name);
  };

  const handleEditSave = (projectId: string) => {
    if (!editedTitle.trim()) {
      setEditingProjectId(null);
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (project) {
      const updatedProject: MindMapProject = {
        ...project,
        name: editedTitle.trim(),
        updatedAt: Date.now(),
      };
      mindMapProjectStorage.update(projectId, updatedProject);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="safe-area-top bg-white" />
      
      {/* 헤더 */}
      <Header showSearch={false} />
      
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">마인드맵 프로젝트</h1>
          <Button
            onClick={handleCreateNew}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-[12px] shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 마인드맵
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white px-5 py-6">
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🗺️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              아직 마인드맵이 없어요
            </h2>
            <p className="text-gray-600 mb-8">
              첫 번째 마인드맵을 만들어보세요
            </p>
            <Button
              onClick={handleCreateNew}
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-[12px] shadow-sm"
            >
              <Plus className="h-5 w-5 mr-2" />
              마인드맵 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="p-5 hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100 rounded-[12px] group">
                  <Link href={`/mindmap/${project.id}`}>
                    <div className="mb-4">
                      {editingProjectId === project.id ? (
                        <div className="flex items-center gap-2 mb-2" onClick={(e) => e.preventDefault()}>
                          <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, project.id)}
                            autoFocus
                            className="flex-1 text-lg font-semibold text-gray-900 border-b-2 border-blue-600 bg-transparent focus:outline-none px-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSave(project.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditCancel}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="flex-1 text-lg font-semibold line-clamp-1 text-gray-900">
                            {project.name}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEditStart(project, e)}
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      )}
                      {project.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-4 flex-wrap">
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
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full"
                          >
                            {badgeLabels[badge] || badge}
                          </span>
                        );
                      })}
                      {project.badges.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          +{project.badges.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{formatDate(project.updatedAt)}</span>
                      <span>{project.nodes.length}개 노드</span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <Link
                      href={`/mindmap/${project.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-gray-700 hover:bg-gray-50"
                      >
                        열기
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id);
                      }}
                      className="h-9 w-9 p-0 hover:bg-red-50 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

