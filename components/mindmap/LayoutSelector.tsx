'use client';

import { LayoutType, LayoutConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Network, GitBranch } from 'lucide-react';

interface LayoutSelectorProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  className?: string;
}

const LAYOUT_OPTIONS: { type: LayoutType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  {
    type: 'radial',
    label: '원형 레이아웃',
    icon: Network,
    description: '중심 노드를 기준으로 원형 배치 (XMind 스타일)',
  },
  {
    type: 'tree',
    label: '트리형 레이아웃',
    icon: GitBranch,
    description: '좌우 대칭 트리 구조 배치',
  },
];

export default function LayoutSelector({
  currentLayout,
  onLayoutChange,
  className = '',
}: LayoutSelectorProps) {
  const currentOption = LAYOUT_OPTIONS.find(opt => opt.type === currentLayout) || LAYOUT_OPTIONS[0];
  const Icon = currentOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center gap-2 ${className}`}
        >
          <Icon className="w-4 h-4" />
          <span>{currentOption.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {LAYOUT_OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.type}
              onClick={() => onLayoutChange(option.type)}
              className={`flex items-start gap-3 p-3 ${
                currentLayout === option.type ? 'bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <OptionIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {option.description}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
