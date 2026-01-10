'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MindMapProject } from '@/types';
import { mindMapProjectStorage, currentProjectStorage, userStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Edit2, ChevronRight, Check, X, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import FloatingHeader from '@/components/FloatingHeader';

export default function MindMapsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<MindMapProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // 로그인 확인
      const user = await userStorage.load();
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
  }, [router]);

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

  const handleCreateNew = () => {
    router.push('/badge-selection');
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
      const updatedProject: MindMapProject = {
        ...project,
        name: editedTitle.trim(),
        updatedAt: Date.now(),
      };
      await mindMapProjectStorage.update(projectId, updatedProject);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">마인드맵</h1>
          <p className="text-gray-600">경험을 구조화하고 관리하세요</p>
        </div>
        {projects.length === 0 ? (
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
              className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-[16px] shadow-sm hover:shadow-md transition-all duration-200"
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
                className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[12px] shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-5 w-5 mr-2" />
                새 마인드맵
              </Button>
            </div>
            {/* 프로젝트 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="h-full"
                >
                  <Card className="h-full p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 rounded-[20px] group bg-white flex flex-col">
                    <Link href={`/mindmap/${project.id}`} className="flex-1 flex flex-col">
                      <div className="mb-5 flex-1">
                        {editingProjectId === project.id ? (
                          <div className="flex items-center gap-2 mb-3" onClick={(e) => e.preventDefault()}>
                            <input
                              type="text"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              onKeyDown={(e) => handleEditKeyDown(e, project.id)}
                              autoFocus
                              className="flex-1 text-xl font-bold text-gray-900 border-b-2 border-blue-600 bg-transparent focus:outline-none px-1"
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
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="flex-1 text-xl font-bold line-clamp-2 text-gray-900 leading-tight">
                              {project.name}
                            </h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleEditStart(project, e)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 rounded-lg flex-shrink-0"
                            >
                              <Edit2 className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        )}
                        {project.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                            {project.description}
                          </p>
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
                              className="text-xs font-medium px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full"
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
                      <div className="flex items-center justify-between text-sm text-gray-500 pb-5 border-b border-gray-100 mt-auto">
                        <span>{formatDate(project.updatedAt)}</span>
                        <span className="font-medium">{project.nodes.length}개 노드</span>
                      </div>
                    </Link>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-2 pt-5 flex-shrink-0">
                      <Link
                        href={`/mindmap/${project.id}`}
                        className="flex-1"
                      >
                        <Button
                          className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-[12px] shadow-sm transition-all duration-200"
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
                        className="h-11 w-11 p-0 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-[12px] transition-all duration-200"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
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

