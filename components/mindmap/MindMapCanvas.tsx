'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MindMapNode as NodeType, GapTag } from '@/types';
import { mindMapStorage } from '@/lib/storage';
import MindMapNode from './MindMapNode';

interface MindMapCanvasProps {
  nodes: NodeType[];
  onNodesChange: (nodes: NodeType[]) => void;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeEdit: (nodeId: string, label: string) => void;
  onNodeAddChild: (nodeId: string, direction?: 'right' | 'left' | 'top' | 'bottom') => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeShare: (nodeId: string) => void;
  onNodeUnshare?: (nodeId: string) => void;
  onNodeOpenInNewTab?: (nodeId: string) => void;
  onNodeOpenSTAREditor?: (nodeId: string) => void; // STAR 에디터 열기
  onStartEdit: (nodeId: string) => void;
  onEndEdit: () => void;
  projectId?: string;
  centerNodeId?: string | null; // 화면 중앙에 표시할 노드 ID
  originalNodes?: NodeType[]; // 원본 노드 배열 (좌표 변환 전)
  focusNodeId?: string | null; // 포커스할 노드 ID (검색 등에서 사용)
  onTagDrop?: (nodeId: string, tag: GapTag) => void; // 태그 드롭 핸들러
}

export default function MindMapCanvas({
  nodes,
  onNodesChange,
  selectedNodeId,
  editingNodeId,
  onNodeSelect,
  onNodeEdit,
  onNodeAddChild,
  onNodeDelete,
  onNodeShare,
  onNodeUnshare,
  onNodeOpenInNewTab,
  onNodeOpenSTAREditor,
  onStartEdit,
  onEndEdit,
  projectId,
  centerNodeId,
  originalNodes,
  focusNodeId,
  onTagDrop,
}: MindMapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 실시간 멀티탭 동기화
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'episode_mindmap' && e.newValue) {
        try {
          const updatedNodes = JSON.parse(e.newValue);
          if (Array.isArray(updatedNodes) && updatedNodes.length > 0) {
            onNodesChange(updatedNodes);
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
          // 컨테이너 transform: scale(zoom) translate(pan.x, pan.y)
          // 노드 중심점의 화면 좌표 = (0, 0) * zoom + pan = pan
          // 화면 중앙에 오려면: pan = (centerX, centerY)
          setPan({
            x: centerX,
            y: centerY,
          });
        } else {
          // 메인 뷰: center 노드(id === 'center')를 화면 중앙에 맞춤
          // nodes는 최신 값을 참조하므로 의존성 배열에 포함하지 않아도 됨
          const centerNode = nodes.find(n => n.id === 'center');
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
    
    const targetNode = nodes.find(n => n.id === focusNodeId);
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
    if (e.button === 1) { // 마우스 중간 버튼
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0 && spacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, [spacePressed]);

  // 특정 노드의 모든 하위 노드 가져오기 (재귀)
  const getDescendantIds = useCallback((nodeId: string): string[] => {
    const descendants: string[] = [];
    const children = nodes.filter(n => n.parentId === nodeId);
    
    children.forEach(child => {
      descendants.push(child.id);
      descendants.push(...getDescendantIds(child.id));
    });
    
    return descendants;
  }, [nodes]);

  // 마우스 이동 (팬 또는 노드 드래그)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (draggedNodeId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        // 화면 좌표를 캔버스 좌표로 변환
        const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

        // 오프셋을 빼서 새로운 노드 위치 계산
        const newX = mouseCanvasX - dragOffset.x;
        const newY = mouseCanvasY - dragOffset.y;

        // 드래그된 노드의 이전 위치 찾기
        const draggedNode = nodes.find(n => n.id === draggedNodeId);
        if (!draggedNode) return;

        // 이동량 계산
        const deltaX = newX - draggedNode.x;
        const deltaY = newY - draggedNode.y;

        // 하위 노드들의 ID 가져오기
        const descendantIds = getDescendantIds(draggedNodeId);

        const updatedNodes = nodes.map(node => {
          // 드래그된 노드
          if (node.id === draggedNodeId) {
            return { ...node, x: newX, y: newY, updatedAt: Date.now() };
          }
          // 하위 노드들도 같은 만큼 이동
          if (descendantIds.includes(node.id)) {
            return { 
              ...node, 
              x: node.x + deltaX, 
              y: node.y + deltaY, 
              updatedAt: Date.now() 
            };
          }
          return node;
        });
        onNodesChange(updatedNodes);
        if (projectId) {
          mindMapStorage.save(updatedNodes, projectId);
        }
      }
    }
  }, [isPanning, panStart, draggedNodeId, dragOffset, zoom, pan, nodes, onNodesChange, getDescendantIds]);

  // 마우스 업
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggedNodeId(null);
  }, []);

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

  // 휠로 확대/축소 (마우스 커서 위치 중심)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Ctrl/Cmd 키로 브라우저 확대/축소 방지
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      return;
    }

    // Alt 키를 눌렀을 때만 줌 (또는 Alt 없이도 작동하게 할 수 있음)
    if (e.altKey) {
      e.preventDefault();
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      // 마우스 위치 (캔버스 기준)
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 줌 변경 전 마우스가 가리키는 월드 좌표
      const worldXBefore = (mouseX - pan.x) / zoom;
      const worldYBefore = (mouseY - pan.y) / zoom;

      // 새로운 줌 레벨 계산
      const delta = -e.deltaY;
      const zoomSpeed = 0.001;
      const newZoom = Math.min(Math.max(zoom + delta * zoomSpeed, 0.25), 3);

      // 줌 변경 후 같은 월드 좌표가 마우스 위치에 오도록 pan 조정
      const worldXAfter = (mouseX - pan.x) / newZoom;
      const worldYAfter = (mouseY - pan.y) / newZoom;

      const newPan = {
        x: pan.x + (worldXAfter - worldXBefore) * newZoom,
        y: pan.y + (worldYAfter - worldYBefore) * newZoom,
      };

      setZoom(newZoom);
      setPan(newPan);
    }
  }, [zoom, pan]);

  // 노드 드래그 시작
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    // 중앙 노드나 편집 중이거나 팬 중이면 드래그 안 함
    if (nodeId === 'center' || editingNodeId || spacePressed || isPanning) return;

    // 버튼이나 아이콘 클릭은 무시
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.tagName === 'SVG' ||
        target.tagName === 'path') {
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
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

    e.stopPropagation();
  }, [editingNodeId, spacePressed, isPanning, nodes, pan, zoom]);

  // 노드 추가 (방향 기반) - prop 핸들러로 위임
  const handleAddChild = useCallback((parentId: string, direction: 'right' | 'left' | 'top' | 'bottom' = 'right') => {
    onNodeAddChild(parentId, direction);
  }, [onNodeAddChild]);

  // 노드 삭제
  const handleDelete = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    // 루트 노드만 삭제 불가 (배지 노드는 삭제 가능)
    if (!node || nodeId === 'center') return;

    // 하위 노드까지 재귀적으로 삭제
    const deleteNodeAndChildren = (id: string): string[] => {
      const targetNode = nodes.find(n => n.id === id);
      if (!targetNode) return [];
      const children = targetNode.children.flatMap(childId => deleteNodeAndChildren(childId));
      return [id, ...children];
    };

    const idsToDelete = deleteNodeAndChildren(nodeId);
    const updatedNodes = nodes
      .filter(n => !idsToDelete.includes(n.id))
      .map(n => {
        if (n.children.includes(nodeId)) {
          return { ...n, children: n.children.filter(id => id !== nodeId) };
        }
        return n;
      });

    onNodesChange(updatedNodes);
    mindMapStorage.save(updatedNodes);
    if (selectedNodeId === nodeId) {
      onNodeSelect(null);
    }
  }, [nodes, onNodesChange, selectedNodeId, onNodeSelect]);

  // 캔버스 클릭 시 선택 해제 및 편집 모드 종료
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-container')) {
      onNodeSelect(null);
      // 편집 모드 종료
      if (editingNodeId) {
        onEndEdit();
      }
    }
  }, [onNodeSelect, editingNodeId, onEndEdit]);

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

  // 캔버스 크기 계산 (노드들의 위치를 기반으로 동적 계산)
  const canvasBounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: -5000, minY: -5000, maxX: 5000, maxY: 5000, width: 10000, height: 10000 };
    }

    const nodePositions = nodes.map(n => ({ x: n.x, y: n.y }));
    const minX = Math.min(...nodePositions.map(p => p.x)) - 2000;
    const minY = Math.min(...nodePositions.map(p => p.y)) - 2000;
    const maxX = Math.max(...nodePositions.map(p => p.x)) + 2000;
    const maxY = Math.max(...nodePositions.map(p => p.y)) + 2000;

    const width = maxX - minX;
    const height = maxY - minY;

    return { minX, minY, maxX, maxY, width, height };
  }, [nodes]);

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full overflow-hidden bg-gray-50 relative transition-all duration-200 ${
        spacePressed || isPanning
          ? 'cursor-grab active:cursor-grabbing'
          : draggedNodeId
            ? 'cursor-move'
            : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
    >
      {/* 캔버스 컨테이너 - transform으로 줌/팬 처리 */}
      <div
        className="absolute canvas-container"
        style={{
          left: `${canvasBounds.minX}px`,
          top: `${canvasBounds.minY}px`,
          width: `${canvasBounds.width}px`,
          height: `${canvasBounds.height}px`,
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'top left',
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
            const parent = nodes.find(n => n.id === node.parentId);
            if (!parent) return null;

            const isSharedLine =
              (node.parentId && sharedPathMap[node.parentId]) || sharedPathMap[node.id];
            return (
              <line
                key={`line_${node.id}`}
                x1={parent.x - canvasBounds.minX}
                y1={parent.y - canvasBounds.minY}
                x2={node.x - canvasBounds.minX}
                y2={node.y - canvasBounds.minY}
                stroke={isSharedLine ? '#22c55e' : '#CBD5E1'}
                strokeWidth={isSharedLine ? 2.6 : 2}
                strokeLinecap="round"
              />
            );
          })}
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
            // 노드 중심 뷰에서 원본 노드 데이터 찾기
            const originalNode = centerNodeId && originalNodes
              ? originalNodes.find(n => n.id === node.id)
              : undefined;
            
            return (
              <MindMapNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                isEditing={editingNodeId === node.id}
                isSharedPath={sharedPathMap[node.id] ?? false}
                onSelect={onNodeSelect}
                onEdit={onNodeEdit}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
                onShare={onNodeShare}
                onUnshare={onNodeUnshare}
                onOpenInNewTab={onNodeOpenInNewTab}
                onOpenSTAREditor={onNodeOpenSTAREditor}
                onDragStart={handleNodeDragStart}
                onStartEdit={onStartEdit}
                onEndEdit={onEndEdit}
                x={node.x - canvasBounds.minX}
                y={node.y - canvasBounds.minY}
                centerNodeId={centerNodeId}
                originalNode={originalNode}
                onTagDrop={onTagDrop}
              />
            );
          })}
        </div>
      </div>

      {/* 줌 컨트롤 */}
      <div className="absolute bottom-6 right-5 flex flex-col gap-1 bg-white rounded-[12px] shadow-sm border border-gray-200 p-1 z-50">
        <button
          onClick={() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) {
              setZoom(prev => Math.min(3, prev + 0.1));
              return;
            }

            // 화면 중앙 좌표
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // 줌 변경 전 중앙이 가리키는 월드 좌표
            const worldXBefore = (centerX - pan.x) / zoom;
            const worldYBefore = (centerY - pan.y) / zoom;

            // 새로운 줌 레벨
            const newZoom = Math.min(3, zoom + 0.1);

            // 줌 변경 후 같은 월드 좌표가 중앙에 오도록 pan 조정
            const newPan = {
              x: centerX - worldXBefore * newZoom,
              y: centerY - worldYBefore * newZoom,
            };

            setZoom(newZoom);
            setPan(newPan);
          }}
          className="w-8 h-8 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-[8px] transition-colors duration-200 flex items-center justify-center"
        >
          +
        </button>
        <div className="text-xs text-center text-gray-500 py-1">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) {
              setZoom(prev => Math.max(0.25, prev - 0.1));
              return;
            }

            // 화면 중앙 좌표
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // 줌 변경 전 중앙이 가리키는 월드 좌표
            const worldXBefore = (centerX - pan.x) / zoom;
            const worldYBefore = (centerY - pan.y) / zoom;

            // 새로운 줌 레벨
            const newZoom = Math.max(0.25, zoom - 0.1);

            // 줌 변경 후 같은 월드 좌표가 중앙에 오도록 pan 조정
            const newPan = {
              x: centerX - worldXBefore * newZoom,
              y: centerY - worldYBefore * newZoom,
            };

            setZoom(newZoom);
            setPan(newPan);
          }}
          className="w-8 h-8 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-[8px] transition-colors duration-200 flex items-center justify-center"
        >
          −
        </button>
        <div className="border-t border-gray-100 my-1" />
        <button
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setZoom(1);
          }}
          className="w-8 h-8 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-[8px] transition-colors duration-200 flex items-center justify-center"
          title="리셋"
        >
          ⌂
        </button>
      </div>

    </div>
  );
}
