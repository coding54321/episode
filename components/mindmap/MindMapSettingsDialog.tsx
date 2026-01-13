'use client';

import { ColorTheme, LineStyle, MindMapSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { colorThemes as lightThemes } from '@/lib/mindmap-theme';

interface MindMapSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MindMapSettings;
  onSettingsChange: (settings: MindMapSettings) => void;
}

const colorThemes: { value: ColorTheme; label: string; description: string; preview: string[] }[] = [
  {
    value: 'default',
    label: '기본',
    description: '차분하고 전문적인 색상',
    preview: [
      lightThemes.default.center.background,
      lightThemes.default.category.background,
      lightThemes.default.experience.background,
      lightThemes.default.episode.background,
    ],
  },
  {
    value: 'pastel',
    label: '파스텔',
    description: '부드럽고 따뜻한 색상',
    preview: [
      lightThemes.pastel.center.background,
      lightThemes.pastel.category.background,
      lightThemes.pastel.experience.background,
      lightThemes.pastel.episode.background,
    ],
  },
  {
    value: 'vivid',
    label: '비비드',
    description: '생동감 있는 강렬한 색상',
    preview: [
      lightThemes.vivid.center.background,
      lightThemes.vivid.category.background,
      lightThemes.vivid.experience.background,
      lightThemes.vivid.episode.background,
    ],
  },
  {
    value: 'monochrome',
    label: '모노크롬',
    description: '흑백의 절제된 색상',
    preview: [
      lightThemes.monochrome.center.background,
      lightThemes.monochrome.category.background,
      lightThemes.monochrome.experience.background,
      lightThemes.monochrome.episode.background,
    ],
  },
];

const lineStyles: { value: LineStyle; label: string; description: string }[] = [
  {
    value: 'straight',
    label: '직선',
    description: '깔끔하고 명확한 연결',
  },
  {
    value: 'curved',
    label: '곡선',
    description: '부드럽고 자연스러운 연결',
  },
];

export default function MindMapSettingsDialog({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: MindMapSettingsDialogProps) {
  if (!isOpen) return null;

  const handleThemeChange = (theme: ColorTheme) => {
    onSettingsChange({ ...settings, colorTheme: theme });
  };

  const handleLineStyleChange = (lineStyle: LineStyle) => {
    onSettingsChange({ ...settings, lineStyle });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-[#e5e5e5]">마인드맵 설정</h2>
            <p className="text-sm text-gray-600 dark:text-[#a0a0a0] mt-1">
              마인드맵의 외관과 동작을 설정하세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full transition-colors"
            title="닫기"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-[#a0a0a0]" />
          </button>
        </div>

        {/* 색상 테마 설정 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#e5e5e5] mb-4">색상 테마</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {colorThemes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => handleThemeChange(theme.value)}
                className={`p-4 rounded-[16px] border-2 transition-all text-left ${
                  settings.colorTheme === theme.value
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a] bg-white dark:bg-[#0a0a0a]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 색상 프리뷰 */}
                  <div className="flex gap-1">
                    {theme.preview.map((color, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-lg"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-[#e5e5e5] mb-1">
                      {theme.label}
                      {settings.colorTheme === theme.value && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                          ✓ 적용됨
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-[#a0a0a0]">
                      {theme.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 연결선 스타일 설정 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#e5e5e5] mb-4">연결선 스타일</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lineStyles.map((style) => (
              <button
                key={style.value}
                onClick={() => handleLineStyleChange(style.value)}
                className={`p-4 rounded-[16px] border-2 transition-all text-left ${
                  settings.lineStyle === style.value
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a] bg-white dark:bg-[#0a0a0a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* 스타일 프리뷰 */}
                  <div className="w-16 h-12 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg flex items-center justify-center">
                    {style.value === 'straight' ? (
                      <svg width="40" height="24" viewBox="0 0 40 24">
                        <line
                          x1="4"
                          y1="12"
                          x2="36"
                          y2="12"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-gray-600 dark:text-[#a0a0a0]"
                        />
                      </svg>
                    ) : (
                      <svg width="40" height="24" viewBox="0 0 40 24">
                        <path
                          d="M 4 12 Q 20 4, 36 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-600 dark:text-[#a0a0a0]"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-[#e5e5e5] mb-1">
                      {style.label}
                      {settings.lineStyle === style.value && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                          ✓ 적용됨
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-[#a0a0a0]">
                      {style.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#2a2a2a]">
          <Button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-[12px] h-10 px-6 font-semibold"
          >
            완료
          </Button>
        </div>
      </div>
    </div>
  );
}
