'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { MindMapNode, MindMapProject, GapTag, NodeType, LayoutType, LayoutConfig, MindMapSettings } from '@/types';
import { mindMapProjectStorage, currentProjectStorage, assetStorage, mindMapOnboardingStorage } from '@/lib/storage';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import MindMapCanvas, { MindMapCanvasHandle } from '@/components/mindmap/MindMapCanvas';
import MindMapTabs, { Tab } from '@/components/mindmap/MindMapTabs';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import STAREditor from '@/components/star/STAREditor';
import LayoutSelector from '@/components/mindmap/LayoutSelector';
import MindMapToolbar from '@/components/mindmap/MindMapToolbar';
import MindMapSettingsDialog from '@/components/mindmap/MindMapSettingsDialog';
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
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, MessageSquare, Check, X, BarChart3, FileText, CheckCircle2, AlertCircle, Loader2, Share2, Link2, Copy, Users } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import { AnimatePresence, motion } from 'framer-motion';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { saveNodes, updateNode, updateProject, getSharedProject, updateActiveEditor, getActiveEditors, removeActiveEditor, type ActiveEditor } from '@/lib/supabase/data';
import { applyLayout, applyAutoLayoutForNewNode, applyAutoLayoutAfterDelete } from '@/lib/layouts';
import { Lock } from 'lucide-react';

export default function MindMapProjectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const nodeId = useMemo(() => searchParams.get('nodeId'), [searchParams]);
  const shareUrl = useMemo(
    () => `${typeof window !== 'undefined' ? window.location.origin : ''}/mindmap/${projectId}`,
    [projectId]
  );
  const { user, loading: authLoading } = useUnifiedAuth(); // 전역 상태에서 사용자 정보 가져오기
  
  const [project, setProject] = useState<MindMapProject | null>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [isSTAREditorOpen, setIsSTAREditorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarMainTab, setSidebarMainTab] = useState<'gap' | 'assistant' | 'star'>('assistant');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [starData, setStarData] = useState<{
    situation: string;
    task: string;
    action: string;
    result: string;
  } | null>(null);
  const [droppedTag, setDroppedTag] = useState<{
    tag: GapTag;
    targetNodeId: string;
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settings, setSettings] = useState<MindMapSettings>({
    colorTheme: 'default',
    showGrid: false,
  });
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isShareProcessing, setIsShareProcessing] = useState(false);
  const [shareCopyState, setShareCopyState] = useState<'idle' | 'copied'>('idle');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isSharingUpdate, setIsSharingUpdate] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  // DB 업데이트 디바운싱을 위한 ref
  const supabaseUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 편집자 추적을 위한 interval ref
  const editorTrackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const editorPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // 드래그 중인지 추적하는 ref
  const isDraggingRef = useRef(false);
  // 상태 업데이트 디바운싱을 위한 ref
  const stateUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 캔버스 ref
  const canvasRef = useRef<MindMapCanvasHandle>(null);
  // 마지막 저장된 노드 상태 (변경 감지용)
  const lastSavedNodesRef = useRef<string>('');

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) {
      return;
    }

    const loadProject = async () => {
      try {
        let loadedProject: MindMapProject | null = null;
        let isSharedAccess = false;

        // 먼저 로그인된 사용자의 프로젝트로 시도
        if (user) {
          const { getProject } = await import('@/lib/supabase/data');
          loadedProject = await getProject(projectId, user.id);
          if (loadedProject) {
            setIsOwner(true);
            setIsReadOnly(false);
          }
        }

        // 로그인된 사용자의 프로젝트가 아니면 공유된 프로젝트인지 확인
        if (!loadedProject) {
          const { getSharedProject } = await import('@/lib/supabase/data');
          loadedProject = await getSharedProject(projectId);
          if (loadedProject) {
            isSharedAccess = true;
            setIsOwner(false);
            // 로그인 안 된 경우 읽기 전용
            setIsReadOnly(!user);
          }
        }

        if (!loadedProject) {
          console.warn('[mindmap/page] 프로젝트를 찾을 수 없음', { projectId, userId: user?.id });
          if (user) {
            router.push('/mindmaps');
          } else {
            router.push('/login');
          }
          return;
        }

        console.log('[mindmap/page] 프로젝트 로드 완료', {
          projectId,
          projectName: loadedProject.name,
          nodeCount: loadedProject.nodes.length,
          nodes: loadedProject.nodes.map(n => ({ id: n.id, label: n.label, level: n.level, childrenCount: n.children.length })),
        });

        setProject(loadedProject);

        // 저장된 설정 불러오기
        if (loadedProject.settings) {
          setSettings(loadedProject.settings);
          setShowGrid(loadedProject.settings.showGrid || false);
        }

        // 자동 레이아웃이 활성화되어 있고 노드가 있으면 레이아웃 적용
        const layoutConfig = loadedProject.layoutConfig || { autoLayout: true };
        if (layoutConfig.autoLayout && loadedProject.nodes.length > 0) {
          const layoutType = loadedProject.layoutType || 'radial';
          const layoutedNodes = applyLayout(loadedProject.nodes, layoutType, layoutConfig);
          setNodes(layoutedNodes);
        } else {
          setNodes(loadedProject.nodes);
        }

        currentProjectStorage.save(projectId);

        // 탭 초기화
        const mainTab: Tab = {
          id: 'main',
          label: loadedProject.name,
          nodeId: null,
          href: `/mindmap/${projectId}`,
        };
        setTabs([mainTab]);
        setActiveTabId('main');

        // 마인드맵 온보딩(튜토리얼) 최초 1회 노출
        if (!mindMapOnboardingStorage.isShown()) {
          setShowOnboarding(true);
        }
      } catch (error) {
        // AbortError는 조용히 무시 (컴포넌트 언마운트 등으로 인한 정상적인 중단)
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Project load aborted (normal during navigation)');
          return;
        }
        console.error('Failed to load project:', error);
        // 에러 발생 시 마인드맵 목록으로 리다이렉트
        router.push('/mindmaps');
      }
    };

    loadProject();

    // Cleanup
    return () => {
      // 타이머 정리
      if (supabaseUpdateTimeoutRef.current) {
        clearTimeout(supabaseUpdateTimeoutRef.current);
        supabaseUpdateTimeoutRef.current = null;
      }
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
        stateUpdateTimeoutRef.current = null;
      }
      // 편집자 추적 정리
      if (editorTrackingIntervalRef.current) {
        clearInterval(editorTrackingIntervalRef.current);
        editorTrackingIntervalRef.current = null;
      }
      if (editorPollingIntervalRef.current) {
        clearInterval(editorPollingIntervalRef.current);
        editorPollingIntervalRef.current = null;
      }
      // 페이지 떠날 때 편집자에서 제거
      if (user && projectId) {
        removeActiveEditor(projectId, user.id).catch(console.error);
      }
    };
  }, [projectId, router, user, authLoading]);

  // 편집자 추적 (로그인된 사용자만)
  useEffect(() => {
    if (!user || !project || isReadOnly) {
      return;
    }

    // 즉시 등록
    const registerEditor = async () => {
      await updateActiveEditor(projectId, user.id, user.name || undefined, user.email || undefined);
    };
    registerEditor();

    // 30초마다 last_seen 업데이트
    editorTrackingIntervalRef.current = setInterval(() => {
      updateActiveEditor(projectId, user.id, user.name || undefined, user.email || undefined).catch(console.error);
    }, 30000);

    // 페이지 떠날 때 정리
    return () => {
      if (editorTrackingIntervalRef.current) {
        clearInterval(editorTrackingIntervalRef.current);
        editorTrackingIntervalRef.current = null;
      }
      removeActiveEditor(projectId, user.id).catch(console.error);
    };
  }, [user, project, projectId, isReadOnly]);

  // 활성 편집자 목록 폴링 (공유된 프로젝트인 경우)
  useEffect(() => {
    if (!project?.isShared) {
      return;
    }

    const pollActiveEditors = async () => {
      const editors = await getActiveEditors(projectId);
      setActiveEditors(editors);
    };

    // 즉시 조회
    pollActiveEditors();

    // 5초마다 폴링
    editorPollingIntervalRef.current = setInterval(pollActiveEditors, 5000);

    return () => {
      if (editorPollingIntervalRef.current) {
        clearInterval(editorPollingIntervalRef.current);
        editorPollingIntervalRef.current = null;
      }
    };
  }, [project?.isShared, projectId]);

  // 페이지 떠나기 전 저장되지 않은 변경사항 처리
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 대기 중인 저장이 있으면 경고
      if (supabaseUpdateTimeoutRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // URL의 nodeId가 있으면 해당 처리
  useEffect(() => {
    if (nodeId && project) {
      const node = project.nodes.find(n => n.id === nodeId);
      if (node) {
        // URL 파라미터에 focus=true가 있으면 메인 뷰에서 포커스
        const isFocusMode = searchParams.get('focus') === 'true';
        
        if (isFocusMode) {
          // 메인 탭으로 이동
          setActiveTabId('main');
          // 해당 노드로 포커스
          setFocusNodeId(nodeId);
          
          // 잠시 후 focusNodeId 초기화 (다음 검색을 위해)
          setTimeout(() => {
            setFocusNodeId(null);
          }, 1000);
          
          // URL에서 focus 파라미터 제거 (히스토리에 남기지 않음)
          router.replace(`/mindmap/${projectId}`, { scroll: false });
        } else {
          // 기존 탭 방식
          const tabId = `node_${nodeId}`;
          
          setTabs(prev => {
            const existingTab = prev.find(t => t.id === tabId);
            
            if (!existingTab) {
              const newTab: Tab = {
                id: tabId,
                label: typeof node.label === 'string' ? node.label : '노드',
                nodeId: nodeId,
                href: `/mindmap/${projectId}?nodeId=${nodeId}`,
              };
              return [...prev, newTab];
            }
            return prev;
          });
          
          setActiveTabId(tabId);
        }
      }
    } else if (!nodeId) {
      setActiveTabId('main');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, project, projectId, searchParams]);

  // 실시간 동기화
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'episode_mindmap_projects' && e.newValue) {
        try {
          const projects = JSON.parse(e.newValue);
          const updatedProject = projects.find((p: MindMapProject) => p.id === projectId);
          if (updatedProject) {
            setProject(updatedProject);
            setNodes(updatedProject.nodes);
            
            // 탭 라벨 업데이트
            setTabs(prev => prev.map(tab => {
              if (tab.nodeId) {
                const node = updatedProject.nodes.find((n: MindMapNode) => n.id === tab.nodeId);
                if (node) {
                  return {
                    ...tab,
                    label: typeof node.label === 'string' ? node.label : '노드',
                  };
                }
              } else {
                return {
                  ...tab,
                  label: updatedProject.name,
                };
              }
              return tab;
            }));
          }
        } catch (error) {
          console.error('Failed to sync nodes:', error);
        }
      }
    };

    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.projectId === projectId) {
        // 전체 프로젝트가 전달되는 경우
        if (customEvent.detail.project) {
          const updatedProject = customEvent.detail.project as MindMapProject;
          setProject(updatedProject);
          setNodes(updatedProject.nodes || []);
          
          // 탭 라벨 업데이트
          setTabs(prev => prev.map(tab => {
            if (tab.nodeId) {
              const node = updatedProject.nodes.find((n: MindMapNode) => n.id === tab.nodeId);
              if (node) {
                return {
                  ...tab,
                  label: typeof node.label === 'string' ? node.label : '노드',
                };
              }
            } else {
              return {
                ...tab,
                label: updatedProject.name,
              };
            }
            return tab;
          }));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('mindmap-project-updated', handleCustomUpdate as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mindmap-project-updated', handleCustomUpdate as EventListener);
    };
  }, [projectId]);

  // 노드 인덱스 맵 생성 (O(1) 조회를 위해)
  const nodeMap = useMemo(() => {
    return new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isNodeView = activeTab?.nodeId !== null;
  const getRootNode = (): MindMapNode | null => {
    if (!nodes || nodes.length === 0) return null;
    const centerByLevel = nodes.find((n) => n.level === 0);
    if (centerByLevel) return centerByLevel;
    const centerByParent = nodes.find((n) => !n.parentId);
    return centerByParent || nodes[0];
  };

  useEffect(() => {
    if (project?.isShared && typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/mindmap/${projectId}`);
    } else {
      setShareLink('');
    }
  }, [project?.isShared, projectId]);

  const handleNodesChange = async (newNodes: MindMapNode[], isDrag = false) => {
    // 읽기 전용 모드에서는 저장하지 않음
    if (isReadOnly) {
      return;
    }

    // 드래그 중이면 상태 업데이트도 디바운싱 (16ms = ~60fps)
    if (isDrag) {
      isDraggingRef.current = true;

      // 기존 상태 업데이트 타이머 취소
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
      }

      // 16ms 디바운싱으로 상태 업데이트 (60fps)
      stateUpdateTimeoutRef.current = setTimeout(() => {
        setNodes(newNodes);
        if (project) {
          setProject({
            ...project,
            nodes: newNodes,
            updatedAt: Date.now(),
          });
        }
        stateUpdateTimeoutRef.current = null;
      }, 16);
    } else {
      // 드래그가 아니면 즉시 업데이트
      isDraggingRef.current = false;
      setNodes(newNodes);
      if (project) {
        setProject({
          ...project,
          nodes: newNodes,
          updatedAt: Date.now(),
        });
      }
    }

    // DB에 직접 저장 (디바운싱 적용)
    if (project) {
      // 변경 감지: 노드가 실제로 변경되었는지 확인
      const newNodesHash = JSON.stringify(newNodes.map(n => ({ id: n.id, x: n.x, y: n.y, label: n.label, parentId: n.parentId })));

      // 초기 로드가 아니고 변경이 없으면 저장 스킵
      if (lastSavedNodesRef.current && newNodesHash === lastSavedNodesRef.current) {
        console.log('[mindmap/page] 변경 없음, 저장 스킵');
        return;
      }

      // 기존 타이머 취소
      if (supabaseUpdateTimeoutRef.current) {
        clearTimeout(supabaseUpdateTimeoutRef.current);
      }

      // 저장 중 상태 표시
      setSaveStatus('saving');

      // 500ms 디바운싱으로 Supabase에 노드 저장
      supabaseUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          // 노드를 DB에 직접 저장 (saveNodes가 모든 노드 정보를 저장)
          const success = await saveNodes(projectId, newNodes);

          if (success) {
            // 저장 성공
            lastSavedNodesRef.current = newNodesHash;
            setSaveStatus('saved');

            // 프로젝트 메타데이터만 업데이트 (nodes는 제외하여 중복 저장 방지)
            await mindMapProjectStorage.update(projectId, {
              updatedAt: Date.now(),
            });

            // 2초 후 저장 상태 숨김
            setTimeout(() => {
              setSaveStatus(null);
            }, 2000);
          } else {
            // 저장 실패
            setSaveStatus('error');
            console.error('[mindmap/page] 노드 저장 실패');

            // 5초 후 에러 상태 숨김
            setTimeout(() => {
              setSaveStatus(null);
            }, 5000);
          }
        } catch (error) {
          console.error('[mindmap/page] 노드 저장 예외:', error);
          setSaveStatus('error');

          // 5초 후 에러 상태 숨김
          setTimeout(() => {
            setSaveStatus(null);
          }, 5000);
        }
      }, 500);
    }
  };

  const handleNodeEdit = async (nodeId: string, label: string) => {
    // 읽기 전용 모드에서는 편집 불가
    if (isReadOnly) {
      if (!user) {
        router.push('/login');
      }
      return;
    }

    // 인덱스 맵 사용하여 더 효율적으로 업데이트
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    // 단일 노드 라벨 변경은 updateNode 함수 사용 (성능 최적화)
    const success = await updateNode(projectId, nodeId, { label });
    
    if (success) {
      // 로컬 상태만 업데이트 (전체 배열 재생성 최소화)
      setNodes(prev => {
        const updated = [...prev];
        const index = updated.findIndex(n => n.id === nodeId);
        if (index !== -1) {
          updated[index] = { ...updated[index], label, updatedAt: Date.now() };
        }
        return updated;
      });
      
      // 프로젝트 메타데이터 업데이트
      if (project) {
        setProject({
          ...project,
          updatedAt: Date.now(),
        });
      }
    } else {
      // 실패 시 기존 방식으로 폴백 (전체 저장)
      console.warn('[handleNodeEdit] 단일 노드 업데이트 실패, 전체 저장으로 폴백');
      const updatedNodes = nodes.map(n => 
        n.id === nodeId 
          ? { ...n, label, updatedAt: Date.now() }
          : n
      );
      handleNodesChange(updatedNodes, false);
    }
  };

  const handleTitleEdit = () => {
    if (!project) return;
    setEditedTitle(project.name);
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (!project || !editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    const updatedProject: MindMapProject = {
      ...project,
      name: editedTitle.trim(),
      updatedAt: Date.now(),
    };
    await mindMapProjectStorage.update(projectId, updatedProject);
    setProject(updatedProject);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const handleNodeAddChild = (parentId: string, direction: 'right' | 'left' | 'top' | 'bottom' = 'right') => {
    // 읽기 전용 모드에서는 추가 불가
    if (isReadOnly) {
      if (!user) {
        router.push('/login');
      }
      return;
    }

    // 인덱스 맵 사용
    const parent = nodeMap.get(parentId);
    if (!parent || !project) return;

    // 노드 타입 결정
    const newLevel = parent.level + 1;
    let nodeType: NodeType = 'detail'; // 기본값
    let defaultLabel = '새 노드';
    
    if (newLevel === 0) {
      nodeType = 'center';
      defaultLabel = '중심';
    } else if (newLevel === 1) {
      nodeType = 'category';
      defaultLabel = '대분류';
    } else if (newLevel === 2) {
      nodeType = 'experience';
      defaultLabel = '경험';
    } else if (newLevel === 3) {
      nodeType = 'episode';
      defaultLabel = '에피소드';
    } else if (newLevel >= 4) {
      nodeType = 'detail';
      defaultLabel = '새 노드'; // 자유롭게 작성
    }

    const newChild: MindMapNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: defaultLabel,
      parentId: parentId,
      children: [],
      x: parent.x, // 임시 좌표 (자동 레이아웃에서 재계산됨)
      y: parent.y,
      level: newLevel,
      nodeType,
      isManuallyPositioned: false, // 자동 레이아웃으로 배치
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedNodes = nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newChild.id] };
      }
      return node;
    });

    updatedNodes.push(newChild);

    // 자동 레이아웃 적용
    const layoutType = project.layoutType || 'radial';
    const layoutConfig = project.layoutConfig || { autoLayout: true };
    const layoutedNodes = applyAutoLayoutForNewNode(updatedNodes, newChild, layoutType, layoutConfig);
    
    handleNodesChange(layoutedNodes, false);
    setEditingNodeId(newChild.id);
  };

  const handleSTARComplete = (data: { situation: string; task: string; action: string; result: string }) => {
    setStarData(data);
    setIsSTAREditorOpen(true);
  };

  const handleOpenShareDialog = () => {
    if (project?.isShared && typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/mindmap/${projectId}`);
    }
    setIsShareDialogOpen(true);
  };

  const handleProjectShare = async () => {
    if (!project) {
      alert('공유할 프로젝트를 찾지 못했습니다.');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    setIsShareProcessing(true);
    try {
      const updatedProject: MindMapProject = {
        ...project,
        isShared: true,
        sharedBy: user.id,
        sharedByUser: { id: user.id, name: user.name || user.email || 'user' },
        updatedAt: Date.now(),
      };
      await updateProject(projectId, {
        isShared: true,
        sharedBy: user.id,
        sharedByUser: { id: user.id, name: user.name || user.email || 'user' },
      });
      await mindMapProjectStorage.update(projectId, updatedProject);
      setProject(updatedProject);
      if (typeof window !== 'undefined') {
        setShareLink(`${window.location.origin}/mindmap/${projectId}`);
      }
    } catch (error) {
      console.error('[mindmap/page] 프로젝트 공유 실패', error);
    } finally {
      setIsShareProcessing(false);
    }
  };

  const handleProjectUnshare = async () => {
    if (!project) {
      return;
    }

    setIsShareProcessing(true);
    try {
      const updatedProject: MindMapProject = {
        ...project,
        isShared: false,
        sharedBy: undefined,
        sharedByUser: undefined,
        updatedAt: Date.now(),
      };
      await updateProject(projectId, {
        isShared: false,
        sharedBy: undefined,
        sharedByUser: undefined,
      });
      await mindMapProjectStorage.update(projectId, updatedProject);
      setProject(updatedProject);
      setShareLink('');
    } catch (error) {
      console.error('[mindmap/page] 프로젝트 공유 해제 실패', error);
    } finally {
      setIsShareProcessing(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopyState('copied');
      setTimeout(() => setShareCopyState('idle'), 1500);
    } catch (error) {
      console.error('[mindmap/page] 공유 링크 복사 실패', error);
    }
  };

  const handleNodeOpenInNewTab = (nodeId: string) => {
    if (!project) return;
    
    const node = project.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const tabId = `node_${nodeId}`;
    const existingTab = tabs.find(t => t.id === tabId);
    
    if (existingTab) {
      // 이미 열려있는 탭이면 해당 탭으로 전환
      setActiveTabId(tabId);
      router.push(`/mindmap/${projectId}?nodeId=${nodeId}`);
    } else {
      // 새 탭 추가
      const newTab: Tab = {
        id: tabId,
        label: typeof node.label === 'string' ? node.label : '노드',
        nodeId: nodeId,
        href: `/mindmap/${projectId}?nodeId=${nodeId}`,
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(tabId);
      router.push(`/mindmap/${projectId}?nodeId=${nodeId}`);
    }
  };

  const handleTabClick = (tabId: string) => {
    // 이미 활성 탭이면 아무것도 하지 않음
    if (tabId === activeTabId) return;
    
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      if (tab.nodeId) {
        router.push(`/mindmap/${projectId}?nodeId=${tab.nodeId}`);
      } else {
        router.push(`/mindmap/${projectId}`);
      }
    }
  };

  const handleTabClose = (tabId: string) => {
    if (tabId === 'main') return; // 메인 탭은 닫을 수 없음
    
    // 탭 제거
    setTabs(prev => prev.filter(t => t.id !== tabId));
    
    // 닫은 탭이 활성 탭이면 메인 탭으로 전환
    if (activeTabId === tabId) {
      setActiveTabId('main');
      // URL도 메인으로 변경 (replace 사용하여 히스토리에 남기지 않음)
      router.replace(`/mindmap/${projectId}`);
    }
  };

  // 노드 중심 뷰를 위한 노드 필터링
  const getDisplayNodes = (): MindMapNode[] => {
    if (!isNodeView || !activeTab?.nodeId) {
      return nodes;
    }

    const centerNodeId = activeTab.nodeId;
    // 인덱스 맵 사용
    const centerNode = nodeMap.get(centerNodeId);
    if (!centerNode) return nodes;

    // 해당 노드와 하위 노드만 필터링
    const getNodeAndDescendants = (id: string): MindMapNode[] => {
      const node = nodeMap.get(id);
      if (!node) return [];
      
      const result: MindMapNode[] = [node];
      node.children.forEach(childId => {
        result.push(...getNodeAndDescendants(childId));
      });
      return result;
    };

    const filteredNodes = getNodeAndDescendants(centerNodeId);

    // 노드를 중심으로 재배치
    // ⚠️ 여기서는 "표시용" 좌표만 바꾸고, parentId/children 구조는 가능한 한 그대로 둡니다.
    // 중심 노드만 parentId를 null 로 만들어 상위와의 선만 끊고, 나머지 노드들은 원래 parentId를 유지합니다.
    return filteredNodes.map(node => {
      if (node.id === centerNodeId) {
        // 중심 노드는 (0, 0)에 배치하고 parentId를 null로 설정 (상위와의 연결선 숨김)
        return { ...node, x: 0, y: 0, parentId: null };
      }

      const relativeX = node.x - centerNode.x;
      const relativeY = node.y - centerNode.y;

      // 자식 노드는 상대 좌표로만 이동시키고, parentId/children/level 등 구조 정보는 유지
      return {
        ...node,
        x: relativeX,
        y: relativeY,
      };
    });
  };

  const displayNodes = getDisplayNodes();

  // 태그 드롭 처리 핸들러
  const handleTagDrop = (nodeId: string, tag: GapTag) => {
    setDroppedTag({ tag, targetNodeId: nodeId });
    setNewNodeName(''); // 빈 값으로 시작
    setShowConfirmDialog(true);
  };

  // 노드 생성하기 클릭
  const handleConfirmAddTag = () => {
    if (!droppedTag) return;

    const { tag, targetNodeId } = droppedTag;
    // 인덱스 맵 사용
    const targetNode = nodeMap.get(targetNodeId);
    
    if (!targetNode) return;

    // 노드 층위에 따른 기본값 및 타입 결정
    const newLevel = targetNode.level + 1;
    let nodeType: NodeType = 'detail';
    let defaultLabelSuffix = '내용';
    
    if (newLevel === 1) {
      nodeType = 'category';
      defaultLabelSuffix = '범주';
    } else if (newLevel === 2) {
      nodeType = 'experience';
      defaultLabelSuffix = '경험';
    } else if (newLevel === 3) {
      nodeType = 'episode';
      defaultLabelSuffix = '에피소드';
    } else if (newLevel >= 4) {
      nodeType = 'detail';
      defaultLabelSuffix = '내용';
    }

    // 입력값이 없으면 기본값 사용 (층위에 따라 다르게)
    const nodeName = newNodeName.trim() || `${tag.category} 관련 ${defaultLabelSuffix}`;

    // 새 자식 노드 생성
    const newNodeId = `node_${Date.now()}`;
    const newNode: MindMapNode = {
      id: newNodeId,
      label: nodeName,
      parentId: targetNodeId,
      children: [],
      x: targetNode.x + 200, // 임시 위치
      y: targetNode.y,
      level: newLevel,
      nodeType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 부모 노드의 children 배열에 추가
    const updatedNodes = nodes.map(n => {
      if (n.id === targetNodeId) {
        return { ...n, children: [...n.children, newNodeId], updatedAt: Date.now() };
      }
      return n;
    });

    updatedNodes.push(newNode);
    handleNodesChange(updatedNodes);

    // 태그 제거 (사용됨)
    const { gapTagStorage } = require('@/lib/storage');
    gapTagStorage.remove(tag.id);
    // 태그 업데이트 이벤트 발생
    window.dispatchEvent(new Event('gap-tags-updated'));

    // 다이얼로그 닫기
    setShowConfirmDialog(false);
    setDroppedTag(null);
    setNewNodeName('');

    // AI 어시스턴트 열기 및 노드 선택
    setSelectedNodeId(newNodeId);
    setSidebarMainTab('assistant');
    setIsSidebarOpen(true);
  };

  // 취소/닫기
  const handleCancelAddTag = () => {
    setShowConfirmDialog(false);
    setDroppedTag(null);
    setNewNodeName('');
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-[#0a0a0a]">
      {/* 헤더 */}
      <Header />
      
      {/* 탭 바 */}
      {tabs.length > 0 && (
        <MindMapTabs
          tabs={tabs}
          activeTabId={activeTabId}
          projectId={projectId}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
        />
      )}
      
      {/* 프로젝트 정보 */}
      <div className="bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#2a2a2a] px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/mindmaps">
              <Button variant="ghost" size="sm" className="px-2">
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              {!isNodeView && isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={handleTitleSave}
                    autoFocus
                    className="text-lg font-bold text-gray-900 dark:text-[#e5e5e5] border-b-2 border-blue-600 dark:border-[#60A5FA] bg-transparent focus:outline-none px-1"
                    style={{ width: `${Math.max(editedTitle.length * 10, 100)}px` }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTitleSave}
                    className="h-7 w-7 p-0"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingTitle(false)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div>
                  <h1 
                    className={`text-lg font-bold text-gray-900 dark:text-[#e5e5e5] ${!isNodeView && !isReadOnly ? 'cursor-pointer hover:text-blue-600 dark:hover:text-[#60A5FA] transition-colors' : ''}`}
                    onClick={!isNodeView && !isReadOnly ? handleTitleEdit : undefined}
                    title={!isNodeView && !isReadOnly ? '클릭하여 제목 수정' : isReadOnly ? '편집하려면 로그인이 필요합니다' : ''}
                  >
                    {isNodeView && activeTab ? activeTab.label : project.name}
                  </h1>
                  {isNodeView ? (
                    <p className="text-xs text-gray-500 dark:text-[#a0a0a0]">노드 중심 뷰</p>
                  ) : (
                    project.description && (
                      <p className="text-xs text-gray-500 dark:text-[#a0a0a0]">{project.description}</p>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* 우측 버튼 그룹 */}
          <div className="flex items-center gap-2">
            {/* 저장 상태 표시 */}
            {saveStatus && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-600 dark:text-gray-400">저장 중...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-gray-600 dark:text-gray-400">저장 완료</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span className="text-red-600 dark:text-red-400">저장 실패</span>
                  </>
                )}
              </div>
            )}

            {/* 레이아웃 선택기는 툴바로 이동 */}

            {/* 공백 진단하기 버튼 */}
            <Button
              variant={isSidebarOpen && sidebarMainTab === 'gap' ? "default" : "outline"}
              size="sm"
              disabled={isReadOnly}
              onClick={() => {
                if (isReadOnly) {
                  if (!user) {
                    router.push('/login');
                  }
                  return;
                }
                if (isSidebarOpen && sidebarMainTab === 'gap') {
                  setIsSidebarOpen(false);
                } else {
                  setSidebarMainTab('gap');
                  setIsSidebarOpen(true);
                }
              }}
              className={`px-3 py-2 gap-2 transition-all duration-200 ${
                isSidebarOpen && sidebarMainTab === 'gap'
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] border border-gray-300 dark:border-[#2a2a2a]'
              }`}
              title={isSidebarOpen && sidebarMainTab === 'gap' ? '공백 진단하기 닫기' : '공백 진단하기 열기'}
            >
              <BarChart3 className="h-4 w-4" />
              <span>공백 진단하기</span>
            </Button>
            
            {/* STAR 정리하기 버튼 */}
            <Button
              variant={isSidebarOpen && sidebarMainTab === 'star' ? "default" : "ghost"}
              size="sm"
              disabled={isReadOnly}
              onClick={() => {
                if (isReadOnly) {
                  if (!user) {
                    router.push('/login');
                  }
                  return;
                }
                if (isSidebarOpen && sidebarMainTab === 'star') {
                  setIsSidebarOpen(false);
                } else {
                  setSidebarMainTab('star');
                  setIsSidebarOpen(true);
                }
              }}
              className={`px-3 py-2 gap-2 transition-all duration-200 ${
                isSidebarOpen && sidebarMainTab === 'star'
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
              }`}
              title={isSidebarOpen && sidebarMainTab === 'star' ? 'STAR 정리하기 닫기' : 'STAR 정리하기 열기'}
            >
              <FileText className="h-4 w-4" />
              <span>STAR 정리하기</span>
            </Button>
            
            {/* 어시스턴트 토글 버튼 */}
            <Button
              variant={isSidebarOpen && sidebarMainTab === 'assistant' ? "default" : "ghost"}
              size="sm"
              disabled={isReadOnly}
              onClick={() => {
                if (isReadOnly) {
                  if (!user) {
                    router.push('/login');
                  }
                  return;
                }
                if (isSidebarOpen && sidebarMainTab === 'assistant') {
                  setIsSidebarOpen(false);
                } else {
                  setSidebarMainTab('assistant');
                  setIsSidebarOpen(true);
                }
              }}
              className={`px-3 py-2 gap-2 transition-all duration-200 ${
                isSidebarOpen && sidebarMainTab === 'assistant'
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
              }`}
              title={isSidebarOpen && sidebarMainTab === 'assistant' ? '어시스턴트 닫기' : '어시스턴트 열기'}
            >
              <MessageSquare className="h-4 w-4" />
              <span>어시스턴트</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 읽기 전용 모드 배너 */}
      {isReadOnly && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-5 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  읽기 전용 모드
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  마인드맵을 조회할 수 있습니다. 편집하려면 로그인이 필요합니다.
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] px-4 py-2 text-sm font-semibold shadow-sm flex-shrink-0"
            >
              로그인하여 편집하기
            </Button>
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* 마인드맵 캔버스 영역 */}
        <div className="flex-1 relative overflow-hidden">

          {/* 활성 편집자 표시 (피그마 스타일) */}
          {project?.isShared && activeEditors.length > 0 && (
            <div className="absolute top-20 right-4 z-20 bg-white dark:bg-[#1a1a1a] rounded-[12px] border border-gray-200 dark:border-[#2a2a2a] shadow-lg p-3 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  현재 편집 중 ({activeEditors.length})
                </span>
              </div>
              <div className="space-y-2">
                {activeEditors.map((editor) => (
                  <div key={editor.id} className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 flex items-center justify-center text-xs font-semibold">
                      {(editor.userName || editor.userEmail || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                      {editor.userName || editor.userEmail || '익명 사용자'}
                    </span>
                    {editor.userId === user?.id && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 rounded-full">
                        나
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 플로팅 툴바 */}
          {!isNodeView && (
            <MindMapToolbar
              onFitToScreen={() => canvasRef.current?.fitToScreen()}
              onToggleGrid={() => setShowGrid(!showGrid)}
              showGrid={showGrid}
              onExport={async (type: 'image' | 'pdf') => {
                if (!project) return;

                try {
                  // DB 데이터 기반 이미지 생성 방식 사용
                  const { downloadMindMapAsImage, downloadMindMapAsPDF } = await import('@/lib/mindmap-export');

                  if (type === 'image') {
                    await downloadMindMapAsImage(nodes, project.name || 'mindmap');
                  } else {
                    await downloadMindMapAsPDF(nodes, project.name || 'mindmap');
                  }
                } catch (error) {
                  console.error('내보내기 실패:', error);
                  alert('내보내기에 실패했습니다. 다시 시도해주세요.');
                }
              }}
              onShare={isReadOnly ? undefined : handleOpenShareDialog}
              onSettings={() => {
                if (isReadOnly) {
                  if (!user) {
                    router.push('/login');
                  }
                  return;
                }
                setShowSettingsDialog(true);
              }}
            />
          )}
          
          <MindMapCanvas
            ref={canvasRef}
            nodes={displayNodes}
            originalNodes={nodes}
            centerNodeId={isNodeView ? activeTab?.nodeId || null : null}
            focusNodeId={!isNodeView ? focusNodeId : null}
            showGrid={showGrid}
            colorTheme={settings.colorTheme}
            isReadOnly={isReadOnly}
            onNodesChange={(newNodes) => {
            if (isNodeView && activeTab?.nodeId) {
              // 노드 중심 뷰에서는 "좌표만" 원래 좌표계로 되돌리고,
              // parentId / children / level 등의 구조 정보는 항상 기존 nodes 를 기준으로 유지합니다.
              // 인덱스 맵 사용
              const centerNode = nodeMap.get(activeTab.nodeId);
              if (centerNode) {
                // 1) 화면에서 편집된 상대 좌표를 원래 절대 좌표로 변환
                const convertedNodes = newNodes.map(node => {
                  if (node.id === activeTab.nodeId) {
                    return { ...node, x: centerNode.x, y: centerNode.y };
                  }
                  return {
                    ...node,
                    x: node.x + centerNode.x,
                    y: node.y + centerNode.y,
                  };
                });

                // 2) 실제 프로젝트 저장용 노드에서는 구조 정보는 기존 nodes 를 기준으로 하고,
                //    위치(x, y)와 라벨/공유 여부 등만 덮어씌웁니다.
                const updatedAllNodes = nodes.map(original => {
                  const updated = convertedNodes.find(n => n.id === original.id);
                  if (!updated) return original;

                  return {
                    ...original,
                    x: updated.x,
                    y: updated.y,
                    label: updated.label,
                    isShared: updated.isShared,
                    updatedAt: Date.now(),
                  };
                });

                handleNodesChange(updatedAllNodes, false);
              }
            } else {
              handleNodesChange(newNodes, false);
            }
          }}
          selectedNodeId={selectedNodeId}
          editingNodeId={editingNodeId}
          onNodeSelect={(nodeId) => {
            setSelectedNodeId(nodeId);
          }}
          onNodeOpenSTAREditor={async (nodeId) => {
            // 읽기 전용 모드에서는 STAR 에디터 열기 불가
            if (isReadOnly) {
              if (!user) {
                router.push('/login');
              }
              return;
            }
            // 해당 노드 선택
            setSelectedNodeId(nodeId);
            // 사이드바 열기 및 STAR 탭 활성화
            setSidebarMainTab('star');
            setIsSidebarOpen(true);
          }}
          onNodeEdit={handleNodeEdit}
          onNodeAddChild={handleNodeAddChild}
          onNodeDelete={(nodeId) => {
            if (!project || isReadOnly) {
              if (!user) {
                router.push('/login');
              }
              return;
            }
            
            // 하위 노드까지 재귀적으로 삭제 (인덱스 맵 사용)
            const deleteNodeAndChildren = (id: string): string[] => {
              const targetNode = nodeMap.get(id);
              if (!targetNode) return [];
              const children = targetNode.children.flatMap(childId => deleteNodeAndChildren(childId));
              return [id, ...children];
            };

            const idsToDelete = deleteNodeAndChildren(nodeId);
            
            // 삭제된 노드와 하위 노드들을 필터링하고, 부모 노드의 children 배열에서도 제거
            let updatedNodes = nodes
              .filter(n => !idsToDelete.includes(n.id))
              .map(n => {
                // 부모 노드의 children 배열에서 삭제된 노드 ID 제거
                if (n.children.some(childId => idsToDelete.includes(childId))) {
                  return { 
                    ...n, 
                    children: n.children.filter(id => !idsToDelete.includes(id)),
                    updatedAt: Date.now()
                  };
                }
                return n;
              });

            // 자동 레이아웃 적용
            const layoutType = project.layoutType || 'radial';
            const layoutConfig = project.layoutConfig || { autoLayout: true };
            updatedNodes = applyAutoLayoutAfterDelete(updatedNodes, nodeId, layoutType, layoutConfig);

            handleNodesChange(updatedNodes);
            
            // 삭제된 노드의 탭이 열려있으면 닫기
            const tabToClose = tabs.find(t => t.nodeId === nodeId);
            if (tabToClose) {
              handleTabClose(tabToClose.id);
            }
          }}
          onNodeOpenInNewTab={handleNodeOpenInNewTab}
          onStartEdit={setEditingNodeId}
          onEndEdit={() => setEditingNodeId(null)}
          projectId={projectId}
          onTagDrop={handleTagDrop}
        />
        </div>

        {/* 배경 오버레이 (모바일용, 선택사항) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/10 md:hidden z-50"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* 통합 사이드바 */}
        <AnimatePresence>
          {isSidebarOpen && (
            <UnifiedSidebar
              selectedNodeId={selectedNodeId}
              selectedNodeLabel={selectedNode?.label || null}
              selectedNodeType={selectedNode?.nodeType}
              selectedNodeLevel={selectedNode?.level}
              nodes={nodes}
              onSTARComplete={handleSTARComplete}
              onNodeAdd={(parentId, label, nodeType) => {
                // 새 노드 생성 (인덱스 맵 사용)
                const parent = nodeMap.get(parentId);
                if (!parent || !project) return;

                // 임시 좌표 (자동 레이아웃에서 재계산됨)
                const x = parent.x;
                const y = parent.y;

                const newNode: MindMapNode = {
                  id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  label,
                  parentId,
                  children: [],
                  x,
                  y,
                  level: parent.level + 1,
                  nodeType,
                  isManuallyPositioned: false, // 자동 레이아웃으로 배치
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };

                // 부모 노드의 children 업데이트
                let updatedNodes = nodes.map(n =>
                  n.id === parentId
                    ? { ...n, children: [...n.children, newNode.id], updatedAt: Date.now() }
                    : n
                );
                updatedNodes.push(newNode);

                // 자동 레이아웃 적용
                const layoutType = project.layoutType || 'radial';
                const layoutConfig = project.layoutConfig || { autoLayout: true };
                updatedNodes = applyAutoLayoutForNewNode(updatedNodes, newNode, layoutType, layoutConfig);

                handleNodesChange(updatedNodes);
                setSelectedNodeId(newNode.id);
              }}
              onNodeLabelUpdate={(nodeId, newLabel) => {
                // 노드 라벨 업데이트
                const updatedNodes = nodes.map(n =>
                  n.id === nodeId
                    ? { ...n, label: newLabel, updatedAt: Date.now() }
                    : n
                );
                handleNodesChange(updatedNodes);
              }}
              onClose={() => {
                setIsSidebarOpen(false);
              }}
              onTagDrop={(tag, targetNodeId) => handleTagDrop(targetNodeId, tag)}
              defaultMainTab={sidebarMainTab}
            />
          )}
        </AnimatePresence>
      </div>

      {/* STAR 에디터 */}
      <STAREditor
        isOpen={isSTAREditorOpen}
        onClose={() => {
          setIsSTAREditorOpen(false);
          setStarData(null);
        }}
        nodeId={selectedNodeId}
        nodeLabel={selectedNode?.label || null}
        onNodeLabelUpdate={(nodeId, newLabel) => {
          // 노드 라벨 업데이트
          const updatedNodes = nodes.map(n =>
            n.id === nodeId
              ? { ...n, label: newLabel, updatedAt: Date.now() }
              : n
          );
          handleNodesChange(updatedNodes);
        }}
        initialData={starData || undefined}
      />


      {/* 노드 추가 다이얼로그 */}
      {showConfirmDialog && droppedTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={handleCancelAddTag}>
          <div className="glass-card rounded-[24px] p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e5e5e5]">노드 추가하기</h3>
              <button
                onClick={handleCancelAddTag}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 dark:hover:bg-[#2a2a2a]/50 rounded-full transition-colors"
                title="닫기"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-[#a0a0a0]" />
              </button>
            </div>
            
            {/* 간단한 정보 */}
            <div className="mb-8 space-y-2">
              {(() => {
                // 인덱스 맵 사용
                const targetNode = nodeMap.get(droppedTag.targetNodeId);
                if (!targetNode) return null;
                
                // 노드 층위에 따른 안내 문구
                let guidanceText = '';
                let placeholderText = '노드 이름을 입력하세요';
                
                if (targetNode.nodeType === 'category' || targetNode.level === 1) {
                  // 범주 → 경험 추가
                  guidanceText = `"${targetNode.label}" 범주에 어떤 경험이 있었나요?`;
                  placeholderText = '예: 웹 개발 프로젝트, 모바일 앱 개발 등';
                } else if (targetNode.nodeType === 'experience' || targetNode.level === 2) {
                  // 경험 → 에피소드 추가
                  guidanceText = `"${targetNode.label}" 경험에서 어떤 에피소드가 있었나요?`;
                  placeholderText = '예: 프로젝트 초기 기획 단계, 개발 중 발생한 문제 해결 등';
                } else if (targetNode.nodeType === 'episode' || targetNode.level === 3) {
                  // 에피소드 → 세부 내용 추가
                  guidanceText = `"${targetNode.label}" 에피소드의 세부 내용을 추가해보세요`;
                  placeholderText = '예: 구체적인 상황, 해결 과정 등';
                } else {
                  // 기타 → 하위 노드 추가
                  guidanceText = `"${targetNode.label}"의 하위 내용을 추가해보세요`;
                  placeholderText = '노드 이름을 입력하세요';
                }
                
                return (
                  <>
                    <p className="text-sm text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                      {guidanceText}
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-sm text-gray-500 dark:text-[#a0a0a0]">관련 역량:</span>
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-[#60A5FA] border-blue-200 dark:border-blue-600 text-xs font-medium">
                        {droppedTag.tag.category}
                      </Badge>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 입력 필드 */}
            <div className="mb-8">
              {(() => {
                // 인덱스 맵 사용
                const targetNode = nodeMap.get(droppedTag.targetNodeId);
                let placeholderText = '노드 이름을 입력하세요';
                
                if (targetNode?.nodeType === 'category' || targetNode?.level === 1) {
                  placeholderText = '예: 웹 개발 프로젝트, 모바일 앱 개발 등';
                } else if (targetNode?.nodeType === 'experience' || targetNode?.level === 2) {
                  placeholderText = '예: 프로젝트 초기 기획 단계, 개발 중 발생한 문제 해결 등';
                } else if (targetNode?.nodeType === 'episode' || targetNode?.level === 3) {
                  placeholderText = '예: 구체적인 상황, 해결 과정 등';
                }
                
                return (
                  <Input
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleConfirmAddTag();
                      } else if (e.key === 'Escape') {
                        handleCancelAddTag();
                      }
                    }}
                    placeholder={placeholderText}
                    className="h-14 rounded-[16px] border-gray-200 dark:border-[#2a2a2a] focus:border-gray-900 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-gray-100 dark:focus:ring-blue-900/50 text-base bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-[#e5e5e5]"
                    autoFocus
                  />
                );
              })()}
            </div>
            
            {/* 버튼 */}
            <div className="flex gap-3">
              <Button 
                onClick={handleCancelAddTag}
                variant="outline"
                className="flex-1 h-14 rounded-[16px] border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-[#e5e5e5] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] font-semibold"
              >
                취소
              </Button>
              <Button 
                onClick={handleConfirmAddTag}
                className="flex-1 h-14 bg-gray-900 dark:bg-[#1e3a8a] hover:bg-gray-800 dark:hover:bg-[#1e40af] rounded-[16px] text-white font-semibold"
              >
                생성하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 마인드맵 온보딩 오버레이 (최초 1회) */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl glass-card rounded-[24px] shadow-2xl p-8 relative"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => {
                mindMapOnboardingStorage.saveShown();
                setShowOnboarding(false);
              }}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100/50 dark:hover:bg-[#2a2a2a]/50 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-[#a0a0a0]" />
            </button>

            {/* 콘텐츠 */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-blue-600 dark:text-[#60A5FA] mb-2">마인드맵 튜토리얼</p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-3">
                {onboardingStep === 0 && '계층 구조로 경험 정리하기'}
                {onboardingStep === 1 && '공백 진단으로 부족한 경험 찾기'}
                {onboardingStep === 2 && '어시스턴트로 노드 확장하기'}
                {onboardingStep === 3 && '캔버스 조작과 노드 편집'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                {onboardingStep === 0 &&
                  'episode의 마인드맵은 중심-범주-경험-에피소드 구조로 경험을 정리합니다. 먼저 중심 노드를 기준으로 범주(인턴, 동아리 등)를 만들고, 그 안에 구체적인 경험과 에피소드를 쌓아가세요.'}
                {onboardingStep === 1 &&
                  '상단의 공백 진단하기 버튼을 눌러 5개년 기출 자소서 문항을 기준으로 부족한 역량을 찾을 수 있어요. 진단 결과는 추천 인벤토리로 들어가 드래그앤드롭으로 마인드맵에 바로 추가할 수 있습니다.'}
                {onboardingStep === 2 &&
                  '오른쪽 어시스턴트를 열고 범주/경험/에피소드 노드를 선택하면, STAR 기법에 맞춰 질문을 던지며 자동으로 노드를 확장하고 STAR 내용을 채워줍니다.'}
                {onboardingStep === 3 &&
                  '노드를 드래그해서 위치를 바꾸고, 더블클릭으로 이름을 수정할 수 있어요. 우클릭 메뉴에서 하위 노드 추가, STAR 정리하기, 공유 링크 만들기 등 주요 기능을 사용할 수 있습니다.'}
              </p>
            </div>

            {/* 하단 네비게이션 */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => {
                  mindMapOnboardingStorage.saveShown();
                  setShowOnboarding(false);
                }}
                className="text-xs text-gray-400 dark:text-[#606060] hover:text-gray-600 dark:hover:text-[#a0a0a0] transition-colors"
              >
                건너뛰기
              </button>

              <div className="flex items-center gap-4">
                {/* 단계 인디케이터 */}
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3].map((step) => (
                    <button
                      key={step}
                      onClick={() => setOnboardingStep(step)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        onboardingStep === step
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>

                {/* 다음/이전 버튼 */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={onboardingStep === 0}
                    onClick={() => setOnboardingStep((prev) => Math.max(prev - 1, 0))}
                    className="h-9 px-3 text-xs rounded-full disabled:opacity-40"
                  >
                    이전
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (onboardingStep < 3) {
                        setOnboardingStep((prev) => Math.min(prev + 1, 3));
                      } else {
                        mindMapOnboardingStorage.saveShown();
                        setShowOnboarding(false);
                      }
                    }}
                    className="h-9 px-4 text-xs rounded-full bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {onboardingStep < 3 ? '다음' : '시작하기'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 공유 다이얼로그 */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="w-full max-w-[520px] sm:max-w-[640px] p-0 overflow-hidden">
          <div className="p-6 space-y-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-600" />
                마인드맵 공유
              </DialogTitle>
            </DialogHeader>

            <div className="rounded-[16px] border border-gray-200 dark:border-[#2a2a2a] bg-gray-50/70 dark:bg-[#111111] p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">링크 액세스</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    링크가 있는 누구나 내용을 볼 수 있고 로그인 시 편집할 수 있어요.
                  </p>
                </div>
                <Button
                  onClick={project?.isShared ? handleProjectUnshare : handleProjectShare}
                  disabled={isShareProcessing}
                  className="rounded-[12px] w-full sm:w-auto"
                >
                  {project?.isShared ? '공유 해제' : '공유 켜기'}
                </Button>
              </div>

              {project?.isShared ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-sm text-gray-800 dark:text-gray-100 max-w-full">
                    <Link2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="block truncate text-xs max-w-[260px] sm:max-w-[320px]">
                      {shareLink || '링크를 불러오는 중...'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCopyShareLink}
                    className="rounded-[12px] px-3"
                  >
                    {shareCopyState === 'copied' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="h-4 w-4" />
                        복사됨
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="h-4 w-4" />
                        링크 복사
                      </span>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  공유를 켜면 링크가 생성되고 /mindmap/&lt;projectId&gt; 경로로 접근할 수 있어요.
                </p>
              )}
            </div>

            <div className="rounded-[16px] border border-gray-200 dark:border-[#2a2a2a] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Users className="h-4 w-4 text-blue-600" />
                공동 작업자
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 flex items-center justify-center font-semibold">
                    {(user?.name || user?.email || '나').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.name || '나'}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {project?.isShared ? '편집 가능 (로그인 시)' : '공유 비활성화'}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-300">
                  소유자
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                링크가 있는 누구나 열람 가능하며, 로그인하면 편집이 허용됩니다.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 설정 다이얼로그 */}
      <MindMapSettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        settings={settings}
        currentLayout={project?.layoutType || 'radial'}
        onLayoutChange={async (newLayout: LayoutType) => {
          if (!project || !user) return;
          const updatedProject = {
            ...project,
            layoutType: newLayout,
            updatedAt: Date.now(),
          };
          await updateProject(projectId, { layoutType: newLayout });
          await mindMapProjectStorage.update(projectId, updatedProject);
          setProject(updatedProject);
          applyLayout(nodes, newLayout, project.layoutConfig || {});
        }}
        onSettingsChange={async (newSettings) => {
          setSettings(newSettings);
          setShowGrid(newSettings.showGrid || false);

          // 설정을 프로젝트에 저장
          if (project) {
            const updatedProject = {
              ...project,
              settings: newSettings,
              updatedAt: Date.now(),
            };
            await mindMapProjectStorage.update(projectId, updatedProject);
            setProject(updatedProject);
          }
        }}
      />

      {/* 공유 다이얼로그 */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="w-full max-w-[520px] sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>공유</DialogTitle>
            <DialogDescription>링크를 켜고 복사해서 팀원과 함께 보거나 편집하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111]">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">프로젝트 공유</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">토글을 켜면 /mindmaps의 ‘공동 마인드맵’에 표시됩니다.</p>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 accent-blue-600"
                checked={project?.isShared || false}
                disabled={isSharingUpdate || !project}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  if (!project) return;
                  setIsSharingUpdate(true);
                  try {
                    const updated: MindMapProject = {
                      ...project,
                      isShared: checked,
                      sharedBy: checked ? user?.id : undefined,
                      sharedByUser: checked && user ? { id: user.id, name: user.name || user.email || 'user' } : undefined,
                      updatedAt: Date.now(),
                    };
                    await updateProject(projectId, updated);
                    setProject(updated);
                    if (typeof window !== 'undefined') {
                      setShareLink(checked ? `${window.location.origin}/mindmap/${projectId}` : '');
                    }
                  } catch (error) {
                    console.error('공유 상태 업데이트 실패', error);
                    alert('공유 상태를 변경하지 못했습니다. 다시 시도해주세요.');
                  } finally {
                    setIsSharingUpdate(false);
                  }
                }}
              />
            </div>

              <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">링크 복사</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-sm text-gray-800 dark:text-gray-100 max-w-full">
                  <Link2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="block truncate text-xs max-w-[260px] sm:max-w-[320px]">
                    {shareUrl || '링크를 불러오는 중...'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const url = shareUrl;
                    try {
                      await navigator.clipboard.writeText(url);
                    } catch {
                      const textarea = document.createElement('textarea');
                      textarea.value = url;
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                    }
                    alert('링크가 복사되었습니다.');
                  }}
                >
                  링크 복사
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">공유가 켜진 상태에서 접속한 사용자는 보기/편집이 가능합니다.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </DndProvider>
  );
}
