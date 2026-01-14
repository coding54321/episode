'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import LayoutSelector from '@/components/mindmap/LayoutSelector';
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
import Header from '@/components/Header';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { saveNodes, updateNode, updateProject, getSharedProject, updateActiveEditor, getActiveEditors, removeActiveEditor, type ActiveEditor } from '@/lib/supabase/data';
import { applyLayout, applyAutoLayoutForNewNode, applyAutoLayoutAfterDelete } from '@/lib/layouts';
import { Lock } from 'lucide-react';

export default function MindMapWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId'); // 쿼리 파라미터에서 초기 프로젝트 ID
  const nodeId = useMemo(() => searchParams.get('nodeId'), [searchParams]);

  // 현재 활성 탭의 프로젝트 ID (탭 전환 시 변경됨, DB 작업 등에 사용)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId);

  const WORKSPACE_STORAGE_KEY = 'episode_mindmap_workspace_v1';
  const workspaceRestoredRef = useRef(false);

  const shareUrl = useMemo(
    () => activeProjectId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/mindmap/${activeProjectId}` : '',
    [activeProjectId]
  );
  const { user, loading: authLoading } = useUnifiedAuth(); // 전역 상태에서 사용자 정보 가져오기
  
  const [project, setProject] = useState<MindMapProject | null>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  // 탭별 독립 상태 관리 (Figma 스타일)
  const [tabStates, setTabStates] = useState<Map<string, TabState>>(new Map());
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
  const [isAddNodeMode, setIsAddNodeMode] = useState(false);
  const [cursorMode, setCursorMode] = useState<'select' | 'move'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ nodeId: string; nodeLabel: string; projectId: string; projectName: string; nodePath: string[] }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // 역량 필터 상태
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
  const [isCompetencyFilterOpen, setIsCompetencyFilterOpen] = useState(false);
  const [competencyStats, setCompetencyStats] = useState<Array<{ competency: string; count: number; nodeIds: string[] }>>([]);
  const competencyFilterRef = useRef<HTMLDivElement>(null);
  

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

  // 탭 상태 저장 헬퍼 함수
  const saveCurrentTabState = useCallback((tabId: string) => {
    setTabStates(prev => {
      const newMap = new Map(prev);
      newMap.set(tabId, {
        project,
        nodes,
        selectedNodeId,
        focusNodeId,
      });
      return newMap;
    });
  }, [project, nodes, selectedNodeId, focusNodeId]);

  // 탭 상태 복원 헬퍼 함수
  const restoreTabState = useCallback((tabId: string) => {
    const state = tabStates.get(tabId);
    if (state) {
      setProject(state.project);
      setNodes(state.nodes);
      setSelectedNodeId(state.selectedNodeId);
      setFocusNodeId(state.focusNodeId);
      return true;
    }
    return false;
  }, [tabStates]);

  // 워크스페이스 탭 상태 복원 (새로고침 대비)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        tabs?: Tab[];
        activeTabId?: string;
        activeProjectId?: string | null;
        tabStates?: Array<{
          tabId: string;
          project: MindMapProject | null;
          nodes: MindMapNode[];
          selectedNodeId: string | null;
          focusNodeId: string | null;
        }>;
      };

      if (!parsed.tabs || parsed.tabs.length === 0) return;

      setTabs(parsed.tabs);
      setActiveTabId(parsed.activeTabId || 'main');
      setActiveProjectId(parsed.activeProjectId || null);

      const stateMap = new Map<string, TabState>();
      (parsed.tabStates || []).forEach((s) => {
        stateMap.set(s.tabId, {
          project: s.project,
          nodes: s.nodes || [],
          selectedNodeId: s.selectedNodeId,
          focusNodeId: s.focusNodeId,
        });
      });
      setTabStates(stateMap);

      // 활성 프로젝트 탭 상태 복원
      const activeTab = parsed.tabs.find(
        (t) => t.id === (parsed.activeTabId || 'main') && t.type === 'project' && t.projectId,
      );
      if (activeTab) {
        const activeState = stateMap.get(activeTab.id);
        if (activeState) {
          setProject(activeState.project);
          setNodes(activeState.nodes);
        }
      }

      workspaceRestoredRef.current = true;
    } catch (error) {
      console.error('[mindmap/workspace] 탭 상태 복원 실패', error);
    }
  }, []);

  // 탭 상태가 변경될 때 워크스페이스 스냅샷 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const snapshot = {
        tabs,
        activeTabId,
        activeProjectId,
        tabStates: Array.from(tabStates.entries()).map(([tabId, state]) => ({
          tabId,
          project: state.project,
          nodes: state.nodes,
          selectedNodeId: state.selectedNodeId,
          focusNodeId: state.focusNodeId,
        })),
      };
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error('[mindmap/workspace] 탭 상태 저장 실패', error);
    }
  }, [tabs, activeTabId, activeProjectId, tabStates]);

  // 초기 프로젝트 로드 (쿼리 파라미터에서 projectId가 있을 때만, 이후 탭 변경에는 관여하지 않음)
  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) {
      return;
    }

    // 워크스페이스가 이미 복원된 경우, 초기 로드는 건너뜀
    if (workspaceRestoredRef.current) {
      return;
    }

    // 초기 프로젝트 ID가 없으면 로드하지 않음 (탭에서 프로젝트를 열 때는 handleTabClick에서 처리)
    if (!initialProjectId) {
      return;
    }

    // 이미 같은 프로젝트가 활성화되어 있으면 로드하지 않음
    if (activeProjectId === initialProjectId && project) {
      return;
    }

    const loadProject = async () => {
      try {
        let loadedProject: MindMapProject | null = null;
        let isSharedAccess = false;
        let isOwnerFlag = false;

        // 먼저 로그인된 사용자의 프로젝트로 시도 (재시도 로직 포함)
        if (user) {
          const { getProject } = await import('@/lib/supabase/data');
          
          // 프로젝트 생성 직후 DB 동기화를 위해 최대 3번 재시도
          for (let attempt = 0; attempt < 3; attempt++) {
            loadedProject = await getProject(initialProjectId, user.id);
            if (loadedProject) {
              isOwnerFlag = true;
              setIsOwner(true);
              setIsReadOnly(false);
              break;
            }
            // 마지막 시도가 아니면 잠시 대기
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        // 로그인된 사용자의 프로젝트가 아니면 공유된 프로젝트인지 확인
        // 개인 마인드맵은 공유 링크로 접근 불가
        if (!loadedProject) {
          const { getSharedProject } = await import('@/lib/supabase/data');
          loadedProject = await getSharedProject(initialProjectId);
          if (loadedProject) {
            // 공동 마인드맵만 공유 링크로 접근 가능
            if (loadedProject.projectType === 'collaborative') {
              isSharedAccess = true;
              isOwnerFlag = false;
              setIsOwner(false);
              // 로그인 안 된 경우 읽기 전용
              setIsReadOnly(!user);
            } else {
              // 개인 마인드맵은 공유 링크로 접근 불가
              loadedProject = null;
            }
          }
        }

        if (!loadedProject) {
          console.warn('[mindmap/workspace] 프로젝트를 찾을 수 없음', { projectId: initialProjectId, userId: user?.id });
          if (user) {
            router.push('/mindmaps');
          } else {
            router.push('/login');
          }
          return;
        }

        // 개인 마인드맵 권한 체크
        if (loadedProject.projectType === 'personal') {
          if (!isOwnerFlag) {
            // 개인 마인드맵은 소유자만 접근 가능
            console.warn('[mindmap/workspace] 개인 마인드맵 접근 거부', { projectId: initialProjectId, userId: user?.id, isOwnerFlag });
            router.push('/mindmaps');
            return;
          }
          setIsReadOnly(false);
        }
        // 공동 마인드맵 권한 체크
        else if (loadedProject.projectType === 'collaborative') {
          if (isOwnerFlag) {
            setIsReadOnly(false);
          } else if (loadedProject.isShared && user) {
            setIsReadOnly(false); // 로그인 사용자 편집 가능
          } else if (loadedProject.isShared && !user) {
            setIsReadOnly(true); // 비로그인 사용자 읽기 전용
          } else {
            // 공유되지 않은 공동 마인드맵은 소유자만 접근
            router.push('/mindmaps');
            return;
          }
        }

        console.log('[mindmap/workspace] 프로젝트 로드 완료', {
          projectId: initialProjectId,
          projectName: loadedProject.name,
          nodeCount: loadedProject.nodes.length,
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

        currentProjectStorage.save(initialProjectId);

        // activeProjectId 설정
        setActiveProjectId(initialProjectId);

        // 탭 초기화 및 관리
        setTabs(prev => {
          // 현재 프로젝트의 메인 탭이 이미 있는지 확인
          const existingMainTab = prev.find(t =>
            (t.id === 'main' && !t.projectId) ||
            (t.type === 'project' && t.projectId === initialProjectId && !t.nodeId)
          );

          if (existingMainTab) {
            // 기존 탭이 있으면 라벨만 업데이트하고 해당 탭으로 전환
            setActiveTabId(existingMainTab.id);
            return prev.map(tab =>
              tab.id === existingMainTab.id
                ? { ...tab, label: loadedProject.name }
                : tab
            );
          } else {
            // 기존 탭이 없으면 새로 추가
            const mainTab: Tab = {
              id: prev.length === 0 ? 'main' : `project_${initialProjectId}`,
              label: loadedProject.name,
              nodeId: null,
              href: `/mindmap?projectId=${initialProjectId}`,
              type: 'project',
              projectId: initialProjectId,
            };
            setActiveTabId(mainTab.id);
            return [...prev, mainTab];
          }
        });

        // 초기 탭 상태 저장 (Figma 스타일)
        const tabId = tabs.find(t => t.type === 'project' && t.projectId === initialProjectId && !t.nodeId)?.id || 
                     (tabs.length === 0 ? 'main' : `project_${initialProjectId}`);
        const layoutConfigForState = loadedProject.layoutConfig || { autoLayout: true };
        const initialNodes = layoutConfigForState.autoLayout && loadedProject.nodes.length > 0
          ? applyLayout(loadedProject.nodes, loadedProject.layoutType || 'radial', layoutConfigForState)
          : loadedProject.nodes;

        setTabStates(prevStates => {
          const newMap = new Map(prevStates);
          newMap.set(tabId, {
            project: loadedProject,
            nodes: initialNodes,
            selectedNodeId: null,
            focusNodeId: nodeId || null,
          });
          return newMap;
        });

        // nodeId가 있으면 포커스 설정
        if (nodeId) {
          setFocusNodeId(nodeId);
        }

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
      const cleanupProjectId = activeProjectId || initialProjectId;
      if (user && cleanupProjectId) {
        removeActiveEditor(cleanupProjectId, user.id).catch(console.error);
      }
    };
  }, [initialProjectId, nodeId, router, user, authLoading]);

  // 편집자 추적 (로그인된 사용자만)
  useEffect(() => {
    if (!user || !project || isReadOnly || !activeProjectId) {
      return;
    }

    // 즉시 등록
    const registerEditor = async () => {
      await updateActiveEditor(activeProjectId, user.id, user.name || undefined, user.email || undefined);
    };
    registerEditor();

    // 30초마다 last_seen 업데이트
    editorTrackingIntervalRef.current = setInterval(() => {
      updateActiveEditor(activeProjectId, user.id, user.name || undefined, user.email || undefined).catch(console.error);
    }, 30000);

    // 페이지 떠날 때 정리
    return () => {
      if (editorTrackingIntervalRef.current) {
        clearInterval(editorTrackingIntervalRef.current);
        editorTrackingIntervalRef.current = null;
      }
      removeActiveEditor(activeProjectId, user.id).catch(console.error);
    };
  }, [user, project, activeProjectId, isReadOnly]);

  // 활성 편집자 목록 폴링 (공동 마인드맵이고 공유된 프로젝트인 경우)
  useEffect(() => {
    if (project?.projectType !== 'collaborative' || !project?.isShared || !activeProjectId) {
      return;
    }

    const pollActiveEditors = async () => {
      const editors = await getActiveEditors(activeProjectId);
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
  }, [project?.isShared, activeProjectId]);

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

  // URL의 nodeId가 있으면 해당 처리 (초기 딥링크 전용)
  useEffect(() => {
    if (!nodeId || !project) {
      return;
    }

    const node = project.nodes.find(n => n.id === nodeId);
    if (!node) return;

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
      
      // URL에서 focus 파라미터 제거 (워크스페이스 경로 유지, 히스토리에 남기지 않음)
      if (activeProjectId) {
        router.replace(`/mindmap?projectId=${activeProjectId}`, { scroll: false });
      }
    } else {
      // 기존 탭 방식: 해당 노드를 위한 탭 생성
      const tabId = `node_${nodeId}`;
      
      setTabs(prev => {
        const existingTab = prev.find(t => t.id === tabId);
        
        if (!existingTab) {
          const newTab: Tab = {
            id: tabId,
            label: typeof node.label === 'string' ? node.label : '노드',
            nodeId: nodeId,
            href: `/mindmap?projectId=${activeProjectId}&nodeId=${nodeId}`,
            type: 'node',
          };
          return [...prev, newTab];
        }
        return prev;
      });
      
      setActiveTabId(tabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, project, activeProjectId, searchParams]);

  // 실시간 동기화
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'episode_mindmap_projects' && e.newValue) {
        try {
          const projects = JSON.parse(e.newValue);
          const updatedProject = projects.find((p: MindMapProject) => p.id === activeProjectId);
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
      if (customEvent.detail && customEvent.detail.projectId === activeProjectId) {
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
  }, [activeProjectId]);

  // 노드 인덱스 맵 생성 (O(1) 조회를 위해)
  const nodeMap = useMemo(() => {
    return new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);

  // 노드까지의 경로를 가져오는 함수 (호이스팅 문제 해결을 위해 useEffect 이전에 정의)
  const getNodePath = useCallback((node: MindMapNode, allNodes: MindMapNode[]): string[] => {
    const path: string[] = [];
    let currentNode: MindMapNode | undefined = node;

    while (currentNode) {
      const label = typeof currentNode.label === 'string' ? currentNode.label : '노드';
      // 모든 노드 타입을 경로에 포함 (제외 로직 제거)
      path.unshift(label);
      
      if (!currentNode.parentId) break;
      currentNode = allNodes.find((n) => n.id === currentNode!.parentId);
    }

    return path;
  }, []);

  // 검색 기능
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  // 검색 실행
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        const projects = await mindMapProjectStorage.loadWithNodes();
        const results: Array<{ nodeId: string; nodeLabel: string; projectId: string; projectName: string; nodePath: string[] }> = [];

        // 검색어를 소문자로 변환
        const query = searchQuery.toLowerCase();

        for (const proj of projects) {
          // 프로젝트 이름으로 검색
          const projectMatches = proj.name.toLowerCase().includes(query);

          // nodes가 없거나 빈 배열인 경우 건너뛰기
          if (!proj.nodes || !Array.isArray(proj.nodes) || proj.nodes.length === 0) {
            continue;
          }

          for (const node of proj.nodes) {
            // 노드 이름으로 검색
            const nodeLabel = typeof node.label === 'string' ? node.label : '';
            const nodeMatches = nodeLabel.toLowerCase().includes(query);

            // 프로젝트 또는 노드가 매칭되면 결과에 추가
            if (projectMatches || nodeMatches) {
              // 모든 노드 타입을 검색 가능하도록 변경 (제외 로직 제거)
              
              // 노드까지의 경로 생성
              const path = getNodePath(node, proj.nodes);

              results.push({
                nodeId: node.id,
                nodeLabel,
                projectId: proj.id,
                projectName: proj.name,
                nodePath: path,
              });
            }
          }
        }

        // 결과를 프로젝트별, 경로 깊이별로 정렬
        results.sort((a, b) => {
          if (a.projectName !== b.projectName) {
            return a.projectName.localeCompare(b.projectName);
          }
          return a.nodePath.length - b.nodePath.length;
        });

        setSearchResults(results.slice(0, 10)); // 최대 10개만 표시
        setShowSearchResults(true);
      } catch (error) {
        console.error('검색 중 오류 발생:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    };

    performSearch();
  }, [searchQuery, getNodePath]);

  // 역량 통계 계산 (프로젝트와 노드가 로드된 후)
  useEffect(() => {
    const calculateCompetencyStats = async () => {
      if (!project || !nodes || nodes.length === 0 || !user) {
        setCompetencyStats([]);
        return;
      }

      try {
        // 현재 프로젝트의 모든 노드에 대한 STAR Asset 로드
        const starAssets: STARAsset[] = [];
        for (const node of nodes) {
          const asset = await assetStorage.getByNodeId(node.id);
          if (asset && asset.tags && asset.tags.length > 0) {
            starAssets.push(asset);
          }
        }

        // 역량별로 노드 ID 집계
        const competencyMap = new Map<string, Set<string>>();
        
        // COMPETENCY_KEYWORDS의 모든 역량을 초기화
        COMPETENCY_KEYWORDS.forEach(competency => {
          competencyMap.set(competency, new Set());
        });

        // STAR Asset의 태그를 기반으로 역량별 노드 ID 수집
        starAssets.forEach(asset => {
          if (asset.tags && asset.tags.length > 0) {
            asset.tags.forEach(tag => {
              const competency = tag.trim();
              if (competency) {
                if (!competencyMap.has(competency)) {
                  competencyMap.set(competency, new Set());
                }
                competencyMap.get(competency)!.add(asset.nodeId);
              }
            });
          }
        });

        // 통계 배열로 변환 (개수가 0보다 큰 것만)
        const stats = Array.from(competencyMap.entries())
          .map(([competency, nodeIds]) => ({
            competency,
            count: nodeIds.size,
            nodeIds: Array.from(nodeIds),
          }))
          .filter(stat => stat.count > 0)
          .sort((a, b) => b.count - a.count); // 개수 순으로 정렬

        setCompetencyStats(stats);
      } catch (error) {
        console.error('Failed to calculate competency stats:', error);
        setCompetencyStats([]);
      }
    };

    calculateCompetencyStats();
  }, [project, nodes, user]);

  // 하이라이트된 노드 ID 집합 계산
  const highlightedNodeIds = useMemo(() => {
    if (selectedCompetencies.length === 0) {
      return new Set<string>();
    }

    const highlightedSet = new Set<string>();
    selectedCompetencies.forEach(competency => {
      const stat = competencyStats.find(s => s.competency === competency);
      if (stat) {
        stat.nodeIds.forEach(nodeId => highlightedSet.add(nodeId));
      }
    });

    return highlightedSet;
  }, [selectedCompetencies, competencyStats]);

  // 역량 필터 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        competencyFilterRef.current &&
        !competencyFilterRef.current.contains(event.target as Node)
      ) {
        setIsCompetencyFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 검색어 하이라이트 함수
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-gray-100">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  // 검색 결과 클릭 핸들러
  const handleSearchResultClick = async (result: { nodeId: string; projectId: string; nodeLabel: string; projectName: string; nodePath: string[] }) => {
    // 같은 프로젝트 내 노드면 현재 페이지에서 포커스 이동 (URL 변경 없음)
    if (result.projectId === activeProjectId) {
      setFocusNodeId(result.nodeId);
      setSelectedNodeId(result.nodeId);
    } else {
      // 다른 프로젝트면 해당 프로젝트 탭으로 전환 (URL 변경 없음)
      const targetTabId = `project_${result.projectId}`;
      const existingTab = tabs.find(t => t.type === 'project' && t.projectId === result.projectId);
      
      if (existingTab) {
        // 기존 탭이 있으면 해당 탭으로 전환
        await handleTabClick(existingTab.id);
        setFocusNodeId(result.nodeId);
        setSelectedNodeId(result.nodeId);
      } else {
        // 새 탭 생성 및 프로젝트 로드
        try {
          const targetProject = await mindMapProjectStorage.get(result.projectId);
          if (targetProject) {
            const newTab: Tab = {
              id: targetTabId,
              label: targetProject.name,
              nodeId: null,
              href: `/mindmap?projectId=${result.projectId}`,
              type: 'project',
              projectId: result.projectId,
            };
            setTabs(prev => [...prev, newTab]);
            setActiveProjectId(result.projectId);
            setProject(targetProject);
            
            // 자동 레이아웃 적용
            const layoutConfig = targetProject.layoutConfig || { autoLayout: true };
            if (layoutConfig.autoLayout && targetProject.nodes.length > 0) {
              const layoutType = targetProject.layoutType || 'radial';
              const layoutedNodes = applyLayout(targetProject.nodes, layoutType, layoutConfig);
              setNodes(layoutedNodes);
            } else {
              setNodes(targetProject.nodes);
            }
            
            setActiveTabId(targetTabId);
            setFocusNodeId(result.nodeId);
            setSelectedNodeId(result.nodeId);
            
            // 탭 상태 저장
            setTabStates(prev => {
              const newMap = new Map(prev);
              newMap.set(targetTabId, {
                project: targetProject,
                nodes: targetProject.nodes,
                selectedNodeId: result.nodeId,
                focusNodeId: result.nodeId,
              });
              return newMap;
            });
          }
        } catch (error) {
          console.error('Failed to load project for search result:', error);
          toast.error('프로젝트를 불러올 수 없습니다.');
        }
      }
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const activeTab = tabs.find(t => t.id === activeTabId);
  // isNodeView: activeTab이 undefined일 때 false, nodeId가 있을 때만 true
  const isNodeView = Boolean(activeTab?.nodeId);
  const getRootNode = (): MindMapNode | null => {
    if (!nodes || nodes.length === 0) return null;
    const centerByLevel = nodes.find((n) => n.level === 0);
    if (centerByLevel) return centerByLevel;
    const centerByParent = nodes.find((n) => !n.parentId);
    return centerByParent || nodes[0];
  };

  useEffect(() => {
    // 공동 마인드맵이고 공유가 활성화된 경우에만 링크 설정
    if (project?.projectType === 'collaborative' && project?.isShared && typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/mindmap/${activeProjectId}`);
    } else {
      setShareLink('');
    }
  }, [project?.projectType, project?.isShared, activeProjectId]);

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
    if (project && activeProjectId) {
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
          const success = await saveNodes(activeProjectId, newNodes);

          if (success) {
            // 저장 성공
            lastSavedNodesRef.current = newNodesHash;
            setSaveStatus('saved');

            // 프로젝트 메타데이터만 업데이트 (nodes는 제외하여 중복 저장 방지)
            if (activeProjectId) {
              await mindMapProjectStorage.update(activeProjectId, {
                updatedAt: Date.now(),
              });
            }

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
    if (isReadOnly || !activeProjectId) {
      if (!user) {
        router.push('/login');
      }
      return;
    }

    // 인덱스 맵 사용하여 더 효율적으로 업데이트
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    // 단일 노드 라벨 변경은 updateNode 함수 사용 (성능 최적화)
    const success = await updateNode(activeProjectId, nodeId, { label });
    
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
    if (!project || !editedTitle.trim() || !activeProjectId) {
      setIsEditingTitle(false);
      return;
    }

    const updatedProject: MindMapProject = {
      ...project,
      name: editedTitle.trim(),
      updatedAt: Date.now(),
    };
    await mindMapProjectStorage.update(activeProjectId, updatedProject);
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

  // 캔버스 클릭으로 노드 추가
  const handleCanvasAddNode = (x: number, y: number) => {
    if (isReadOnly || !project) return;

    const newNode: MindMapNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: '새 노드',
      parentId: null, // 독립 노드로 생성
      children: [],
      x,
      y,
      level: 4, // detail 레벨로 시작
      nodeType: 'detail',
      isManuallyPositioned: true, // 수동 배치
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedNodes = [...nodes, newNode];
    handleNodesChange(updatedNodes, false);
    setEditingNodeId(newNode.id);
    setIsAddNodeMode(false); // 노드 추가 모드 종료
  };

  // 노드 연결 (스냅 연결)
  const handleNodeConnect = (nodeId: string, parentId: string) => {
    if (isReadOnly || !project) return;

    const nodeToConnect = nodeMap.get(nodeId);
    const parentNode = nodeMap.get(parentId);
    if (!nodeToConnect || !parentNode) return;

    // 자기 자신이나 center 노드는 부모로 설정 불가
    if (nodeId === parentId || parentNode.nodeType === 'center' || parentNode.level === 0) {
      return;
    }

    // 이미 같은 부모를 가지고 있으면 무시
    if (nodeToConnect.parentId === parentId) {
      return;
    }

    // 기존 부모의 children에서 제거
    const updatedNodes = nodes.map(node => {
      if (node.id === nodeToConnect.parentId) {
        return {
          ...node,
          children: node.children.filter(id => id !== nodeId),
          updatedAt: Date.now(),
        };
      }
      // 새 부모의 children에 추가
      if (node.id === parentId) {
        return {
          ...node,
          children: [...node.children, nodeId],
          updatedAt: Date.now(),
        };
      }
      return node;
    });

    // 연결할 노드의 parentId와 level 업데이트
    const newLevel = parentNode.level + 1;
    const updatedNode = {
      ...nodeToConnect,
      parentId: parentId,
      level: newLevel,
      updatedAt: Date.now(),
    };

    const finalNodes = updatedNodes.map(n => n.id === nodeId ? updatedNode : n);
    handleNodesChange(finalNodes, false);
  };

  // ESC 키로 노드 추가 모드 종료
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAddNodeMode) {
        setIsAddNodeMode(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddNodeMode]);

  const handleSTARComplete = (data: { situation: string; task: string; action: string; result: string }) => {
    setStarData(data);
    setIsSTAREditorOpen(true);
  };

  const handleOpenShareDialog = () => {
    if (project?.isShared && typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/mindmap/${activeProjectId}`);
    }
    setIsShareDialogOpen(true);
  };

  const handleProjectShare = async () => {
    if (!project || !activeProjectId) {
      alert('공유할 프로젝트를 찾지 못했습니다.');
      return;
    }
    // 개인 마인드맵은 공유 불가
    if (project.projectType === 'personal') {
      alert('개인 마인드맵은 공유할 수 없습니다.');
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
      await updateProject(activeProjectId, {
        isShared: true,
        sharedBy: user.id,
        sharedByUser: { id: user.id, name: user.name || user.email || 'user' },
      });
      await mindMapProjectStorage.update(activeProjectId, updatedProject);
      setProject(updatedProject);
      if (typeof window !== 'undefined') {
        setShareLink(`${window.location.origin}/mindmap/${activeProjectId}`);
      }
    } catch (error) {
      console.error('[mindmap/page] 프로젝트 공유 실패', error);
    } finally {
      setIsShareProcessing(false);
    }
  };

  const handleProjectUnshare = async () => {
    if (!project || !activeProjectId) {
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
      await updateProject(activeProjectId, {
        isShared: false,
        sharedBy: undefined,
        sharedByUser: undefined,
      });
      await mindMapProjectStorage.update(activeProjectId, updatedProject);
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
      // 이미 열려있는 탭이면 해당 탭으로 전환 (URL 변경 없음)
      setActiveTabId(tabId);
      setFocusNodeId(nodeId);
    } else {
      // 새 탭 추가 (URL 변경 없음)
      const newTab: Tab = {
        id: tabId,
        label: typeof node.label === 'string' ? node.label : '노드',
        nodeId: nodeId,
        href: `/mindmap?projectId=${activeProjectId}&nodeId=${nodeId}`,
        type: 'node',
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(tabId);
      setFocusNodeId(nodeId);
    }
  };

  const handleTabClick = async (tabId: string) => {
    // 이미 활성 탭이면 아무것도 하지 않음
    if (tabId === activeTabId) return;

    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // 현재 탭 상태 저장
    saveCurrentTabState(activeTabId);

    // 새 파일 탭이면 단순히 탭만 전환
    if (tab.type === 'new') {
      setActiveTabId(tabId);
      return;
    }

    // 프로젝트 탭인 경우 상태 복원 또는 프로젝트 로드
    if (tab.type === 'project' && tab.projectId) {
      // activeProjectId 업데이트
      setActiveProjectId(tab.projectId);
      
      // 저장된 상태가 있으면 복원
      if (restoreTabState(tabId)) {
        setActiveTabId(tabId);
        return;
      }

      // 저장된 상태가 없으면 프로젝트 로드
      try {
        const targetProject = await mindMapProjectStorage.get(tab.projectId);
        if (targetProject) {
          setProject(targetProject);

          // 자동 레이아웃 적용
          const layoutConfig = targetProject.layoutConfig || { autoLayout: true };
          if (layoutConfig.autoLayout && targetProject.nodes.length > 0) {
            const layoutType = targetProject.layoutType || 'radial';
            const layoutedNodes = applyLayout(targetProject.nodes, layoutType, layoutConfig);
            setNodes(layoutedNodes);
          } else {
            setNodes(targetProject.nodes);
          }

          setSelectedNodeId(null);
          setFocusNodeId(null);
          setActiveTabId(tabId);

          // 새 탭 상태 저장
          setTabStates(prev => {
            const newMap = new Map(prev);
            newMap.set(tabId, {
              project: targetProject,
              nodes: targetProject.nodes,
              selectedNodeId: null,
              focusNodeId: null,
            });
            return newMap;
          });
        }
      } catch (error) {
        console.error('Failed to load project for tab:', error);
        toast.error('프로젝트를 불러올 수 없습니다.');
      }
      return;
    }

    // 노드 탭인 경우
    if (tab.nodeId) {
      if (restoreTabState(tabId)) {
        setActiveTabId(tabId);
      } else {
        setFocusNodeId(tab.nodeId);
        setActiveTabId(tabId);
      }
    }
  };

  const handleTabClose = (tabId: string) => {
    // 탭이 하나뿐이면 닫지 않음
    if (tabs.length <= 1) return;

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    // 탭 상태 제거
    setTabStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(tabId);
      return newMap;
    });

    // 탭 제거
    setTabs(prev => prev.filter(t => t.id !== tabId));

    // 닫은 탭이 활성 탭이면 인접 탭으로 전환
    if (activeTabId === tabId) {
      // 왼쪽 탭 우선, 없으면 오른쪽 탭
      const nextTabIndex = tabIndex > 0 ? tabIndex - 1 : 0;
      const nextTab = tabs.filter(t => t.id !== tabId)[nextTabIndex];

      if (nextTab) {
        // 상태 복원 또는 전환만 수행 (URL 변경 없음)
        if (restoreTabState(nextTab.id)) {
          setActiveTabId(nextTab.id);
        } else if (nextTab.type === 'new') {
          setActiveTabId(nextTab.id);
        } else {
          // 상태가 없으면 handleTabClick으로 로드
          handleTabClick(nextTab.id);
        }
      }
    }
  };

  // 탭 추가 버튼 클릭 핸들러
  const handleAddTab = () => {
    // 이미 '새 파일' 탭이 있으면 해당 탭으로 전환
    const existingNewTab = tabs.find(t => t.type === 'new');
    if (existingNewTab) {
      setActiveTabId(existingNewTab.id);
      return;
    }

    // 새 '새 파일' 탭 추가
    const newTab: Tab = {
      id: 'new',
      label: '새 파일',
      nodeId: null,
      href: `/mindmap?projectId=${activeProjectId}`,
      type: 'new',
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId('new');
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
          projectId={activeProjectId || undefined}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
          onAddTab={handleAddTab}
        />
      )}
      
      {/* 프로젝트 정보 */}
      {project && activeTabId !== 'new' && (
      <div className="bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#2a2a2a] px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/mindmaps">
              <Button variant="ghost" size="sm" className="px-2">
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
            </Link>
            <div className="flex items-center gap-3 flex-1">
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
                      className="text-lg font-bold text-gray-900 dark:text-[#e5e5e5] border-b-2 border-[#5B6EFF] dark:border-[#7B8FFF] bg-transparent focus:outline-none px-1"
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
                    {isNodeView && (
                      <p className="text-xs text-gray-500 dark:text-[#a0a0a0]">노드 중심 뷰</p>
                    )}
                  </div>
                )}
              </div>

              {/* 검색바 및 역량 필터 (마인드맵 명칭 오른쪽) */}
              {user && (
                <div className="flex items-center gap-2">
                  {/* 검색바 */}
                  <div className="relative hidden md:block" ref={searchRef}>
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <input
                      type="text"
                      placeholder="경험 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchQuery.trim() && searchResults.length > 0) {
                          setShowSearchResults(true);
                        }
                      }}
                      className="h-9 pl-10 pr-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm text-gray-900 dark:text-[#e5e5e5] placeholder-gray-500 dark:placeholder-[#606060] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-colors"
                    />
                    
                    {/* 검색 결과 드롭다운 */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                        {searchResults.map((result, index) => (
                          <button
                            key={`${result.projectId}-${result.nodeId}-${index}`}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50 transition-colors border-b border-gray-100 dark:border-[#2a2a2a] last:border-b-0"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {/* 노드 이름 */}
                                <div className="font-medium text-sm text-gray-900 dark:text-[#e5e5e5] truncate">
                                  {highlightText(result.nodeLabel, searchQuery)}
                                </div>
                                
                                {/* 경로 */}
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-[#a0a0a0]">
                                  <span className="truncate">
                                    {highlightText(result.projectName, searchQuery)}
                                  </span>
                                  {result.nodePath.length > 0 && (
                                    <>
                                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {result.nodePath.join(' > ')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 검색 결과 없음 */}
                    {showSearchResults && searchQuery.trim() && searchResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-lg shadow-lg p-4 z-50">
                        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center">
                          검색 결과가 없습니다
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 역량 필터 드롭다운 */}
                  <div className="relative hidden md:block" ref={competencyFilterRef}>
                    <button
                      onClick={() => setIsCompetencyFilterOpen(!isCompetencyFilterOpen)}
                      className={`h-9 px-3 flex items-center gap-2 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm text-gray-900 dark:text-[#e5e5e5] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors ${
                        selectedCompetencies.length > 0 ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                      }`}
                    >
                      <Filter className="w-4 h-4 text-gray-400" />
                      <span>역량 필터</span>
                      {selectedCompetencies.length > 0 && (
                        <Badge className="ml-1 bg-blue-500 dark:bg-blue-400 text-white text-xs px-1.5 py-0.5">
                          {selectedCompetencies.length}
                        </Badge>
                      )}
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCompetencyFilterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* 역량 필터 드롭다운 메뉴 */}
                    {isCompetencyFilterOpen && (
                      <div className="absolute top-full right-0 mt-2 w-64 glass-card rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                        <div className="p-2">
                          {/* 필터 초기화 버튼 */}
                          {selectedCompetencies.length > 0 && (
                            <button
                              onClick={() => {
                                setSelectedCompetencies([]);
                                setIsCompetencyFilterOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] rounded-md transition-colors flex items-center gap-2 mb-1"
                            >
                              <X className="w-4 h-4" />
                              <span>필터 초기화</span>
                            </button>
                          )}

                          {/* 역량 목록 */}
                          {competencyStats.length > 0 ? (
                            <div className="space-y-1">
                              {competencyStats.map((stat) => {
                                const isSelected = selectedCompetencies.includes(stat.competency);
                                return (
                                  <button
                                    key={stat.competency}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedCompetencies(prev => prev.filter(c => c !== stat.competency));
                                      } else {
                                        setSelectedCompetencies(prev => [...prev, stat.competency]);
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#2a2a2a] rounded-md transition-colors flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                        isSelected 
                                          ? 'bg-blue-500 dark:bg-blue-400 border-blue-500 dark:border-blue-400' 
                                          : 'border-gray-300 dark:border-gray-600'
                                      }`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className="text-gray-900 dark:text-[#e5e5e5]">{stat.competency}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-[#a0a0a0]">
                                      {stat.count}개
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-[#a0a0a0]">
                              역량 태그가 있는 에피소드가 없습니다
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5B6EFF] dark:text-[#7B8FFF]" />
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
                  ? 'bg-[#5B6EFF] text-white hover:bg-[#4B5EEF]' 
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
                  ? 'bg-[#5B6EFF] text-white hover:bg-[#4B5EEF]' 
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
                  ? 'bg-[#5B6EFF] text-white hover:bg-[#4B5EEF]' 
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
      )}

       {/* 읽기 전용 모드 배너 */}
       {project && activeTabId !== 'new' && isReadOnly && (
        <div className="bg-[#5B6EFF]/10 dark:bg-[#5B6EFF]/20 border-b border-[#5B6EFF]/20 dark:border-[#5B6EFF]/30 px-5 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5B6EFF]/20 dark:bg-[#5B6EFF]/30 flex items-center justify-center flex-shrink-0">
                <Lock className="h-4 w-4 text-[#5B6EFF] dark:text-[#7B8FFF]" />
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
              className="bg-[#5B6EFF] hover:bg-[#4B5EEF] text-white rounded-[12px] px-4 py-2 text-sm font-semibold shadow-sm flex-shrink-0"
            >
              로그인하여 편집하기
            </Button>
          </div>
        </div>
      )}

      {/* 메인 영역 */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* '새 파일' 탭일 때 NewTabPanel 표시 */}
        {activeTabId === 'new' ? (
          <NewTabPanel
            currentProjectId={activeProjectId || ''}
            onOpenProject={async (targetProjectId: string) => {
              // 이미 열려있는 탭인지 확인
              const existingTab = tabs.find(t => t.type === 'project' && t.projectId === targetProjectId);
              if (existingTab) {
                // 이미 열려있으면 해당 탭으로 전환 (새 파일 탭 제거)
                setTabs(prev => prev.filter(t => t.id !== 'new'));
                await handleTabClick(existingTab.id);
                return;
              }

              try {
                // 프로젝트 정보 가져오기
                const targetProject = await mindMapProjectStorage.get(targetProjectId);
                if (!targetProject) {
                  toast.error('프로젝트를 찾을 수 없습니다.');
                  return;
                }

                // activeProjectId 업데이트
                setActiveProjectId(targetProjectId);

                // "새 파일" 탭을 프로젝트 탭으로 변환 (Figma 스타일, URL 변경 없음)
                const newTabId = `project_${targetProjectId}`;
                setTabs(prev => prev.map(t =>
                  t.id === 'new'
                    ? {
                        id: newTabId,
                        label: targetProject.name,
                        nodeId: null,
                        href: `/mindmap?projectId=${targetProjectId}`,
                        type: 'project' as const,
                        projectId: targetProjectId,
                      }
                    : t
                ));

                // 프로젝트 상태 로드
                setProject(targetProject);

                // 자동 레이아웃 적용
                const layoutConfig = targetProject.layoutConfig || { autoLayout: true };
                if (layoutConfig.autoLayout && targetProject.nodes.length > 0) {
                  const layoutType = targetProject.layoutType || 'radial';
                  const layoutedNodes = applyLayout(targetProject.nodes, layoutType, layoutConfig);
                  setNodes(layoutedNodes);
                } else {
                  setNodes(targetProject.nodes);
                }

                setSelectedNodeId(null);
                setFocusNodeId(null);
                setActiveTabId(newTabId);

                // 탭 상태 저장
                setTabStates(prev => {
                  const newMap = new Map(prev);
                  newMap.set(newTabId, {
                    project: targetProject,
                    nodes: targetProject.nodes,
                    selectedNodeId: null,
                    focusNodeId: null,
                  });
                  return newMap;
                });
              } catch (error) {
                console.error('Failed to open project in tab:', error);
                toast.error('프로젝트를 열 수 없습니다.');
              }
            }}
            onCreateProject={async (projectType) => {
              if (!user) {
                router.push('/login');
                return;
              }

              try {
                const projectId = crypto.randomUUID();
                const now = Date.now();

                const centerNodeId = `${projectId}_center`;
                const centerNode: MindMapNode = {
                  id: centerNodeId,
                  label: projectType === 'collaborative' ? '새 경험' : user.name || '나',
                  parentId: null,
                  children: [],
                  x: 500,
                  y: 300,
                  level: 0,
                  nodeType: 'center',
                  createdAt: now,
                  updatedAt: now,
                };

                let initialNodes: MindMapNode[] = [centerNode];

                if (projectType === 'collaborative') {
                  const expId = `${projectId}_experience_0`;
                  centerNode.children.push(expId);
                  const experienceNode: MindMapNode = {
                    id: expId,
                    label: '새 경험',
                    parentId: centerNodeId,
                    children: [],
                    x: 500,
                    y: 300,
                    level: 1,
                    nodeType: 'experience',
                    isManuallyPositioned: false,
                    createdAt: now,
                    updatedAt: now,
                  };
                  initialNodes = [centerNode, experienceNode];
                }

                const layoutType: LayoutType = 'radial';
                const layoutConfig: LayoutConfig = { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } };
                const layoutedNodes = applyLayout(initialNodes, layoutType, layoutConfig);

                const newProject: MindMapProject & { userId?: string } = {
                  id: projectId,
                  name: projectType === 'collaborative' ? '새 공동 마인드맵' : '새 개인 마인드맵',
                  description: '경험을 관리합니다',
                  badges: [],
                  nodes: layoutedNodes,
                  layoutType,
                  layoutConfig,
                  createdAt: now,
                  updatedAt: now,
                  isDefault: true,
                  projectType,
                  isShared: projectType === 'collaborative',
                  userId: user.id,
                };

                await mindMapProjectStorage.add(newProject);
                currentProjectStorage.save(projectId);

                // 워크스페이스 상태 업데이트
                setActiveProjectId(projectId);
                setProject(newProject);
                setNodes(layoutedNodes);
                setSelectedNodeId(null);
                setFocusNodeId(null);

                // 'new' 탭을 프로젝트 탭으로 변환
                const newTabId = `project_${projectId}`;
                setTabs(prev =>
                  prev.map(t =>
                    t.id === 'new'
                      ? {
                          id: newTabId,
                          label: newProject.name,
                          nodeId: null,
                          href: `/mindmap?projectId=${projectId}`,
                          type: 'project' as const,
                          projectId,
                        }
                      : t,
                  ),
                );
                setActiveTabId(newTabId);

                // 탭 상태 저장
                setTabStates(prev => {
                  const newMap = new Map(prev);
                  newMap.set(newTabId, {
                    project: newProject,
                    nodes: layoutedNodes,
                    selectedNodeId: null,
                    focusNodeId: null,
                  });
                  return newMap;
                });
              } catch (error) {
                console.error('Failed to create project from NewTabPanel:', error);
                toast.error('새 마인드맵을 생성하지 못했습니다.');
              }
            }}
          />
        ) : (
          <>
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
                    <div className="h-6 w-6 rounded-full bg-[#5B6EFF]/20 dark:bg-[#5B6EFF]/30 text-[#4B5EEF] dark:text-[#7B8FFF] flex items-center justify-center text-xs font-semibold">
                      {(editor.userName || editor.userEmail || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                      {editor.userName || editor.userEmail || '익명 사용자'}
                    </span>
                    {editor.userId === user?.id && (
                      <span className="text-xs px-2 py-0.5 bg-[#5B6EFF]/20 dark:bg-[#5B6EFF]/30 text-[#4B5EEF] dark:text-[#7B8FFF] rounded-full">
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
              onToggleAddNodeMode={() => setIsAddNodeMode(!isAddNodeMode)}
              isAddNodeMode={isAddNodeMode}
              cursorMode={cursorMode}
              onCursorModeChange={setCursorMode}
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
              onShare={isReadOnly || project?.projectType === 'personal' ? undefined : handleOpenShareDialog}
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
            cursorMode={cursorMode}
            highlightedNodeIds={highlightedNodeIds}
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
          projectId={activeProjectId || undefined}
          onTagDrop={handleTagDrop}
          isAddNodeMode={isAddNodeMode}
          onCanvasAddNode={handleCanvasAddNode}
          onNodeConnect={handleNodeConnect}
        />

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
          </>
        )}
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
                      <Badge variant="outline" className="bg-[#5B6EFF]/10 dark:bg-[#5B6EFF]/30 text-[#4B5EEF] dark:text-[#7B8FFF] border-[#5B6EFF]/20 dark:border-[#5B6EFF] text-xs font-medium">
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
                {project?.projectType === 'collaborative' ? (
                  <>
                    {onboardingStep === 0 && '공동 작업 구조 이해하기'}
                    {onboardingStep === 1 && '경험 노드 추가하기'}
                    {onboardingStep === 2 && '에피소드 작성하기'}
                    {onboardingStep === 3 && '팀원과 공유하기'}
                  </>
                ) : (
                  <>
                    {onboardingStep === 0 && '계층 구조로 경험 정리하기'}
                    {onboardingStep === 1 && '공백 진단으로 부족한 경험 찾기'}
                    {onboardingStep === 2 && '어시스턴트로 노드 확장하기'}
                    {onboardingStep === 3 && '캔버스 조작과 노드 편집'}
                  </>
                )}
              </h2>
              <p className="text-sm text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                {project?.projectType === 'collaborative' ? (
                  <>
                    {onboardingStep === 0 &&
                      '공동 마인드맵은 경험을 중심에 바로 추가합니다. 중앙 노드에서 경험을 추가하고, 각 경험 아래에 에피소드를 작성하세요. 팀원들과 함께 실시간으로 편집할 수 있어요.'}
                    {onboardingStep === 1 &&
                      '중앙 노드를 우클릭하거나 더블클릭하여 경험을 추가하세요. 경험은 구체적인 프로젝트나 활동을 의미합니다. 예: "웹 개발 프로젝트", "디자인 시스템 구축" 등'}
                    {onboardingStep === 2 &&
                      '경험 노드를 선택하면 STAR 기법으로 에피소드를 작성할 수 있어요. 오른쪽 어시스턴트를 열고 경험 노드를 선택하면, STAR 기법에 맞춰 질문을 던지며 자동으로 에피소드 노드를 확장하고 STAR 내용을 채워줍니다.'}
                    {onboardingStep === 3 &&
                      '공유 버튼을 눌러 링크를 생성하고 팀원을 초대하세요. 여러 명이 동시에 편집할 수 있어요. 노드를 드래그해서 위치를 바꾸고, 더블클릭으로 이름을 수정할 수 있습니다.'}
                  </>
                ) : (
                  <>
                    {onboardingStep === 0 &&
                      'episode의 마인드맵은 중심-범주-경험-에피소드 구조로 경험을 정리합니다. 먼저 중심 노드를 기준으로 범주(인턴, 동아리 등)를 만들고, 그 안에 구체적인 경험과 에피소드를 쌓아가세요.'}
                    {onboardingStep === 1 &&
                      '상단의 공백 진단하기 버튼을 눌러 5개년 기출 자소서 문항을 기준으로 부족한 역량을 찾을 수 있어요. 진단 결과는 추천 인벤토리로 들어가 드래그앤드롭으로 마인드맵에 바로 추가할 수 있습니다.'}
                    {onboardingStep === 2 &&
                      '오른쪽 어시스턴트를 열고 범주/경험/에피소드 노드를 선택하면, STAR 기법에 맞춰 질문을 던지며 자동으로 노드를 확장하고 STAR 내용을 채워줍니다.'}
                    {onboardingStep === 3 &&
                      '노드를 드래그해서 위치를 바꾸고, 더블클릭으로 이름을 수정할 수 있어요. 우클릭 메뉴에서 하위 노드 추가, STAR 정리하기, 공유 링크 만들기 등 주요 기능을 사용할 수 있습니다.'}
                  </>
                )}
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
                          ? 'bg-[#5B6EFF] dark:bg-[#6B7EFF]'
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

      {/* 공유 다이얼로그 (공동 마인드맵만 표시) */}
      {project?.projectType === 'collaborative' && (
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
                  <div className="h-9 w-9 rounded-full bg-[#5B6EFF]/20 text-[#4B5EEF] dark:bg-[#5B6EFF]/30 dark:text-[#7B8FFF] flex items-center justify-center font-semibold">
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
      )}


      {/* 공유 다이얼로그 (공동 마인드맵만 표시) */}
      {project?.projectType === 'collaborative' && (
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
                    if (activeProjectId) {
                      await updateProject(activeProjectId, updated);
                      setProject(updated);
                      if (typeof window !== 'undefined') {
                        setShareLink(checked ? `${window.location.origin}/mindmap/${activeProjectId}` : '');
                      }
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
      )}
    </div>
    </DndProvider>
  );
}
