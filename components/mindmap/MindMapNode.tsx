'use client';

import { useState, useRef, useEffect } from 'react';
import { MindMapNode as NodeType, GapTag, ColorTheme } from '@/types';
import { getNodeColors } from '@/lib/mindmap-theme';
import { Plus, FileText } from 'lucide-react';
import { useDrop } from 'react-dnd';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface MindMapNodeProps {
  node: NodeType;
  isSelected: boolean;
  isEditing: boolean;
  isSharedPath: boolean;
  isSnapTarget?: boolean; // 스냅 연결 대상인지 여부
  isHighlighted?: boolean; // 역량 필터로 하이라이트된 노드인지 여부
  onSelect: (nodeId: string) => void;
  onEdit: (nodeId: string, label: string) => void;
  onAddChild: (nodeId: string, direction?: 'right' | 'left' | 'top' | 'bottom') => void;
  onDelete: (nodeId: string) => void;
  onOpenInNewTab?: (nodeId: string) => void;
  onOpenSTAREditor?: (nodeId: string) => void; // STAR 에디터 열기
  onDragStart: (nodeId: string, e: React.MouseEvent) => void;
  onStartEdit: (nodeId: string) => void;
  onEndEdit: () => void;
  x: number;
  y: number;
  centerNodeId?: string | null; // 노드 중심 뷰의 중심 노드 ID
  originalNode?: NodeType; // 원본 노드 데이터 (좌표 변환 전)
  onTagDrop?: (nodeId: string, tag: GapTag) => void; // 태그 드롭 핸들러
  isReadOnly?: boolean; // 읽기 전용 모드
  colorTheme?: ColorTheme; // 색상 테마
  isDarkMode?: boolean; // 다크모드 여부
}

export default function MindMapNode({
  node,
  isSelected,
  isEditing,
  isSharedPath,
  isSnapTarget = false,
  isHighlighted = false,
  onSelect,
  onEdit,
  onAddChild,
  onDelete,
  onOpenInNewTab,
  onOpenSTAREditor,
  onDragStart,
  onStartEdit,
  onEndEdit,
  x,
  y,
  centerNodeId,
  originalNode,
  onTagDrop,
  isReadOnly = false,
  colorTheme = 'default',
  isDarkMode = false,
}: MindMapNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [editValue, setEditValue] = useState(node.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 노드 타입별 스타일 결정
  const isRootNode = node.nodeType === 'center' || node.level === 0;
  const isBadgeNode = node.level === 1 || node.nodeType === 'category';
  const isExperienceNode = node.level === 2 || node.nodeType === 'experience';
  const isEpisodeNode = node.level === 3 || node.nodeType === 'episode';
  const isDetailNode = node.level >= 4 || node.nodeType === 'detail';
  
  // 공유 경로 스타일은 isSharedPath 또는 node.isShared일 때 적용
  const isInSharedPath = isSharedPath || node.isShared;
  
  // 노드 중심 뷰에서는 원본 노드 데이터를 사용하여 삭제 가능 여부 판단
  const isCenterOfCenterView = centerNodeId === node.id;
  const nodeForDeletion = originalNode || node;
  // 루트 노드와 노드 중심 뷰의 중심 노드만 삭제 불가 (배지 노드도 삭제 가능)
  const canDelete = !isRootNode && nodeForDeletion.parentId !== null && !isCenterOfCenterView;
  
  // 루트 노드에만 드롭 불가 (배지 노드는 드롭 가능)
  const canDropOnNode = !isRootNode;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(typeof node.label === 'string' ? node.label : '노드');
  }, [node.label]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return; // 읽기 전용이면 편집 불가
    // 중심 노드도 편집 가능하도록 허용
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

  // 노드 레벨별 테마 색상 가져오기
  const nodeColors = getNodeColors(
    colorTheme,
    isDarkMode,
    node.nodeType || 'detail',
    node.level
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>
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
            // 버튼 영역에 마우스가 있으면 호버 유지
            if (isButtonHovered) return;
            
            // 약간의 딜레이를 주어 버튼 클릭 가능하게
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
              backgroundColor: isRootNode
                ? nodeColors.background
                : isInSharedPath
                  ? undefined // 공유 경로는 기존 Tailwind 스타일 유지
                  : nodeColors.background,
              color: isRootNode
                ? nodeColors.text
                : isInSharedPath
                  ? undefined // 공유 경로는 기존 Tailwind 스타일 유지
                  : nodeColors.text,
              borderColor: isRootNode
                ? nodeColors.border
                : isInSharedPath
                  ? undefined // 공유 경로는 기존 Tailwind 스타일 유지
                  : nodeColors.border,
            }}
            className={`
              relative select-none transition-all duration-200 border-2
              ${isRootNode ? 'w-52 h-52 rounded-full flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(80,144,255,0.25)] font-bold' : 'min-w-[120px] text-center'}
              ${!isRootNode && (
                isInSharedPath
                  ? ' px-4 py-3 rounded-xl shadow-sm ring-2 ring-green-100 bg-green-50 text-green-800 border-green-400 hover:border-green-500'
                  : isBadgeNode
                    ? ' px-4 py-3 rounded-xl shadow-sm font-semibold hover:brightness-95'
                    : isExperienceNode
                      ? ' px-4 py-3 rounded-xl shadow-sm hover:brightness-95'
                      : isEpisodeNode
                        ? ' px-4 py-3 rounded-xl shadow-sm font-medium hover:brightness-95'
                        : isDetailNode
                          ? ' px-3 py-2 rounded-lg shadow-sm hover:brightness-95'
                          : ' px-4 py-3 rounded-xl shadow-sm hover:brightness-95'
              )}
              ${
                isSelected
                  ? 'ring-4 ring-blue-200 ring-opacity-60'
                  : ''
              }
              ${
                isOver && canDrop
                  ? 'ring-4 ring-blue-400 ring-opacity-80 border-blue-400 bg-blue-50'
                  : ''
              }
              ${
                isSnapTarget
                  ? 'ring-4 ring-[#5B6EFF] ring-opacity-60 border-[#5B6EFF] shadow-[0_0_15px_rgba(91,110,255,0.4)]'
                  : ''
              }
              ${
                isHighlighted && !isSelected && !isSnapTarget
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/50'
                  : ''
              }
            `}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="bg-transparent border-none outline-none text-center w-full font-medium text-sm text-inherit"
                onClick={(e) => e.stopPropagation()}
                placeholder="노드 이름"
              />
            ) : (
              <div
                className={`font-medium leading-snug ${
                  isRootNode ? 'text-lg' : 'text-sm'
                }`}
              >
                {typeof node.label === 'string' ? node.label : '노드'}
              </div>
            )}

            {/* 4방향 추가 버튼들 (모든 노드에서 가능) - 읽기 전용이면 숨김 */}
            {!isReadOnly && !isEditing && (isHovered || isSelected) && (
              <>
                {/* 오른쪽 */}
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
                    onAddChild(node.id, 'right');
                  }}
                  className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-20 pointer-events-auto ${
                    isSelected || isHovered || isButtonHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}
                  title="오른쪽에 노드 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* 왼쪽 */}
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
                    onAddChild(node.id, 'left');
                  }}
                  className={`absolute right-full top-1/2 -translate-y-1/2 mr-2 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-20 pointer-events-auto ${
                    isSelected || isHovered || isButtonHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}
                  title="왼쪽에 노드 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* 위쪽 */}
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
                    onAddChild(node.id, 'top');
                  }}
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-20 pointer-events-auto ${
                    isSelected || isHovered || isButtonHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}
                  title="위에 노드 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* 아래쪽 */}
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
                    onAddChild(node.id, 'bottom');
                  }}
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-20 pointer-events-auto ${
                    isSelected || isHovered || isButtonHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}
                  title="아래에 노드 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* 삭제 버튼 (중앙 노드, 배지 노드, 노드 중심 뷰의 중심 노드는 삭제 불가) */}
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
                    className={`absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 text-base font-bold z-20 pointer-events-auto ${
                      isSelected || isHovered || isButtonHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
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
        {/* 에피소드 노드일 때만 STAR 정리하기 표시 */}
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
