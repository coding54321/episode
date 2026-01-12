'use client';

import { useState, useRef, useEffect } from 'react';
import { MindMapNode as NodeType, GapTag } from '@/types';
import { Plus, Share2, ExternalLink, XCircle, Copy, FileText } from 'lucide-react';
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
  onSelect: (nodeId: string) => void;
  onEdit: (nodeId: string, label: string) => void;
  onAddChild: (nodeId: string, direction?: 'right' | 'left' | 'top' | 'bottom') => void;
  onDelete: (nodeId: string) => void;
  onShare: (nodeId: string) => void;
  onUnshare?: (nodeId: string) => void;
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
}

export default function MindMapNode({
  node,
  isSelected,
  isEditing,
  isSharedPath,
  onSelect,
  onEdit,
  onAddChild,
  onDelete,
  onShare,
  onUnshare,
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
  const isRootNode = node.id === 'center' || node.nodeType === 'center';
  const isBadgeNode = node.level === 1 || node.nodeType === 'category';
  const isExperienceNode = node.level === 2 || node.nodeType === 'experience';
  const isEpisodeNode = node.level === 3 || node.nodeType === 'episode';
  const isDetailNode = node.level >= 4 || node.nodeType === 'detail';
  
  // 공유 배지는 최상단 노드(isShared=true)에만 표시
  const sharedBadge = node.isShared;
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
          className="group"
        >
          <div
            className={`
              relative min-w-[120px] text-center select-none transition-all duration-200
              ${isRootNode
                ? 'bg-blue-600 text-white border-2 border-blue-600 px-6 py-4 rounded-2xl shadow-lg font-bold'
                : isInSharedPath
                  ? 'bg-green-50 text-green-800 border-2 border-green-400 hover:border-green-500 px-4 py-3 rounded-xl shadow-sm ring-2 ring-green-100'
                  : isBadgeNode
                    ? 'bg-white text-blue-700 border-2 border-blue-300 hover:border-blue-400 px-4 py-3 rounded-xl shadow-sm font-semibold'
                    : isExperienceNode
                      ? 'bg-white text-purple-700 border-2 border-purple-300 hover:border-purple-400 px-4 py-3 rounded-xl shadow-sm'
                      : isEpisodeNode
                        ? 'bg-white text-green-700 border-2 border-green-300 hover:border-green-400 px-4 py-3 rounded-xl shadow-sm font-medium'
                        : isDetailNode
                          ? 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg shadow-sm'
                          : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-gray-300 px-4 py-3 rounded-xl shadow-sm'}
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
                  isRootNode ? 'text-base' : 'text-sm'
                }`}
              >
                {typeof node.label === 'string' ? node.label : '노드'}
              </div>
            )}

            {/* 공유 표시 아이콘 */}
            {sharedBadge && (
              <div className="absolute -top-2 -right-2 px-2 py-1 text-[10px] font-semibold bg-green-500 text-white rounded-full shadow-sm flex items-center gap-1">
                <Share2 className="w-3 h-3" />
                공유
              </div>
            )}
            {sharedBadge && !isRootNode && (
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow" />
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
          <>
            <ContextMenuItem onClick={() => onAddChild(node.id, 'right')}>
              <Plus className="w-4 h-4 mr-2" />
              하위 노드 추가
            </ContextMenuItem>
            {node.id !== 'center' && (
              <ContextMenuItem onClick={() => onStartEdit(node.id)}>
                이름 변경
              </ContextMenuItem>
            )}
          </>
        )}
        {/* 에피소드 노드일 때만 STAR 정리하기 표시 */}
        {(node.nodeType === 'episode' || node.level === 3) && onOpenSTAREditor && (
          <ContextMenuItem onClick={() => onOpenSTAREditor(node.id)}>
            <FileText className="w-4 h-4 mr-2" />
            STAR 정리하기
          </ContextMenuItem>
        )}
        {node.isShared ? (
          <>
            <ContextMenuItem 
              onClick={() => {
                if (node.sharedLink) {
                  navigator.clipboard.writeText(node.sharedLink).then(() => {
                    const toast = document.createElement('div');
                    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-[12px] text-sm font-medium shadow-lg z-50 transition-all duration-300';
                    toast.innerHTML = `
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                        <span>링크가 복사되었어요</span>
                      </div>
                    `;
                    document.body.appendChild(toast);
                    setTimeout(() => {
                      toast.style.opacity = '0';
                      setTimeout(() => document.body.removeChild(toast), 300);
                    }, 2000);
                  });
                }
              }}
              className="text-blue-600"
            >
              <Copy className="w-4 h-4 mr-2" />
              링크 복사하기
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onUnshare?.(node.id)}
              className="text-orange-600"
            >
              <XCircle className="w-4 h-4 mr-2" />
              공유 중지
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem onClick={() => onShare(node.id)}>
            <Share2 className="w-4 h-4 mr-2" />
            공유하기
          </ContextMenuItem>
        )}
        {onOpenInNewTab && (
          <ContextMenuItem onClick={() => onOpenInNewTab(node.id)}>
            <ExternalLink className="w-4 h-4 mr-2" />
            새 탭에서 열기
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
