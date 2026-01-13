'use client';

import { X } from 'lucide-react';
import Link from 'next/link';

export interface Tab {
  id: string;
  label: string;
  nodeId: string | null; // null이면 메인 뷰
  href: string;
}

interface MindMapTabsProps {
  tabs: Tab[];
  activeTabId: string;
  projectId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export default function MindMapTabs({
  tabs,
  activeTabId,
  projectId,
  onTabClick,
  onTabClose,
}: MindMapTabsProps) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex items-center overflow-x-auto">
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
          {!tab.nodeId && (
            <span className="text-xs text-gray-500 dark:text-gray-400 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">메인</span>
          )}
          {tab.nodeId && (
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
    </div>
  );
}

