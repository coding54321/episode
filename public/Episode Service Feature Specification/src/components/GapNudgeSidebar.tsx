import { useState } from 'react';
import { GripVertical, X, Sparkles } from 'lucide-react';
import { GapTag } from '../types';

interface GapNudgeSidebarProps {
  gapTags: GapTag[];
  onTagRemove: (tagId: string) => void;
  onDragStart: (tag: GapTag) => void;
}

export default function GapNudgeSidebar({ gapTags, onTagRemove, onDragStart }: GapNudgeSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (gapTags.length === 0) return null;

  return (
    <div
      className={`
        fixed top-20 right-6 bg-white rounded-2xl shadow-xl border-2 border-blue-100 transition-all z-30
        ${isExpanded ? 'w-80' : 'w-16'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="text-gray-900">추천 인벤토리</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="mx-auto"
          >
            <Sparkles className="w-5 h-5 text-blue-600" />
          </button>
        )}
      </div>

      {/* Tags */}
      {isExpanded && (
        <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          <p className="text-sm text-gray-600 mb-4">
            채워야 할 역량을 경험 노드로 드래그하세요
          </p>

          {gapTags.map(tag => (
            <div
              key={tag.id}
              draggable
              onDragStart={() => onDragStart(tag)}
              className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 cursor-move hover:shadow-md transition-all border-2 border-blue-200"
            >
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900">{tag.label}</p>
                  <p className="text-xs text-blue-600 mt-1">{tag.source}</p>
                </div>
                <button
                  onClick={() => onTagRemove(tag.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded transition-all"
                >
                  <X className="w-3 h-3 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
