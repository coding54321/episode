'use client';

import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ZoomControlProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function ZoomControl({ zoom, onZoomIn, onZoomOut }: ZoomControlProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-4 right-4 z-50 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-gray-200 dark:border-[#2a2a2a] p-1 flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomIn}
              className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>확대</p>
          </TooltipContent>
        </Tooltip>
        <div className="px-2 py-1 text-xs text-center text-gray-600 dark:text-[#a0a0a0] font-medium min-w-[40px]">
          {Math.round(zoom * 100)}%
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomOut}
              className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>축소</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
