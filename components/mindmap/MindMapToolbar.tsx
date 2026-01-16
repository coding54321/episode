'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Maximize2,
  Grid3x3,
  Undo2,
  Redo2,
  Download,
  Share2,
  Plus,
  Move,
  MousePointer2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type CursorMode = 'select' | 'move';

interface MindMapToolbarProps {
  onFitToScreen: () => void;
  onToggleGrid: () => void;
  showGrid: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onExport?: (type: 'image' | 'pdf') => void;
  onShare?: () => void;
  onToggleAddNodeMode?: () => void;
  isAddNodeMode?: boolean;
  cursorMode?: CursorMode;
  onCursorModeChange?: (mode: CursorMode) => void;
  topOffset?: number; // 상단 오프셋 (프로젝트 정보 헤더 높이 고려)
}

export default function MindMapToolbar({
  onFitToScreen,
  onToggleGrid,
  showGrid,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onExport,
  onShare,
  onToggleAddNodeMode,
  isAddNodeMode = false,
  cursorMode = 'select',
  onCursorModeChange,
  topOffset = 120,
}: MindMapToolbarProps) {

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute left-4 z-50 flex flex-col gap-2" style={{ top: `${topOffset}px` }}>
        {/* 커서 모드 선택 (선택/무브) */}
        {onCursorModeChange && (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-9 w-9 p-0 bg-white dark:bg-[#1a1a1a] shadow-lg border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg ${
                      cursorMode === 'move' ? 'bg-[#5B6EFF]/10 dark:bg-[#5B6EFF]/20 border-[#5B6EFF]' : ''
                    }`}
                  >
                    {cursorMode === 'select' ? (
                      <MousePointer2 className="h-4 w-4" />
                    ) : (
                      <Move className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem
                    onClick={() => onCursorModeChange('select')}
                    className={cursorMode === 'select' ? 'bg-[#5B6EFF]/10 dark:bg-[#5B6EFF]/20' : ''}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {cursorMode === 'select' && <span className="text-[#5B6EFF]">✓</span>}
                      <MousePointer2 className="h-4 w-4" />
                      <span>선택</span>
                      <span className="ml-auto text-xs text-gray-500">V</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onCursorModeChange('move')}
                    className={cursorMode === 'move' ? 'bg-[#5B6EFF]/10 dark:bg-[#5B6EFF]/20' : ''}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {cursorMode === 'move' && <span className="text-[#5B6EFF]">✓</span>}
                      <Move className="h-4 w-4" />
                      <span>이동</span>
                      <span className="ml-auto text-xs text-gray-500">H</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{cursorMode === 'select' ? '선택 모드' : '이동 모드'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 구분선 */}
        {onCursorModeChange && <div className="h-px bg-gray-200 dark:bg-[#2a2a2a] my-1" />}

        {/* 전체 보기 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onFitToScreen}
              className="h-9 w-9 p-0 bg-white dark:bg-[#1a1a1a] shadow-lg border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>전체 보기</p>
          </TooltipContent>
        </Tooltip>

      {/* 노드 추가 */}
      {onToggleAddNodeMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAddNodeMode}
              className={`h-9 w-9 p-0 bg-white dark:bg-[#1a1a1a] shadow-lg border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-all ${
                isAddNodeMode 
                  ? 'bg-[#5B6EFF]/10 dark:bg-[#5B6EFF]/20 border-[#5B6EFF] shadow-[0_0_10px_rgba(91,110,255,0.3)]' 
                  : ''
              }`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{isAddNodeMode ? '노드 추가 모드 종료 (ESC)' : '노드 추가'}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* 구분선 */}
      <div className="h-px bg-gray-200 dark:bg-[#2a2a2a] my-1" />

      {/* 그리드 토글 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleGrid}
            className={`h-9 w-9 p-0 bg-white dark:bg-[#1a1a1a] shadow-lg border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg ${
              showGrid ? 'bg-[#5B6EFF]/10 dark:bg-[#5B6EFF]/20 border-[#5B6EFF]' : ''
            }`}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{showGrid ? '그리드 숨기기' : '그리드 표시'}</p>
        </TooltipContent>
      </Tooltip>

      {/* 실행 취소/다시 실행 */}
      {(onUndo || onRedo) && (
        <>
          <div className="h-px bg-gray-200 dark:bg-[#2a2a2a] my-1" />
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-gray-200 dark:border-[#2a2a2a] p-1 flex flex-col gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>실행 취소 {canUndo ? '' : '(사용 불가)'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] disabled:opacity-50"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>다시 실행 {canRedo ? '' : '(사용 불가)'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </>
      )}

      {/* 구분선 */}
      <div className="h-px bg-gray-200 dark:bg-[#2a2a2a] my-1" />

      {/* 내보내기 */}
      {onExport && (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 bg-white dark:bg-[#1a1a1a] shadow-lg border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => onExport?.('image')}>
                  이미지로 저장
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport?.('pdf')}>
                  PDF로 저장
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>내보내기</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* 공유 */}
      {onShare && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="h-9 w-9 p-0 bg-white dark:bg-[#1a1a1a] shadow-lg border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>공유</p>
          </TooltipContent>
        </Tooltip>
      )}
      </div>
    </TooltipProvider>
  );
}
