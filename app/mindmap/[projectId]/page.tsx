'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { MindMapNode, MindMapProject, GapTag, NodeType } from '@/types';
import { mindMapProjectStorage, currentProjectStorage, sharedNodeStorage, assetStorage, mindMapOnboardingStorage } from '@/lib/storage';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import MindMapCanvas from '@/components/mindmap/MindMapCanvas';
import MindMapTabs, { Tab } from '@/components/mindmap/MindMapTabs';
import AIChatbot from '@/components/chatbot/AIChatbot';
import STAREditor from '@/components/star/STAREditor';
import GapDiagnosis from '@/components/gap/GapDiagnosis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, MessageSquare, Check, X } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import { AnimatePresence, motion } from 'framer-motion';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { saveNodes, updateNode } from '@/lib/supabase/data';

export default function MindMapProjectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const nodeId = useMemo(() => searchParams.get('nodeId'), [searchParams]);
  const { user, loading: authLoading } = useUnifiedAuth(); // 전역 상태에서 사용자 정보 가져오기
  
  const [project, setProject] = useState<MindMapProject | null>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [isSTAREditorOpen, setIsSTAREditorOpen] = useState(false);
  const [isGapDiagnosisOpen, setIsGapDiagnosisOpen] = useState(false);
  const [isAIChatbotOpen, setIsAIChatbotOpen] = useState(false);
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
  const [aiChatbotDefaultTab, setAiChatbotDefaultTab] = useState<'chat' | 'inventory'>('chat');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // DB 업데이트 디바운싱을 위한 ref
  const supabaseUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 드래그 중인지 추적하는 ref
  const isDraggingRef = useRef(false);
  // 상태 업데이트 디바운싱을 위한 ref
  const stateUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) {
      return;
    }

    // 로그인 확인 (전역 상태 사용)
    if (!user) {
      router.push('/login');
      return;
    }

    const loadProject = async () => {
      try {

        // Supabase에서 최신 프로젝트 로드
        const { getProject } = await import('@/lib/supabase/data');
        const loadedProject = await getProject(projectId, user.id);
        if (!loadedProject) {
          console.warn('[mindmap/page] 프로젝트를 찾을 수 없음', { projectId, userId: user.id });
          router.push('/mindmaps');
          return;
        }

        console.log('[mindmap/page] 프로젝트 로드 완료', {
          projectId,
          projectName: loadedProject.name,
          nodeCount: loadedProject.nodes.length,
          nodes: loadedProject.nodes.map(n => ({ id: n.id, label: n.label, level: n.level, childrenCount: n.children.length })),
        });

        setProject(loadedProject);
        setNodes(loadedProject.nodes);
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
    };
  }, [projectId, router, user, authLoading]);

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

  const handleNodesChange = async (newNodes: MindMapNode[], isDrag = false) => {
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
      // 기존 타이머 취소
      if (supabaseUpdateTimeoutRef.current) {
        clearTimeout(supabaseUpdateTimeoutRef.current);
      }

      // 500ms 디바운싱으로 Supabase에 노드 저장
      supabaseUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          // 노드를 DB에 직접 저장 (saveNodes가 모든 노드 정보를 저장)
          await saveNodes(projectId, newNodes);
          
          // 프로젝트 메타데이터만 업데이트 (nodes는 제외하여 중복 저장 방지)
          await mindMapProjectStorage.update(projectId, {
            updatedAt: Date.now(),
          });
        } catch (error) {
          console.error('Failed to save nodes to database:', error);
        }
      }, 500);
    }
  };

  const handleNodeEdit = async (nodeId: string, label: string) => {
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
    // 인덱스 맵 사용
    const parent = nodeMap.get(parentId);
    if (!parent) return;

    // 방향에 따라 위치 계산
    let x = parent.x;
    let y = parent.y;
    const offset = 180;

    switch (direction) {
      case 'right':
        x = parent.x + offset;
        y = parent.y + (parent.children.length * 60) - (parent.children.length * 30);
        break;
      case 'left':
        x = parent.x - offset;
        y = parent.y + (parent.children.length * 60) - (parent.children.length * 30);
        break;
      case 'top':
        x = parent.x + (parent.children.length * 60) - (parent.children.length * 30);
        y = parent.y - 120;
        break;
      case 'bottom':
        x = parent.x + (parent.children.length * 60) - (parent.children.length * 30);
        y = parent.y + 120;
        break;
    }

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
      x,
      y,
      level: newLevel,
      nodeType,
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
    handleNodesChange(updatedNodes, false);
    setEditingNodeId(newChild.id);
  };

  const handleSTARComplete = (data: { situation: string; task: string; action: string; result: string }) => {
    setStarData(data);
    setIsSTAREditorOpen(true);
  };

  const handleNodeShare = async (nodeId: string) => {
    // 1. 공유할 노드 찾기 (인덱스 맵 사용)
    const node = nodeMap.get(nodeId);
    if (!node) return;

    // 2. 하위 노드들 모두 가져오기 (재귀적으로, 인덱스 맵 사용)
    const getDescendants = (id: string): MindMapNode[] => {
      const current = nodeMap.get(id);
      if (!current) return [];
      
      const children = nodes.filter(n => n.parentId === id);
      const allDescendants: MindMapNode[] = [...children];
      
      children.forEach(child => {
        allDescendants.push(...getDescendants(child.id));
      });
      
      return allDescendants;
    };

    const descendants = getDescendants(nodeId);

    // 3. 관련 STAR 에셋 가져오기 (노드와 하위 노드들의 에셋)
    const allAssets = await assetStorage.load();
    const nodeIds = [nodeId, ...descendants.map(d => d.id)];
    const relatedAssets = allAssets.filter(asset => nodeIds.includes(asset.nodeId));

    // 4. 공유 데이터 생성
    const sharedData = {
      id: nodeId,
      nodeId: nodeId,
      projectId: projectId,
      node: { ...node, isShared: true },
      descendants: descendants,
      starAssets: relatedAssets,
      includeSTAR: relatedAssets.length > 0, // STAR 에셋이 있으면 포함
      createdAt: Date.now(),
      createdBy: user?.id,
    };

    // 5. 공유 스토리지에 저장
    await sharedNodeStorage.add(sharedData);

    // 6. 노드의 isShared 상태 업데이트 및 DB 저장
    const updatedNodes = nodes.map(n => 
      n.id === nodeId 
        ? { ...n, isShared: true, sharedLink: `${window.location.origin}/share/${nodeId}` }
        : n
    );
    handleNodesChange(updatedNodes);

    // 8. 공유 링크 복사 및 토스트 표시
    const shareUrl = `${window.location.origin}/share/${nodeId}`;
    
    // 클립보드 복사 (에러 처리 포함)
    try {
      // 문서 포커스 확인 및 사용자 상호작용 보장
      if (document.hasFocus()) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // 포커스가 없으면 fallback 방법 사용
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (error) {
      // 클립보드 복사 실패 시 fallback
      console.warn('Clipboard copy failed, using fallback:', error);
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        console.error('Fallback copy also failed:', e);
      }
      document.body.removeChild(textArea);
    }
    
    // 토스트 표시
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-[12px] text-sm font-medium shadow-lg z-50 transition-all duration-300';
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>공유 링크가 복사되었어요</span>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  };

  const handleNodeUnshare = async (nodeId: string) => {
    // 1. 공유 스토리지에서 삭제
    await sharedNodeStorage.remove(nodeId);

    // 2. 노드의 isShared 상태 업데이트 및 DB 저장
    const updatedNodes = nodes.map(n => 
      n.id === nodeId 
        ? { ...n, isShared: false, sharedLink: undefined }
        : n
    );
    handleNodesChange(updatedNodes);

    // 4. 토스트 표시
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-[12px] text-sm font-medium shadow-lg z-50 transition-all duration-300';
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span>공유가 중지되었어요</span>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
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
    setIsAIChatbotOpen(true);
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
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="h-screen flex flex-col bg-gray-50">
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
      <div className="bg-white border-b border-gray-100 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/mindmaps">
              <Button variant="ghost" size="sm" className="px-2">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
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
                    className="text-lg font-bold text-gray-900 border-b-2 border-blue-600 bg-transparent focus:outline-none px-1"
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
                    className={`text-lg font-bold text-gray-900 ${!isNodeView ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                    onClick={!isNodeView ? handleTitleEdit : undefined}
                    title={!isNodeView ? '클릭하여 제목 수정' : ''}
                  >
                    {isNodeView && activeTab ? activeTab.label : project.name}
                  </h1>
                  {isNodeView ? (
                    <p className="text-xs text-gray-500">노드 중심 뷰</p>
                  ) : (
                    project.description && (
                      <p className="text-xs text-gray-500">{project.description}</p>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* 우측 버튼 그룹 */}
          <div className="flex items-center gap-2">
            {/* 공백 진단하기 버튼 with 말풍선 */}
            <div className="relative">
              {/* 말풍선 툴팁 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-10"
              >
                <div className="relative bg-red-700 text-white px-4 py-1.5 rounded-md text-xs font-semibold shadow-md whitespace-nowrap">
                  5개년 기출 자소서 기반
                  {/* 말풍선 꼬리 */}
                  <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-red-700" />
                </div>
              </motion.div>
              
              {/* 공백 진단하기 버튼 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGapDiagnosisOpen(true)}
                className="px-3 py-2 gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                <span>공백 진단하기</span>
              </Button>
            </div>
            
            {/* 어시스턴트 토글 버튼 */}
            <Button
              variant={isAIChatbotOpen ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsAIChatbotOpen(prev => !prev)}
              className={`px-3 py-2 gap-2 transition-all duration-200 ${
                isAIChatbotOpen 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={isAIChatbotOpen ? '어시스턴트 닫기' : '어시스턴트 열기'}
            >
              <MessageSquare className="h-4 w-4" />
              <span>어시스턴트</span>
              <motion.div
                animate={{ rotate: isAIChatbotOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronLeft className="h-3 w-3" />
              </motion.div>
            </Button>
          </div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* 마인드맵 캔버스 영역 */}
        <div className="flex-1 relative overflow-hidden">
          <MindMapCanvas
            nodes={displayNodes}
            originalNodes={nodes}
            centerNodeId={isNodeView ? activeTab?.nodeId || null : null}
            focusNodeId={!isNodeView ? focusNodeId : null}
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
            // STAR 에디터 열기
            setSelectedNodeId(nodeId);
            // 인덱스 맵 사용
            const node = nodeMap.get(nodeId);
            if (node) {
              // 기존 STAR 데이터 로드
              const existingAsset = await assetStorage.getByNodeId(nodeId);
              if (existingAsset) {
                setStarData({
                  situation: existingAsset.situation,
                  task: existingAsset.task,
                  action: existingAsset.action,
                  result: existingAsset.result,
                });
              } else {
                setStarData(null);
              }
              setIsSTAREditorOpen(true);
            }
          }}
          onNodeEdit={handleNodeEdit}
          onNodeAddChild={handleNodeAddChild}
          onNodeDelete={(nodeId) => {
            // 하위 노드까지 재귀적으로 삭제 (인덱스 맵 사용)
            const deleteNodeAndChildren = (id: string): string[] => {
              const targetNode = nodeMap.get(id);
              if (!targetNode) return [];
              const children = targetNode.children.flatMap(childId => deleteNodeAndChildren(childId));
              return [id, ...children];
            };

            const idsToDelete = deleteNodeAndChildren(nodeId);
            
            // 삭제된 노드와 하위 노드들을 필터링하고, 부모 노드의 children 배열에서도 제거
            const updatedNodes = nodes
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

            handleNodesChange(updatedNodes);
            
            // 삭제된 노드의 탭이 열려있으면 닫기
            const tabToClose = tabs.find(t => t.nodeId === nodeId);
            if (tabToClose) {
              handleTabClose(tabToClose.id);
            }
          }}
          onNodeShare={handleNodeShare}
          onNodeUnshare={handleNodeUnshare}
          onNodeOpenInNewTab={handleNodeOpenInNewTab}
          onStartEdit={setEditingNodeId}
          onEndEdit={() => setEditingNodeId(null)}
          projectId={projectId}
          onTagDrop={handleTagDrop}
        />
        </div>

        {/* 배경 오버레이 (모바일용, 선택사항) */}
        <AnimatePresence>
          {isAIChatbotOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/10 md:hidden z-50"
              onClick={() => setIsAIChatbotOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* AI 챗봇 사이드바 */}
        <AnimatePresence>
          {isAIChatbotOpen && (
            <AIChatbot
              selectedNodeId={selectedNodeId}
              selectedNodeLabel={selectedNode?.label || null}
              selectedNodeType={selectedNode?.nodeType}
              selectedNodeLevel={selectedNode?.level}
              onSTARComplete={handleSTARComplete}
              onNodeAdd={(parentId, label, nodeType) => {
                // 새 노드 생성 (인덱스 맵 사용)
                const parent = nodeMap.get(parentId);
                if (!parent) return;

                const angle = Math.random() * Math.PI * 2;
                const radius = 200;
                const x = parent.x + Math.cos(angle) * radius;
                const y = parent.y + Math.sin(angle) * radius;

                const newNode: MindMapNode = {
                  id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  label,
                  parentId,
                  children: [],
                  x,
                  y,
                  level: parent.level + 1,
                  nodeType,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };

                // 부모 노드의 children 업데이트
                const updatedNodes = nodes.map(n =>
                  n.id === parentId
                    ? { ...n, children: [...n.children, newNode.id], updatedAt: Date.now() }
                    : n
                );
                updatedNodes.push(newNode);

                handleNodesChange(updatedNodes);
                setSelectedNodeId(newNode.id);
              }}
              onClose={() => {
                setIsAIChatbotOpen(false);
                setAiChatbotDefaultTab('chat'); // 닫을 때 기본 탭으로 리셋
              }}
              onOpenGapDiagnosis={() => setIsGapDiagnosisOpen(true)}
              defaultTab={aiChatbotDefaultTab}
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

      {/* 공백 진단 */}
      <GapDiagnosis
        isOpen={isGapDiagnosisOpen}
        onClose={() => setIsGapDiagnosisOpen(false)}
        resultButtonText="추가 경험 정리하기"
        onResultButtonClick={() => {
          // 공백 진단 완료 시 AI 어시스턴트 열고 추천 인벤토리 탭으로 전환
          setAiChatbotDefaultTab('inventory');
          setIsAIChatbotOpen(true);
          setIsGapDiagnosisOpen(false);
        }}
      />

      {/* 노드 추가 다이얼로그 */}
      {showConfirmDialog && droppedTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={handleCancelAddTag}>
          <div className="bg-white rounded-[24px] p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">노드 추가하기</h3>
              <button
                onClick={handleCancelAddTag}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                title="닫기"
              >
                <X className="h-5 w-5 text-gray-600" />
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
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {guidanceText}
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-sm text-gray-500">관련 역량:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium">
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
                    className="h-14 rounded-[16px] border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 text-base"
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
                className="flex-1 h-14 rounded-[16px] border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
              >
                취소
              </Button>
              <Button 
                onClick={handleConfirmAddTag}
                className="flex-1 h-14 bg-gray-900 hover:bg-gray-800 rounded-[16px] text-white font-semibold"
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
            className="w-full max-w-xl bg-white rounded-[24px] shadow-2xl p-8 relative"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => {
                mindMapOnboardingStorage.saveShown();
                setShowOnboarding(false);
              }}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>

            {/* 콘텐츠 */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-blue-600 mb-2">마인드맵 튜토리얼</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {onboardingStep === 0 && '계층 구조로 경험 정리하기'}
                {onboardingStep === 1 && '공백 진단으로 부족한 경험 찾기'}
                {onboardingStep === 2 && '어시스턴트로 노드 확장하기'}
                {onboardingStep === 3 && '캔버스 조작과 노드 편집'}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
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
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
                          ? 'bg-blue-600'
                          : 'bg-gray-200 hover:bg-gray-300'
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
    </div>
    </DndProvider>
  );
}
