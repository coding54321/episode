'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function NodeCenteredMindMapPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const nodeId = params.nodeId as string;
  
  // 메인 페이지로 리다이렉트 (탭 UI에서 처리)
  useEffect(() => {
    router.replace(`/mindmap/${projectId}?nodeId=${nodeId}`);
  }, [projectId, nodeId, router]);
  
  return null;
}

