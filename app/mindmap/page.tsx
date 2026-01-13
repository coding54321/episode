'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userStorage, mindMapProjectStorage, currentProjectStorage } from '@/lib/storage';

export default function MindMapPage() {
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      // 로그인 확인
      const user = await userStorage.load();
      if (!user) {
        router.push('/login');
        return;
      }

      // 현재 프로젝트가 있으면 해당 프로젝트로, 없으면 목록으로
      const currentProjectId = currentProjectStorage.load();
      if (currentProjectId) {
        const project = await mindMapProjectStorage.get(currentProjectId);
        if (project) {
          router.push(`/mindmap/${currentProjectId}`);
          return;
        }
      }

      // 프로젝트 목록으로 이동
      router.push('/mindmaps');
    };
    loadData();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
      </div>
    </div>
  );
}

