'use client';

import { useState, useRef, useEffect } from 'react';
import { MindMapNode as NodeType, GapTag } from '@/types';
import { useDrop } from 'react-dnd';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { Plus, FileText } from 'lucide-react';
import {
  getNodeColor,
  getColorData,
  getNodeStyles,
  getNodeLevelType,
  CENTER_NODE_COLOR,
  NODE_SIZE_CONFIG,
  type NodeState,
  type NodeLevelType
} from '@/lib/mindmap-design-system';

interface MindMapNodeProps {
  node: NodeType;
  nodes: NodeType[]; // 전체 노드 배열 (색상 상속 계산용)
  isSelected: boolean;
  isEditing: boolean;
  isSharedPath: boolean;
  isSnapTarget?: boolean;
  isHighlighted?: boolean;
  isDragging?: boolean;
  isHovered?: boolean;
  onSelect: (nodeId: string) => void;
  onEdit: (nodeId: string, label: string) => void;
  onAddChild: (nodeId: string, direction?: 'right' | 'left' | 'top' | 'bottom') => void;
  onDelete: (nodeId: string) => void;
  onOpenSTAREditor?: (nodeId: string) => void;
  onDragStart: (nodeId: string, e: React.MouseEvent) => void;
  onStartEdit: (nodeId: string) => void;
  onEndEdit: () => void;
  onMenuClick?: (nodeId: string, position: { x: number; y: number }) => void; // 메뉴 버튼 클릭
  x: number;
  y: number;
  centerNodeId?: string | null;
  originalNode?: NodeType;
  onTagDrop?: (nodeId: string, tag: GapTag) => void;
  isReadOnly?: boolean;
}

export default function MindMapNode({
  node,
  nodes,
  isSelected,
  isEditing,
  isSharedPath,
  isSnapTarget = false,
  isHighlighted = false,
  isDragging = false,
  onSelect,
  onEdit,
  onAddChild,
  onDelete,
  onOpenSTAREditor,
  onDragStart,
  onStartEdit,
  onEndEdit,
  onMenuClick,
  x,
  y,
  centerNodeId,
  originalNode,
  onTagDrop,
  isReadOnly = false,
}: MindMapNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [hoveredDirection, setHoveredDirection] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);
  const [editValue, setEditValue] = useState(node.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

  // 노드 타입별 스타일 결정
  const isRootNode = node.nodeType === 'center' || node.level === 0;
  const canDropOnNode = !isRootNode;
  const isCenterOfCenterView = centerNodeId === node.id;
  const nodeForDeletion = originalNode || node;
  const canDelete = !isRootNode && nodeForDeletion.parentId !== null && !isCenterOfCenterView;

  // 노드 색상 계산
  const nodeColorName = getNodeColor(node, nodes);
  const colorData = getColorData(nodeColorName);

  // 노드 레벨 타입 결정
  const levelType: NodeLevelType = getNodeLevelType(node.level, node.nodeType);

  // 상태 결정
  const state: NodeState = isSelected || isDragging
    ? 'active'
    : isHighlighted
    ? 'highlighted'
    : isHovered
    ? 'hover'
    : 'default';

  // 스타일 적용 (레벨 타입 포함)
  const styles = getNodeStyles(nodeColorName, state, levelType);
  const sizeConfig = NODE_SIZE_CONFIG[levelType === 'center' ? 'detail' : levelType];

  // 드롭 존 설정
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'GAP_TAG',
    drop: (item: GapTag) => {
      if (onTagDrop && canDropOnNode) {
        onTagDrop(node.id, item);
      }
    },
    canDrop: () => canDropOnNode,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [node.id, onTagDrop]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(typeof node.label === 'string' ? node.label : '노드');
  }, [node.label]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    onStartEdit(node.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onEdit(node.id, editValue.trim() || '노드');
      onEndEdit();
    } else if (e.key === 'Escape') {
      setEditValue(node.label);
      onEndEdit();
    }
  };

  const handleBlur = () => {
    onEdit(node.id, editValue.trim() || '노드');
    onEndEdit();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleMenuButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 노드 선택
    onSelect(node.id);
    // 컨텍스트 메뉴를 열기 위해 우클릭 이벤트 시뮬레이션
    if (contextMenuTriggerRef.current) {
      const rightClickEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: e.clientX,
        clientY: e.clientY,
        button: 2,
      });
      contextMenuTriggerRef.current.dispatchEvent(rightClickEvent);
    }
    if (onMenuClick) {
      onMenuClick(node.id, { x: e.clientX, y: e.clientY });
    }
  };

  // 중심 노드 렌더링
  if (isRootNode) {
    const centerSize = NODE_SIZE_CONFIG.center;
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: 'translate(-50%, -50%)',
          zIndex: isSelected ? 10 : 1,
        }}
        onMouseDown={(e) => onDragStart(node.id, e)}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        className="group mindmap-node"
      >
        <div
          style={{
            minWidth: centerSize.minWidth,
            minHeight: centerSize.minHeight,
            maxWidth: centerSize.maxWidth,
            background: CENTER_NODE_COLOR,
            borderRadius: centerSize.borderRadius,
            padding: centerSize.padding,
          }}
          className="flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(80,101,255,0.35)] aspect-square"
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="bg-transparent border-none outline-none text-center w-full font-semibold text-xl text-white"
              onClick={(e) => e.stopPropagation()}
              placeholder="노드 이름"
            />
          ) : (
            <div className="text-white text-xl font-semibold leading-tight">
              {typeof node.label === 'string' ? node.label : '노드'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 일반 노드 렌더링
  return (
    <ContextMenu>
      <ContextMenuTrigger ref={contextMenuTriggerRef}>
        <div
          ref={drop as any}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translate(-50%, -50%)',
            zIndex: isSelected ? 10 : 1,
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setIsHovered(true);
          }}
          onMouseLeave={() => {
            if (isButtonHovered) return;
            hoverTimeoutRef.current = setTimeout(() => {
              setIsHovered(false);
            }, 100);
          }}
          onMouseDown={(e) => onDragStart(node.id, e)}
          onDoubleClick={handleDoubleClick}
          onClick={handleClick}
          className="group mindmap-node"
        >
          <div
            style={{
              minWidth: styles.minWidth,
              minHeight: styles.minHeight,
              background: styles.background,
              border: styles.border,
              boxShadow: styles.shadow === 'none' ? undefined : styles.shadow,
              borderRadius: styles.borderRadius,
              padding: styles.padding,
              position: 'relative',
              outline: isSnapTarget ? `4px solid ${colorData.op30}` : undefined,
              outlineOffset: isSnapTarget ? '-2px' : undefined,
            }}
            className={`
              flex items-center justify-center gap-2.5 transition-all duration-200
              ${isOver && canDrop ? 'ring-4 ring-blue-400 ring-opacity-80 border-blue-400 bg-blue-50' : ''}
            `}
          >
            {/* 텍스트 영역 */}
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                style={{
                  color: styles.textColor,
                  fontSize: styles.fontSize,
                  fontWeight: styles.fontWeight,
                }}
                className="bg-transparent border-none outline-none text-center w-full flex-1"
                onClick={(e) => e.stopPropagation()}
                placeholder="노드 이름"
              />
            ) : (
              <div
                style={{
                  color: styles.textColor,
                  fontSize: styles.fontSize,
                  fontWeight: styles.fontWeight,
                }}
                className="flex-1 text-center leading-tight"
              >
                {typeof node.label === 'string' ? node.label : '노드'}
              </div>
            )}

            {/* 우측 상단 메뉴 버튼 */}
            {!isEditing && (
              <button
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                  }
                  setIsButtonHovered(true);
                  setIsHovered(true);
                }}
                onMouseLeave={() => {
                  setIsButtonHovered(false);
                  hoverTimeoutRef.current = setTimeout(() => {
                    setIsHovered(false);
                  }, 150);
                }}
                onClick={handleMenuButtonClick}
                style={{
                  width: '28px',
                  height: '28px',
                  background: isHovered || isSelected ? colorData.base : styles.iconBg,
                  borderTopRightRadius: levelType === 'category' ? '14px' : '12px',
                  borderBottomLeftRadius: levelType === 'category' ? '14px' : '12px',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                }}
                className="flex items-center justify-center transition-all duration-200"
                title="메뉴"
              >
                {/* 작은 점 3개 */}
                <div className="flex gap-0.5 items-center justify-center">
                  <div className="w-[3px] h-[3px] bg-white rounded-full" />
                  <div className="w-[3px] h-[3px] bg-white rounded-full" />
                  <div className="w-[3px] h-[3px] bg-white rounded-full" />
                </div>
              </button>
            )}

            {/* 4방향 연결점/화살표 버튼 - 노드 호버 시에만 표시 */}
            {!isReadOnly && !isEditing && (isHovered || isSelected) && (
              <>
                {/* 오른쪽 연결점/화살표 */}
                <button
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setIsButtonHovered(true);
                    setIsHovered(true);
                    setHoveredDirection('right');
                  }}
                  onMouseLeave={() => {
                    setIsButtonHovered(false);
                    setHoveredDirection(null);
                    hoverTimeoutRef.current = setTimeout(() => {
                      setIsHovered(false);
                    }, 150);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(node.id, 'right');
                  }}
                  className="absolute -right-12 top-1/2 -translate-y-1/2 z-20 pointer-events-auto transition-all duration-200"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                  }}
                  title="오른쪽에 노드 추가"
                >
                  {hoveredDirection === 'right' ? (
                    // 화살표 버튼 (호버 시) - 점과 같은 중심점 유지
                    <div className="relative w-[36px] h-[36px] flex items-center justify-center">
                      <div
                        style={{ background: colorData.op15 }}
                        className="absolute inset-[-4px] rounded-full"
                      />
                      <div
                        style={{ background: colorData.base, border: '2px solid white' }}
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ background: colorData.base }}
                      className="w-[11px] h-[11px] rounded-full"
                    />
                  )}
                </button>

                {/* 왼쪽 연결점/화살표 */}
                <button
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setIsButtonHovered(true);
                    setIsHovered(true);
                    setHoveredDirection('left');
                  }}
                  onMouseLeave={() => {
                    setIsButtonHovered(false);
                    setHoveredDirection(null);
                    hoverTimeoutRef.current = setTimeout(() => {
                      setIsHovered(false);
                    }, 150);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(node.id, 'left');
                  }}
                  className="absolute -left-12 top-1/2 -translate-y-1/2 z-20 pointer-events-auto transition-all duration-200"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                  }}
                  title="왼쪽에 노드 추가"
                >
                  {hoveredDirection === 'left' ? (
                    // 화살표 버튼 (호버 시) - 점과 같은 중심점 유지
                    <div className="relative w-[36px] h-[36px] flex items-center justify-center">
                      <div
                        style={{ background: colorData.op15 }}
                        className="absolute inset-[-4px] rounded-full"
                      />
                      <div
                        style={{ background: colorData.base, border: '2px solid white' }}
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ background: colorData.base }}
                      className="w-[11px] h-[11px] rounded-full"
                    />
                  )}
                </button>

                {/* 위쪽 연결점/화살표 */}
                <button
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setIsButtonHovered(true);
                    setIsHovered(true);
                    setHoveredDirection('top');
                  }}
                  onMouseLeave={() => {
                    setIsButtonHovered(false);
                    setHoveredDirection(null);
                    hoverTimeoutRef.current = setTimeout(() => {
                      setIsHovered(false);
                    }, 150);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(node.id, 'top');
                  }}
                  className="absolute left-1/2 -top-8 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto transition-all duration-200 flex items-center justify-center"
                  title="위에 노드 추가"
                >
                  {hoveredDirection === 'top' ? (
                    // 화살표 버튼 (호버 시) - 점과 같은 중심점 유지
                    <div className="relative w-[36px] h-[36px] flex items-center justify-center">
                      <div
                        style={{ background: colorData.op15 }}
                        className="absolute inset-[-4px] rounded-full"
                      />
                      <div
                        style={{ background: colorData.base, border: '2px solid white' }}
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M6 15L12 9L18 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ background: colorData.base }}
                      className="w-[11px] h-[11px] rounded-full"
                    />
                  )}
                </button>

                {/* 아래쪽 연결점/화살표 */}
                <button
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setIsButtonHovered(true);
                    setIsHovered(true);
                    setHoveredDirection('bottom');
                  }}
                  onMouseLeave={() => {
                    setIsButtonHovered(false);
                    setHoveredDirection(null);
                    hoverTimeoutRef.current = setTimeout(() => {
                      setIsHovered(false);
                    }, 150);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(node.id, 'bottom');
                  }}
                  className="absolute left-1/2 -bottom-8 -translate-x-1/2 translate-y-1/2 z-20 pointer-events-auto transition-all duration-200 flex items-center justify-center"
                  title="아래에 노드 추가"
                >
                  {hoveredDirection === 'bottom' ? (
                    // 화살표 버튼 (호버 시) - 점과 같은 중심점 유지
                    <div className="relative w-[36px] h-[36px] flex items-center justify-center">
                      <div
                        style={{ background: colorData.op15 }}
                        className="absolute inset-[-4px] rounded-full"
                      />
                      <div
                        style={{ background: colorData.base, border: '2px solid white' }}
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ background: colorData.base }}
                      className="w-[11px] h-[11px] rounded-full"
                    />
                  )}
                </button>

                {/* 삭제 버튼 */}
                {canDelete && (
                  <button
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      setIsButtonHovered(true);
                      setIsHovered(true);
                    }}
                    onMouseLeave={() => {
                      setIsButtonHovered(false);
                      hoverTimeoutRef.current = setTimeout(() => {
                        setIsHovered(false);
                      }, 150);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('이 노드와 모든 하위 노드를 삭제하시겠습니까?')) {
                        onDelete(node.id);
                      }
                    }}
                    className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all duration-200 text-xs font-bold z-20 pointer-events-auto"
                    title="삭제"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {!isReadOnly && (
          <ContextMenuItem onClick={() => onAddChild(node.id, 'right')}>
            <Plus className="w-4 h-4 mr-2" />
            하위 노드 추가
          </ContextMenuItem>
        )}
        {(node.nodeType === 'episode' || node.level === 3) && onOpenSTAREditor && (
          <ContextMenuItem onClick={() => onOpenSTAREditor(node.id)}>
            <FileText className="w-4 h-4 mr-2" />
            STAR 정리하기
          </ContextMenuItem>
        )}
        {!isReadOnly && canDelete && (
          <ContextMenuItem
            onClick={() => onDelete(node.id)}
            className="text-red-600"
          >
            삭제
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
