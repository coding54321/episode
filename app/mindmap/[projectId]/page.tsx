'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { MindMapNode, MindMapProject, GapTag, NodeType, LayoutType, LayoutConfig, MindMapSettings, STARAsset, COMPETENCY_KEYWORDS } from '@/types';
import { mindMapProjectStorage, currentProjectStorage, assetStorage, mindMapOnboardingStorage } from '@/lib/storage';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import MindMapCanvas, { MindMapCanvasHandle } from '@/components/mindmap/MindMapCanvas';
import MindMapTabs, { Tab } from '@/components/mindmap/MindMapTabs';

// 탭별 독립 상태 (Figma 스타일)
interface TabState {
  project: MindMapProject | null;
  nodes: MindMapNode[];
  selectedNodeId: string | null;
  focusNodeId: string | null;
}
import NewTabPanel from '@/components/mindmap/NewTabPanel';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import STAREditor from '@/components/star/STAREditor';
import MindMapToolbar from '@/components/mindmap/MindMapToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, MessageSquare, Check, X, BarChart3, FileText, CheckCircle2, AlertCircle, Loader2, Share2, Link2, Copy, Users, Search, Filter, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { saveNodes, updateNode, updateProject, getSharedProject, updateActiveEditor, getActiveEditors, removeActiveEditor, type ActiveEditor } from '@/lib/supabase/data';
import { applyLayout, applyAutoLayoutForNewNode, applyAutoLayoutAfterDelete } from '@/lib/layouts';
import { Lock } from 'lucide-react';

export default function MindMapProjectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const urlProjectId = params.projectId as string; // URL에서 온 프로젝트 ID (공유 링크용)
  const nodeId = useMemo(() => searchParams.get('nodeId'), [searchParams]);

  // 공유 링크로 접근한 경우 워크스페이스로 리다이렉트
  useEffect(() => {
    if (urlProjectId) {
      const nodeIdParam = nodeId ? `&nodeId=${nodeId}` : '';
      router.replace(`/mindmap?projectId=${urlProjectId}${nodeIdParam}`);
      }
  }, [urlProjectId, nodeId, router]);

  // 리다이렉트 중 로딩 표시
    return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
  );
}
