import { ColorTheme, NodeType } from '@/types';

// 노드 레벨별 색상 정의
interface NodeLevelColors {
  background: string;
  text: string;
  border: string;
}

interface ThemeColors {
  line: string;
  lineShared: string;
  // 노드 레벨별 색상
  center: NodeLevelColors;
  category: NodeLevelColors;
  experience: NodeLevelColors;
  episode: NodeLevelColors;
  detail: NodeLevelColors;
}

// 라이트모드 색상 테마
export const colorThemes: Record<ColorTheme, ThemeColors> = {
  default: {
    line: '#2a2a2a',
    lineShared: '#22c55e',
    center: { background: '#3b82f6', text: '#ffffff', border: '#3b82f6' },
    category: { background: '#ffffff', text: '#1d4ed8', border: '#93c5fd' },
    experience: { background: '#ffffff', text: '#7c3aed', border: '#c4b5fd' },
    episode: { background: '#ffffff', text: '#059669', border: '#6ee7b7' },
    detail: { background: '#ffffff', text: '#374151', border: '#e5e7eb' },
  },
  pastel: {
    line: '#d4a5a5',
    lineShared: '#a5d4b5',
    center: { background: '#a8c5e8', text: '#1e3a5f', border: '#7fa3d1' },
    category: { background: '#ffd4d4', text: '#8b3a3a', border: '#ffb4b4' },
    experience: { background: '#e8d4f0', text: '#5a2c6b', border: '#d4b4e8' },
    episode: { background: '#d4f0e8', text: '#2c5a4b', border: '#b4e8d4' },
    detail: { background: '#fff4d4', text: '#6b5a2c', border: '#ffe8b4' },
  },
  vivid: {
    line: '#e74c3c',
    lineShared: '#2ecc71',
    center: { background: '#3498db', text: '#ffffff', border: '#2980b9' },
    category: { background: '#e74c3c', text: '#ffffff', border: '#c0392b' },
    experience: { background: '#9b59b6', text: '#ffffff', border: '#8e44ad' },
    episode: { background: '#1abc9c', text: '#ffffff', border: '#16a085' },
    detail: { background: '#f39c12', text: '#ffffff', border: '#e67e22' },
  },
  monochrome: {
    line: '#404040',
    lineShared: '#808080',
    center: { background: '#000000', text: '#ffffff', border: '#000000' },
    category: { background: '#ffffff', text: '#000000', border: '#404040' },
    experience: { background: '#f5f5f5', text: '#1a1a1a', border: '#808080' },
    episode: { background: '#e5e5e5', text: '#2a2a2a', border: '#a0a0a0' },
    detail: { background: '#fafafa', text: '#4a4a4a', border: '#c0c0c0' },
  },
};

// 다크모드 색상 테마
export const darkColorThemes: Record<ColorTheme, ThemeColors> = {
  default: {
    line: '#2a2a2a',
    lineShared: '#22c55e',
    center: { background: '#1e40af', text: '#e0e7ff', border: '#3b82f6' },
    category: { background: '#1e293b', text: '#60a5fa', border: '#1e40af' },
    experience: { background: '#1e1b4b', text: '#c4b5fd', border: '#6d28d9' },
    episode: { background: '#064e3b', text: '#6ee7b7', border: '#059669' },
    detail: { background: '#1f2937', text: '#d1d5db', border: '#374151' },
  },
  pastel: {
    line: '#8b7a85',
    lineShared: '#7a8b85',
    center: { background: '#4a6a8a', text: '#e8f0f8', border: '#5a7a9a' },
    category: { background: '#8b5a5a', text: '#ffd4d4', border: '#9b6a6a' },
    experience: { background: '#6a4a7a', text: '#e8d4f0', border: '#7a5a8a' },
    episode: { background: '#4a7a6a', text: '#d4f0e8', border: '#5a8a7a' },
    detail: { background: '#8b7a4a', text: '#fff4d4', border: '#9b8a5a' },
  },
  vivid: {
    line: '#c0392b',
    lineShared: '#27ae60',
    center: { background: '#2874a6', text: '#ecf0f1', border: '#1f618d' },
    category: { background: '#c0392b', text: '#ecf0f1', border: '#a93226' },
    experience: { background: '#8e44ad', text: '#ecf0f1', border: '#7d3c98' },
    episode: { background: '#16a085', text: '#ecf0f1', border: '#138d75' },
    detail: { background: '#d68910', text: '#ecf0f1', border: '#b9770e' },
  },
  monochrome: {
    line: '#606060',
    lineShared: '#a0a0a0',
    center: { background: '#0a0a0a', text: '#ffffff', border: '#1a1a1a' },
    category: { background: '#1a1a1a', text: '#f5f5f5', border: '#404040' },
    experience: { background: '#2a2a2a', text: '#e5e5e5', border: '#606060' },
    episode: { background: '#3a3a3a', text: '#d5d5d5', border: '#808080' },
    detail: { background: '#4a4a4a', text: '#c5c5c5', border: '#a0a0a0' },
  },
};

// 노드 타입/레벨에 따른 색상 가져오기
export function getNodeColors(
  theme: ColorTheme,
  isDark: boolean,
  nodeType: NodeType,
  level: number
): NodeLevelColors {
  const themes = isDark ? darkColorThemes : colorThemes;
  const themeColors = themes[theme];

  // 노드 타입 또는 레벨에 따라 색상 반환
  if (nodeType === 'center' || level === 0) {
    return themeColors.center;
  } else if (nodeType === 'category' || level === 1) {
    return themeColors.category;
  } else if (nodeType === 'experience' || level === 2) {
    return themeColors.experience;
  } else if (nodeType === 'episode' || level === 3) {
    return themeColors.episode;
  } else {
    return themeColors.detail;
  }
}

// 연결선 색상 가져오기
export function getThemeColors(theme: ColorTheme, isDark: boolean = false) {
  const themes = isDark ? darkColorThemes : colorThemes;
  return {
    line: themes[theme].line,
    lineShared: themes[theme].lineShared,
  };
}
