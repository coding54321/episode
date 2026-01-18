'use client';

import { X, Plus } from 'lucide-react';
import Link from 'next/link';

export interface Tab {
  id: string;
  label: string;
  nodeId: string | null; // null이면 메인 뷰
  href: string;
  type?: 'node' | 'project' | 'external' | 'new'; // 탭 타입
  projectId?: string; // 프로젝트 탭인 경우
}

interface MindMapTabsProps {
  tabs: Tab[];
  activeTabId: string;
  projectId?: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab?: () => void; // + 버튼 클릭 핸들러
}

export default function MindMapTabs({
  tabs,
  activeTabId,
  projectId,
  onTabClick,
  onTabClose,
  onAddTab,
}: MindMapTabsProps) {
  return (
    <div className="sticky top-[64px] z-30 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex items-center overflow-x-auto">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`
            flex items-center gap-2 px-4 py-2 border-r border-gray-300 dark:border-gray-700 min-w-[150px] max-w-[200px] cursor-pointer transition-colors
            ${activeTabId === tab.id ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}
          `}
          onClick={() => onTabClick(tab.id)}
        >
          <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{tab.label}</span>
          {(tab.nodeId || tab.type === 'project' || tab.type === 'new') && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              onMouseDown={(e) => {
                // 마우스 다운 이벤트도 차단하여 확실하게 처리
                e.preventDefault();
                e.stopPropagation();
              }}
              className="hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5 transition-colors flex-shrink-0"
              title="탭 닫기"
            >
              <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      ))}
      
      {/* + 버튼 */}
      {onAddTab && (
        <button
          onClick={onAddTab}
          className="flex items-center justify-center w-8 h-8 mx-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          title="탭 추가"
        >
          <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
}

