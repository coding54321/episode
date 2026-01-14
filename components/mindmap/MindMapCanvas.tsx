'use client';

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { MindMapNode as NodeType, GapTag, ColorTheme } from '@/types';
import { mindMapStorage } from '@/lib/storage';
import MindMapNode from './MindMapNode';
import ZoomControl from './ZoomControl';
import { getThemeColors } from '@/lib/mindmap-theme';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Plus } from 'lucide-react';

export interface MindMapCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
  getZoom: () => number;
  getPan: () => { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  getCanvasElement: () => HTMLDivElement | null; // 캔버스 DOM 요소 반환
  getCanvasContainer: () => HTMLDivElement | null; // 캔버스 컨테이너 반환
}

interface MindMapCanvasProps {
  nodes: NodeType[];
  onNodesChange: (nodes: NodeType[], isDrag?: boolean) => void;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeEdit: (nodeId: string, label: string) => void;
  onNodeAddChild: (nodeId: string, direction?: 'right' | 'left' | 'top' | 'bottom') => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeOpenInNewTab?: (nodeId: string) => void;
  onNodeOpenSTAREditor?: (nodeId: string) => void; // STAR 에디터 열기
  onStartEdit: (nodeId: string) => void;
  onEndEdit: () => void;
  projectId?: string;
  centerNodeId?: string | null; // 화면 중앙에 표시할 노드 ID
  originalNodes?: NodeType[]; // 원본 노드 배열 (좌표 변환 전)
  focusNodeId?: string | null; // 포커스할 노드 ID (검색 등에서 사용)
  onTagDrop?: (nodeId: string, tag: GapTag) => void; // 태그 드롭 핸들러
  isReadOnly?: boolean; // 읽기 전용 모드
  disableAutoSave?: boolean; // 자동 저장 비활성화 (공유 페이지 등에서 사용)
  showGrid?: boolean; // 그리드 표시 여부
  onZoomChange?: (zoom: number) => void; // 줌 변경 콜백
  colorTheme?: ColorTheme; // 색상 테마
  isAddNodeMode?: boolean; // 노드 추가 모드 활성화 여부
  onCanvasAddNode?: (x: number, y: number) => void; // 캔버스 클릭 시 노드 추가
  onNodeConnect?: (nodeId: string, parentId: string) => void; // 노드 연결 핸들러
  cursorMode?: 'select' | 'move'; // 커서 모드 ('select' | 'move')
}

const MindMapCanvas = forwardRef<MindMapCanvasHandle, MindMapCanvasProps>(function MindMapCanvas({
  nodes,
  onNodesChange,
  selectedNodeId,
  editingNodeId,
  onNodeSelect,
  onNodeEdit,
  onNodeAddChild,
  onNodeDelete,
  onNodeOpenInNewTab,
  onNodeOpenSTAREditor,
  onStartEdit,
  onEndEdit,
  projectId,
  centerNodeId,
  originalNodes,
  focusNodeId,
  onTagDrop,
  isReadOnly = false,
  disableAutoSave = false,
  showGrid = false,
  onZoomChange,
  colorTheme = 'default',
  isAddNodeMode = false,
  onCanvasAddNode,
  onNodeConnect,
  cursorMode = 'select',
}, ref) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapTargetNodeId, setSnapTargetNodeId] = useState<string | null>(null); // 스냅 연결 대상 노드 ID
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null); // 우클릭 위치 저장
  const lastContextMenuEventRef = useRef<MouseEvent | null>(null); // 마지막 우클릭 이벤트 저장

  // 다크모드 감지
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // MutationObserver로 다크모드 변경 감지
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // 테마 색상 가져오기
  const themeColors = useMemo(() => getThemeColors(colorTheme, isDarkMode), [colorTheme, isDarkMode]);
  
  // 드래그 중 임시 좌표 상태 (렌더링용, 실제 상태 업데이트는 드래그 종료 시)
  const [dragPositions, setDragPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const dragStateRef = useRef<{
    nodeId: string;
    descendantIds: string[];
    startPos: { x: number; y: number };
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // 실시간 멀티탭 동기화
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'episode_mindmap' && e.newValue) {
        try {
          const updatedNodes = JSON.parse(e.newValue);
          if (Array.isArray(updatedNodes) && updatedNodes.length > 0) {
            // 스토리지 동기화는 드래그가 아니므로 즉시 업데이트
            onNodesChange(updatedNodes, false);
          }
        } catch (error) {
          console.error('Failed to sync nodes:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [onNodesChange]);

  // 노드가 없으면 프로젝트에서 로드 (초기화는 프로젝트 생성 시 처리)
  useEffect(() => {
    // 노드가 없고 프로젝트가 있는 경우는 프로젝트 생성 시 이미 노드가 있으므로
    // 여기서는 아무것도 하지 않음
    // 초기화는 배지 선택 페이지에서 프로젝트 생성 시 처리됨
  }, [nodes.length, onNodesChange]);

  // 중심 노드가 변경될 때 화면 중앙에 맞추기
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // zoom을 먼저 1로 설정
    setZoom(1);
    
    // 다음 프레임에서 pan 계산 (zoom이 업데이트된 후)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const currentZoom = 1; // zoom은 이미 1로 설정됨
        
        if (centerNodeId) {
          // 노드 중심 뷰: 중심 노드는 (0, 0)에 있으므로 화면 중앙으로 pan 조정
          // 노드는 left: 0, top: 0, transform: translate(-50%, -50%)로 배치되므로
          // 노드의 중심점이 캔버스 좌표 (0, 0)에 위치합니다.
          // 컨테이너 transform: translate(pan.x, pan.y) scale(zoom)
          // 노드 중심점의 화면 좌표 = (0, 0) * zoom + pan = pan
          // 화면 중앙에 오려면: pan = (centerX, centerY)
          setPan({
            x: centerX,
            y: centerY,
          });
        } else {
          // 메인 뷰: center 노드(nodeType === 'center' 또는 level === 0)를 화면 중앙에 맞춤
          // 인덱스 맵 사용
          const centerNode = Array.from(nodeMap.values()).find(
            node => node.nodeType === 'center' || node.level === 0
          );
          if (centerNode) {
            // center 노드의 절대 좌표를 화면 중앙으로 이동시키기 위한 pan 계산
            // 노드 좌표 * zoom + pan = 화면 중앙 좌표
            // 따라서 pan = 화면 중앙 - 노드 좌표 * zoom
            setPan({
              x: centerX / currentZoom - centerNode.x,
              y: centerY / currentZoom - centerNode.y,
            });
          } else {
            // center 노드가 없으면 초기화
            setPan({ x: 0, y: 0 });
          }
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerNodeId]); // centerNodeId만 의존성으로 사용 (nodes는 최신 값을 참조)

  // 특정 노드로 포커스 (검색 등에서 사용)
  useEffect(() => {
    if (!focusNodeId || !canvasRef.current || centerNodeId) return;
    
    // 인덱스 맵 사용
    const targetNode = nodeMap.get(focusNodeId);
    if (!targetNode) return;

    // 부드러운 애니메이션으로 이동
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 목표 pan 위치 계산
    const targetPan = {
      x: centerX / zoom - targetNode.x,
      y: centerY / zoom - targetNode.y,
    };

    // 애니메이션 설정
    const duration = 500; // 0.5초
    const startPan = { ...pan };
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeInOutCubic 이징 함수
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      setPan({
        x: startPan.x + (targetPan.x - startPan.x) * eased,
        y: startPan.y + (targetPan.y - startPan.y) * eased,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 애니메이션 완료 후 노드 선택
        onNodeSelect(focusNodeId);
      }
    };

    animate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId]); // focusNodeId가 변경될 때만 실행

  // 키보드 이벤트 처리 (Space 키, ESC 키)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && !editingNodeId) {
      e.preventDefault();
      setSpacePressed(true);
    } else if (e.key === 'Escape' && editingNodeId) {
      // ESC 키로 편집 모드 종료
      onEndEdit();
    }
  }, [editingNodeId, onEndEdit]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setSpacePressed(false);
      setIsPanning(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // 마우스 다운 (팬 시작)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 편집 중이면 팬 모드 비활성화
    if (editingNodeId) return;

    const target = e.target as HTMLElement;
    const isCanvasClick = target === canvasRef.current || target.closest('.canvas-container');
    
    // 노드 추가 모드일 때는 팬 모드 비활성화 (노드 추가가 우선)
    if (isAddNodeMode) return;

    // 노드나 버튼을 클릭한 경우가 아닌 빈 공간 클릭인지 확인
    const isNodeOrButton = target.closest('.mindmap-node') || 
                           target.tagName === 'BUTTON' ||
                           target.closest('button') ||
                           target.tagName === 'SVG' ||
                           target.tagName === 'path';

    if (e.button === 1) { // 마우스 중간 버튼
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0) {
      // 커서 모드가 'move'이거나 스페이스바를 누른 경우, 또는 빈 공간 클릭 시 패닝 모드 활성화
      if (cursorMode === 'move' || spacePressed || (isCanvasClick && !isNodeOrButton)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        e.preventDefault();
      }
    }
  }, [spacePressed, editingNodeId, isAddNodeMode, cursorMode, onCanvasAddNode, pan, zoom]);

  // 줌 인 함수
  const handleZoomIn = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      setZoom(prev => {
        const newZoom = Math.min(3, prev + 0.1);
        onZoomChange?.(newZoom);
        return newZoom;
      });
      return;
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldXBefore = (centerX - pan.x) / zoom;
    const worldYBefore = (centerY - pan.y) / zoom;
    const newZoom = Math.min(3, zoom + 0.1);
    const newPan = {
      x: centerX - worldXBefore * newZoom,
      y: centerY - worldYBefore * newZoom,
    };

    setZoom(newZoom);
    setPan(newPan);
    onZoomChange?.(newZoom);
  }, [zoom, pan, onZoomChange]);

  // 줌 아웃 함수
  const handleZoomOut = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      setZoom(prev => {
        const newZoom = Math.max(0.25, prev - 0.1);
        onZoomChange?.(newZoom);
        return newZoom;
      });
      return;
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldXBefore = (centerX - pan.x) / zoom;
    const worldYBefore = (centerY - pan.y) / zoom;
    const newZoom = Math.max(0.25, zoom - 0.1);
    const newPan = {
      x: centerX - worldXBefore * newZoom,
      y: centerY - worldYBefore * newZoom,
    };

    setZoom(newZoom);
    setPan(newPan);
    onZoomChange?.(newZoom);
  }, [zoom, pan, onZoomChange]);

  // 전체 보기 함수 - 초기 로드 시와 동일한 뷰로 설정
  const handleFitToScreen = useCallback(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    // 초기 로드 시와 동일한 로직: 줌을 먼저 1로 설정
    setZoom(1);
    onZoomChange?.(1);
    
    // 다음 프레임에서 pan 계산 (zoom이 업데이트된 후, 초기 로드 시와 동일)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const currentZoom = 1; // zoom은 이미 1로 설정됨
        
        // 메인 뷰: center 노드(nodeType === 'center' 또는 level === 0)를 화면 중앙에 맞춤 (초기 로드 시와 동일)
        // nodes 배열에서 직접 찾기 (nodeMap은 아직 초기화되지 않았을 수 있음)
        const centerNode = nodes.find(node => node.nodeType === 'center' || node.level === 0);
        if (centerNode) {
          // center 노드의 절대 좌표를 화면 중앙으로 이동시키기 위한 pan 계산
          // 노드 좌표 * zoom + pan = 화면 중앙 좌표
          // 따라서 pan = 화면 중앙 - 노드 좌표 * zoom
          setPan({
            x: centerX / currentZoom - centerNode.x,
            y: centerY / currentZoom - centerNode.y,
          });
        } else {
          // center 노드가 없으면 초기화
          setPan({ x: 0, y: 0 });
        }
      });
    });
  }, [nodes, onZoomChange]);

  // 캔버스 컨테이너 ref
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ref를 통해 제어 함수 노출
  useImperativeHandle(ref, () => ({
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    fitToScreen: handleFitToScreen,
    getZoom: () => zoom,
    getPan: () => pan,
    setPan: (newPan: { x: number; y: number }) => setPan(newPan),
    getCanvasElement: () => canvasRef.current,
    getCanvasContainer: () => canvasContainerRef.current,
  }), [handleZoomIn, handleZoomOut, handleFitToScreen, zoom, pan]);

  // 노드 인덱스 맵 생성 (O(1) 조회를 위해)
  const nodeMap = useMemo(() => {
    return new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);

  // 부모-자식 관계 맵 생성
  const childrenMap = useMemo(() => {
    const map = new Map<string, NodeType[]>();
    nodes.forEach(node => {
      if (node.parentId) {
        if (!map.has(node.parentId)) {
          map.set(node.parentId, []);
        }
        map.get(node.parentId)!.push(node);
      }
    });
    return map;
  }, [nodes]);

  // 특정 노드의 모든 하위 노드 가져오기 (재귀, 캐싱 적용)
  const getDescendantIds = useCallback((nodeId: string): string[] => {
    const descendants: string[] = [];
    const children = childrenMap.get(nodeId) || [];
    
    children.forEach(child => {
      descendants.push(child.id);
      descendants.push(...getDescendantIds(child.id));
    });
    
    return descendants;
  }, [childrenMap]);

  // 마우스 이동 (팬 또는 노드 드래그) - 최적화 버전
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (draggedNodeId && dragStateRef.current) {
      // requestAnimationFrame으로 업데이트 빈도 제한 (60fps)
      if (rafIdRef.current !== null) {
        return; // 이미 예약된 업데이트가 있으면 스킵
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        // dragStateRef가 null이면 종료
        if (!dragStateRef.current) return;

        // 화면 좌표를 캔버스 좌표로 변환
        const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

        // 오프셋을 빼서 새로운 노드 위치 계산
        const newX = mouseCanvasX - dragOffset.x;
        const newY = mouseCanvasY - dragOffset.y;

        // 드래그된 노드 찾기 (인덱스 맵 사용)
        const draggedNode = nodeMap.get(draggedNodeId);
        if (!draggedNode) return;

        // 이동량 계산
        const deltaX = newX - dragStateRef.current.startPos.x;
        const deltaY = newY - dragStateRef.current.startPos.y;

        // 임시 좌표만 업데이트 (상태 업데이트 없이 렌더링만)
        const newPositions = new Map<string, { x: number; y: number }>();
        newPositions.set(draggedNodeId, { x: newX, y: newY });
        
        // 하위 노드들도 같은 만큼 이동
        dragStateRef.current.descendantIds.forEach(id => {
          const node = nodeMap.get(id);
          if (node) {
            newPositions.set(id, {
              x: node.x + deltaX,
              y: node.y + deltaY,
            });
          }
        });

        setDragPositions(newPositions);

        // 스냅 연결 대상 찾기 (드래그 중인 노드가 독립 노드이고, 부모가 없는 경우)
        if (draggedNode.parentId === null && onNodeConnect) {
          const SNAP_DISTANCE = 100 / zoom; // 줌 레벨에 따라 조정
          let closestNodeId: string | null = null;
          let closestDistance = Infinity;

          nodes.forEach(node => {
            // 자기 자신, center 노드, 이미 부모가 있는 노드는 제외
            if (
              node.id === draggedNodeId ||
              node.nodeType === 'center' ||
              node.level === 0 ||
              node.parentId === null
            ) {
              return;
            }

            // 드래그 중인 노드의 현재 위치 (임시 좌표 또는 실제 좌표)
            const dragPos = newPositions.get(draggedNodeId) || { x: newX, y: newY };
            const distance = Math.sqrt(
              Math.pow(node.x - dragPos.x, 2) + Math.pow(node.y - dragPos.y, 2)
            );

            if (distance < SNAP_DISTANCE && distance < closestDistance) {
              closestNodeId = node.id;
              closestDistance = distance;
            }
          });

          setSnapTargetNodeId(closestNodeId);
        } else {
          setSnapTargetNodeId(null);
        }
      });
    }
  }, [isPanning, panStart, draggedNodeId, dragOffset, zoom, pan, nodeMap, nodes, onNodeConnect]);

  // 마우스 업 - 드래그 종료 시 실제 상태 업데이트
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);

    // 드래그 중이었다면 실제 상태 업데이트
    if (draggedNodeId && dragStateRef.current && dragPositions.size > 0) {
      const draggedNode = nodeMap.get(draggedNodeId);
      if (draggedNode) {
        const newPos = dragPositions.get(draggedNodeId);
        if (newPos) {
          // 스냅 연결 처리
          if (snapTargetNodeId && onNodeConnect && draggedNode.parentId === null) {
            // 스냅 대상 노드와 연결
            onNodeConnect(draggedNodeId, snapTargetNodeId);
            setSnapTargetNodeId(null);
            // 연결 후에도 위치는 업데이트해야 함
          }

          // 실제 노드 배열 업데이트 (드래그 종료 시에만)
          const updatedNodes = nodes.map(node => {
            if (node.id === draggedNodeId) {
              return { ...node, x: newPos.x, y: newPos.y, isManuallyPositioned: true, updatedAt: Date.now() };
            }
            if (dragStateRef.current!.descendantIds.includes(node.id)) {
              const pos = dragPositions.get(node.id);
              if (pos) {
                return { ...node, x: pos.x, y: pos.y, isManuallyPositioned: true, updatedAt: Date.now() };
              }
            }
            return node;
          });

          // 스냅 연결이 없었으면 일반 위치 업데이트만 수행
          if (!snapTargetNodeId || !onNodeConnect) {
          // 드래그 종료 시 실제 상태 업데이트 (isDrag=false로 전달하여 즉시 업데이트)
          // onNodesChange에서 이미 DB 저장을 처리하므로 여기서는 중복 저장하지 않음
          onNodesChange(updatedNodes, false);
          }
        }
      }
    }

    // 드래그 상태 초기화
    setDraggedNodeId(null);
    setDragPositions(new Map());
    setSnapTargetNodeId(null);
    dragStateRef.current = null;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [draggedNodeId, dragPositions, nodeMap, nodes, onNodesChange, snapTargetNodeId, onNodeConnect]);

  useEffect(() => {
    if (isPanning || draggedNodeId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, draggedNodeId, handleMouseMove, handleMouseUp]);

  // 브라우저 확대/축소 방지 (마인드맵 캔버스에서만)
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', preventBrowserZoom, { passive: false });
      return () => {
        canvas.removeEventListener('wheel', preventBrowserZoom);
      };
    }
  }, []);

  // 휠로 확대/축소 (마우스 커서 위치 중심) - 피그마 방식
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 트랙패드 핀치 줌 (Ctrl/Cmd 키 + 휠) 또는 Alt 키 + 휠
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      
      // 마우스 위치 (캔버스 뷰포트 기준)
      const viewportMouseX = e.clientX - rect.left;
      const viewportMouseY = e.clientY - rect.top;

      // canvasContainerRef의 실제 위치 가져오기
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // 컨테이너 기준 마우스 좌표 계산 (컨테이너의 실제 위치 기준)
      const containerMouseX = viewportMouseX - (containerRect.left - rect.left);
      const containerMouseY = viewportMouseY - (containerRect.top - rect.top);

      // 줌 변경 전 마우스가 가리키는 월드 좌표 계산
      // transform: translate(pan.x, pan.y) scale(zoom)
      // 월드 좌표 → 화면 좌표: screenX = worldX * zoom + pan.x
      // 화면 좌표 → 월드 좌표: worldX = (screenX - pan.x) / zoom
      const worldX = (containerMouseX - pan.x) / zoom;
      const worldY = (containerMouseY - pan.y) / zoom;

      // 새로운 줌 레벨 계산
      // 트랙패드 핀치 줌은 deltaY가 더 크므로 속도 조정
      const delta = -e.deltaY;
      const zoomSpeed = (e.ctrlKey || e.metaKey) ? 0.01 : 0.001; // 트랙패드는 더 빠르게
      const newZoom = Math.min(Math.max(zoom + delta * zoomSpeed, 0.25), 3);

      // 줌 변경 후 같은 월드 좌표가 마우스 위치에 오도록 pan 조정
      // 새로운 화면 좌표 = worldX * newZoom + newPan.x = containerMouseX (유지)
      // 따라서: newPan.x = containerMouseX - worldX * newZoom
      const newPan = {
        x: containerMouseX - worldX * newZoom,
        y: containerMouseY - worldY * newZoom,
      };

      setZoom(newZoom);
      setPan(newPan);
      onZoomChange?.(newZoom);
    }
  }, [zoom, pan, onZoomChange]);

  // 노드 드래그 시작
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    // 읽기 전용이면 드래그 안 함
    if (isReadOnly) return;
    // 중앙 노드나 편집 중이거나 팬 중이거나 이동 모드이면 드래그 안 함
    if (nodeId === 'center' || editingNodeId || spacePressed || isPanning || cursorMode === 'move') return;

    // 버튼이나 아이콘 클릭은 무시
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.tagName === 'SVG' ||
        target.tagName === 'path') {
      return;
    }

    // 인덱스 맵 사용
    const node = nodeMap.get(nodeId);
    if (!node) return;

    // 왼쪽 마우스 버튼만
    if (e.button !== 0) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNodeId(nodeId);

    // 마우스 위치를 캔버스 좌표로 변환
    const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

    // 노드 중심에서의 오프셋 계산
    setDragOffset({
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y
    });

    // 드래그 상태 초기화 (하위 노드 ID 미리 계산)
    const descendantIds = getDescendantIds(nodeId);
    dragStateRef.current = {
      nodeId,
      descendantIds,
      startPos: { x: node.x, y: node.y },
    };
    setDragPositions(new Map());

    e.stopPropagation();
  }, [isReadOnly, editingNodeId, spacePressed, isPanning, cursorMode, nodeMap, pan, zoom, getDescendantIds]);

  // 노드 추가 (방향 기반) - prop 핸들러로 위임
  const handleAddChild = useCallback((parentId: string, direction: 'right' | 'left' | 'top' | 'bottom' = 'right') => {
    if (isReadOnly) return; // 읽기 전용이면 아무것도 하지 않음
    onNodeAddChild(parentId, direction);
  }, [isReadOnly, onNodeAddChild]);

  // 노드 삭제 - 최적화 버전
  const handleDelete = useCallback((nodeId: string) => {
    if (isReadOnly) return; // 읽기 전용이면 아무것도 하지 않음
    // 인덱스 맵 사용
    const node = nodeMap.get(nodeId);
    // 루트 노드만 삭제 불가 (배지 노드는 삭제 가능)
    if (!node || nodeId === 'center') return;

    // 하위 노드까지 재귀적으로 삭제 (childrenMap 사용)
    const deleteNodeAndChildren = (id: string): string[] => {
      const targetNode = nodeMap.get(id);
      if (!targetNode) return [];
      const children = (childrenMap.get(id) || []).flatMap(child => deleteNodeAndChildren(child.id));
      return [id, ...children];
    };

    const idsToDelete = deleteNodeAndChildren(nodeId);
    const idsToDeleteSet = new Set(idsToDelete);
    const updatedNodes = nodes
      .filter(n => !idsToDeleteSet.has(n.id))
      .map(n => {
        if (n.children.some(id => idsToDeleteSet.has(id))) {
          return { ...n, children: n.children.filter(id => !idsToDeleteSet.has(id)), updatedAt: Date.now() };
        }
        return n;
      });

    // 삭제는 드래그가 아니므로 즉시 업데이트
    // onNodesChange에서 이미 DB 저장을 처리하므로 여기서는 중복 저장하지 않음
    onNodesChange(updatedNodes, false);
    if (selectedNodeId === nodeId) {
      onNodeSelect(null);
    }
  }, [nodeMap, childrenMap, nodes, onNodesChange, selectedNodeId, onNodeSelect, isReadOnly]);

  // 캔버스 클릭 시 선택 해제 및 편집 모드 종료 또는 노드 추가
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // 이동 모드일 때는 노드 선택/추가 동작을 하지 않음
    if (cursorMode === 'move') {
      return;
    }

    const target = e.target as HTMLElement;
    const isCanvasClick = target === canvasRef.current || target.closest('.canvas-container');
    
    // 노드 추가 모드이고 캔버스 클릭이면 노드 추가
    if (isAddNodeMode && isCanvasClick && onCanvasAddNode && !isReadOnly) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        // 화면 좌표를 캔버스 좌표로 변환
        const canvasX = (e.clientX - rect.left - pan.x) / zoom;
        const canvasY = (e.clientY - rect.top - pan.y) / zoom;
        onCanvasAddNode(canvasX, canvasY);
      }
      return;
    }
    
    // 일반적인 캔버스 클릭 처리
    if (isCanvasClick) {
      onNodeSelect(null);
      // 편집 모드 종료
      if (editingNodeId) {
        onEndEdit();
      }
    }
  }, [isAddNodeMode, onCanvasAddNode, isReadOnly, pan, zoom, onNodeSelect, editingNodeId, onEndEdit, cursorMode]);

  // 공유 경로 여부 계산 (노드 자신 또는 조상 중 공유된 노드가 있는 경우)
  const sharedPathMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    const dict = new Map(nodes.map(n => [n.id, n]));

    const dfs = (id: string | undefined | null): boolean => {
      if (!id) return false;
      if (map[id] !== undefined) return map[id];
      const node = dict.get(id);
      if (!node) return false;
      if (node.isShared) {
        map[id] = true;
        return true;
      }
      const result = dfs(node.parentId);
      map[id] = result;
      return result;
    };

    nodes.forEach(n => dfs(n.id));
    return map;
  }, [nodes]);

  // 캔버스 크기 계산 (노드들의 위치를 기반으로 동적 계산) - 최적화 버전
  const canvasBounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: -5000, minY: -5000, maxX: 5000, maxY: 5000, width: 10000, height: 10000 };
    }

    // 드래그 중에는 bounds 재계산 생략 (성능 향상)
    if (draggedNodeId && dragPositions.size > 0) {
      // 드래그 중에는 기존 bounds 사용 (약간의 여유 공간만 추가)
      const nodePositions = nodes.map(n => {
        const dragPos = dragPositions.get(n.id);
        return { 
          x: dragPos ? dragPos.x : n.x, 
          y: dragPos ? dragPos.y : n.y 
        };
      });
      
      // Math.min/max 최적화 (스프레드 연산자 대신 루프 사용)
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodePositions.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
      
      minX -= 2000;
      minY -= 2000;
      maxX += 2000;
      maxY += 2000;
      
      return { 
        minX, 
        minY, 
        maxX, 
        maxY, 
        width: maxX - minX, 
        height: maxY - minY 
      };
    }

    // 일반적인 경우: 루프로 최적화
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });

    minX -= 2000;
    minY -= 2000;
    maxX += 2000;
    maxY += 2000;

    return { 
      minX, 
      minY, 
      maxX, 
      maxY, 
      width: maxX - minX, 
      height: maxY - minY 
    };
  }, [nodes, draggedNodeId, dragPositions]);

  // 전역 우클릭 이벤트 리스너 - 마지막 우클릭 위치 추적
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isNodeOrButton = target.closest('.mindmap-node') || 
                             target.tagName === 'BUTTON' ||
                             target.closest('button') ||
                             target.tagName === 'SVG' ||
                             target.tagName === 'path' ||
                             target.closest('svg');

      // 빈 공간 우클릭인 경우에만 위치 저장
      if (!isNodeOrButton) {
        lastContextMenuEventRef.current = e;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && !isReadOnly && onCanvasAddNode) {
          setContextMenuPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      } else {
        // 노드 위에서 우클릭한 경우 위치 초기화
        lastContextMenuEventRef.current = null;
        setContextMenuPosition(null);
      }
    };

    document.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, [isReadOnly, onCanvasAddNode]);

  // 우클릭 메뉴에서 노드 추가 실행
  const handleContextMenuAddNode = useCallback(() => {
    if (!contextMenuPosition || !onCanvasAddNode) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 저장된 우클릭 위치를 캔버스 좌표로 변환
    const canvasX = (contextMenuPosition.x - pan.x) / zoom;
    const canvasY = (contextMenuPosition.y - pan.y) / zoom;
    
    onCanvasAddNode(canvasX, canvasY);
    setContextMenuPosition(null);
  }, [contextMenuPosition, onCanvasAddNode, pan, zoom]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <div
      ref={canvasRef}
          className={`w-full h-full overflow-hidden bg-gray-50 dark:bg-[#0a0a0a] relative transition-all duration-200 ${
            cursorMode === 'move' || spacePressed || isPanning
              ? 'cursor-grab active:cursor-grabbing'
              : isAddNodeMode
                ? 'cursor-crosshair'
                : draggedNodeId
                  ? 'cursor-move'
                  : 'cursor-default'
          }`}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
    >
      {/* 그리드 배경 - 라이트 모드 */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none z-0 dark:hidden"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(156, 163, 175, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(156, 163, 175, 0.08) 1px, transparent 1px),
              linear-gradient(to right, rgba(107, 114, 128, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(107, 114, 128, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px, 50px 50px, 200px 200px, 200px 200px',
            backgroundPosition: `${pan.x % 50}px ${pan.y % 50}px, ${pan.x % 50}px ${pan.y % 50}px, ${pan.x % 200}px ${pan.y % 200}px, ${pan.x % 200}px ${pan.y % 200}px`,
          }}
        />
      )}
      
      {/* 그리드 배경 - 다크 모드 */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none z-0 hidden dark:block"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(75, 85, 99, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(75, 85, 99, 0.1) 1px, transparent 1px),
              linear-gradient(to right, rgba(107, 114, 128, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(107, 114, 128, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px, 50px 50px, 200px 200px, 200px 200px',
            backgroundPosition: `${pan.x % 50}px ${pan.y % 50}px, ${pan.x % 50}px ${pan.y % 50}px, ${pan.x % 200}px ${pan.y % 200}px, ${pan.x % 200}px ${pan.y % 200}px`,
          }}
        />
      )}
      
      {/* 캔버스 컨테이너 - transform으로 줌/팬 처리 */}
      <div
        ref={canvasContainerRef}
        className="absolute canvas-container"
        style={{
          left: `${canvasBounds.minX}px`,
          top: `${canvasBounds.minY}px`,
          width: `${canvasBounds.width}px`,
          height: `${canvasBounds.height}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* 연결선 렌더링 */}
        <svg
          className="absolute pointer-events-none"
          style={{
            left: 0,
            top: 0,
            width: `${canvasBounds.width}px`,
            height: `${canvasBounds.height}px`,
            zIndex: 1,
          }}
        >
          {nodes.map(node => {
            if (!node.parentId) return null;
            // 인덱스 맵 사용
            const parent = nodeMap.get(node.parentId);
            if (!parent) return null;

            // 드래그 중 임시 좌표 사용
            const parentDragPos = dragPositions.get(parent.id);
            const nodeDragPos = dragPositions.get(node.id);
            const parentX = parentDragPos ? parentDragPos.x : parent.x;
            const parentY = parentDragPos ? parentDragPos.y : parent.y;
            const nodeX = nodeDragPos ? nodeDragPos.x : node.x;
            const nodeY = nodeDragPos ? nodeDragPos.y : node.y;

            const isSharedLine =
              (node.parentId && sharedPathMap[node.parentId]) || sharedPathMap[node.id];

            const x1 = parentX - canvasBounds.minX;
            const y1 = parentY - canvasBounds.minY;
            const x2 = nodeX - canvasBounds.minX;
            const y2 = nodeY - canvasBounds.minY;

            // 직선으로 연결 (연결선 스타일 기능 제거됨)
              return (
              <line
                  key={`line_${node.id}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                  stroke={isSharedLine ? themeColors.lineShared : themeColors.line}
                  strokeWidth={isSharedLine ? 2.6 : 2}
                  strokeLinecap="round"
              />
            );
          })}

          {/* 가상 연결선 (스냅 연결 중) */}
          {snapTargetNodeId && draggedNodeId && dragPositions.size > 0 && (() => {
            const draggedNode = nodeMap.get(draggedNodeId);
            const targetNode = nodeMap.get(snapTargetNodeId);
            if (!draggedNode || !targetNode) return null;

            const dragPos = dragPositions.get(draggedNodeId) || { x: draggedNode.x, y: draggedNode.y };
            const x1 = dragPos.x - canvasBounds.minX;
            const y1 = dragPos.y - canvasBounds.minY;
            const x2 = targetNode.x - canvasBounds.minX;
            const y2 = targetNode.y - canvasBounds.minY;

            return (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#5B6EFF"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
                className="pointer-events-none"
              />
            );
          })()}
        </svg>

        {/* 노드 렌더링 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${canvasBounds.width}px`,
            height: `${canvasBounds.height}px`,
            zIndex: 2,
          }}
        >
          {nodes.map(node => {
            // 노드 중심 뷰에서 원본 노드 데이터 찾기 (인덱스 맵 사용)
            const originalNode = centerNodeId && originalNodes
              ? originalNodes.find(n => n.id === node.id)
              : undefined;
            
            // 드래그 중 임시 좌표 사용
            const dragPos = dragPositions.get(node.id);
            const displayX = dragPos ? dragPos.x : node.x;
            const displayY = dragPos ? dragPos.y : node.y;
            
            return (
              <MindMapNode
                key={node.id}
                node={{ ...node, x: displayX, y: displayY }}
                isSelected={selectedNodeId === node.id}
                isEditing={editingNodeId === node.id}
                isSharedPath={sharedPathMap[node.id] ?? false}
                isSnapTarget={snapTargetNodeId === node.id}
                onSelect={onNodeSelect}
                onEdit={onNodeEdit}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
                onOpenInNewTab={onNodeOpenInNewTab}
                onOpenSTAREditor={onNodeOpenSTAREditor}
                onDragStart={handleNodeDragStart}
                onStartEdit={onStartEdit}
                onEndEdit={onEndEdit}
                x={displayX - canvasBounds.minX}
                y={displayY - canvasBounds.minY}
                centerNodeId={centerNodeId}
                originalNode={originalNode}
                onTagDrop={onTagDrop}
                isReadOnly={isReadOnly}
                colorTheme={colorTheme}
                isDarkMode={isDarkMode}
              />
            );
          })}
          
          {/* 원격 선택 표시 */}
        </div>
      </div>

      {/* 줌 컨트롤 */}
      <ZoomControl zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
    </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {contextMenuPosition && !isReadOnly && onCanvasAddNode && (
          <ContextMenuItem onClick={handleContextMenuAddNode}>
            <Plus className="w-4 h-4 mr-2" />
            노드 추가
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});

export default MindMapCanvas;
