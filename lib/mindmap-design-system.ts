import { MindMapNode } from '@/types';

// 색상 팔레트 정의
export const NODE_COLOR_PALETTE = [
  { 
    name: 'violet', 
    base: '#6D5AFF', 
    op10: 'rgba(109.25, 90, 255, 0.10)', 
    op15: 'rgba(109.25, 90, 255, 0.15)', 
    op20: 'rgba(109.25, 90, 255, 0.20)', 
    op30: 'rgba(109.25, 90, 255, 0.30)' 
  },
  { 
    name: 'blue', 
    base: '#5090FF', 
    op10: 'rgba(80, 144.17, 255, 0.10)', 
    op15: 'rgba(80, 144.17, 255, 0.15)', 
    op20: 'rgba(80, 144.17, 255, 0.20)', 
    op30: 'rgba(80, 144.17, 255, 0.30)' 
  },
  { 
    name: 'mint', 
    base: '#24C5DB', 
    op10: 'rgba(36, 197, 219, 0.10)', 
    op15: 'rgba(36, 197, 219, 0.15)', 
    op20: 'rgba(36, 197, 219, 0.20)', 
    op30: 'rgba(36, 197, 219, 0.30)' 
  },
  { 
    name: 'cyan', 
    base: '#46D4E6', 
    op10: 'rgba(70, 212, 230, 0.10)', 
    op15: 'rgba(70, 212, 230, 0.15)', 
    op20: 'rgba(70, 212, 230, 0.20)', 
    op30: 'rgba(70, 212, 230, 0.30)' 
  },
  { 
    name: 'skyblue', 
    base: '#3FAEF8', 
    op10: 'rgba(63, 174, 248, 0.10)', 
    op15: 'rgba(63, 174, 248, 0.15)', 
    op20: 'rgba(63, 174, 248, 0.20)', 
    op30: 'rgba(63, 174, 248, 0.30)' 
  },
  { 
    name: 'purple', 
    base: '#A76DFF', 
    op10: 'rgba(167, 109, 255, 0.10)', 
    op15: 'rgba(167, 109, 255, 0.15)', 
    op20: 'rgba(167, 109, 255, 0.20)', 
    op30: 'rgba(167, 109, 255, 0.30)' 
  },
  { 
    name: 'navy', 
    base: '#537ABD', 
    op10: 'rgba(83, 122, 189, 0.10)', 
    op15: 'rgba(83, 122, 189, 0.15)', 
    op20: 'rgba(83, 122, 189, 0.20)', 
    op30: 'rgba(83, 122, 189, 0.30)' 
  },
  { 
    name: 'magenta', 
    base: '#CD3FF8', 
    op10: 'rgba(205, 63, 248, 0.10)', 
    op15: 'rgba(205, 63, 248, 0.15)', 
    op20: 'rgba(205, 63, 248, 0.20)', 
    op30: 'rgba(205, 63, 248, 0.30)' 
  },
] as const;

export const CENTER_NODE_COLOR = '#5065FF';

export type NodeColorName = typeof NODE_COLOR_PALETTE[number]['name'];

export type NodeState = 'default' | 'hover' | 'selected' | 'active' | 'highlighted';

// 노드 레벨 타입 (Figma 디자인 기반)
export type NodeLevelType = 'center' | 'category' | 'detail';

// 색상 데이터 가져오기
export function getColorData(colorName: string | undefined) {
  if (!colorName) return NODE_COLOR_PALETTE[0];
  return NODE_COLOR_PALETTE.find(c => c.name === colorName) || NODE_COLOR_PALETTE[0];
}

// 노드 레벨 타입 결정
export function getNodeLevelType(level: number, nodeType?: string): NodeLevelType {
  if (level === 0 || nodeType === 'center') return 'center';
  if (level === 1 || nodeType === 'experience' || nodeType === 'category') return 'category';
  return 'detail';
}

// 노드 상태별 스타일
export interface NodeStyles {
  background: string;
  border: string;
  shadow: string;
  textColor: string;
  fontSize: string;
  fontWeight: number;
  iconBg: string;
  minWidth: string;
  minHeight: string;
  borderRadius: string;
  padding: string;
}

// 레벨별 기본 사이즈 설정 (유연한 크기)
export const NODE_SIZE_CONFIG = {
  center: {
    minWidth: '140px',
    minHeight: '140px',
    maxWidth: '180px',
    padding: '24px',
    borderRadius: '9999px',
  },
  category: {
    minWidth: '140px',
    minHeight: '72px',
    maxWidth: '240px',
    padding: '20px 24px',
    borderRadius: '14px',
  },
  detail: {
    minWidth: '120px',
    minHeight: '60px',
    maxWidth: '220px',
    padding: '16px 20px',
    borderRadius: '12px',
  },
} as const;

// 레벨 + 상태별 스타일 가져오기
export function getNodeStyles(
  colorName: string | undefined,
  state: NodeState,
  levelType: NodeLevelType = 'detail'
): NodeStyles {
  const color = getColorData(colorName);
  const sizeConfig = NODE_SIZE_CONFIG[levelType];

  // 카테고리 노드 (Level 1): 투명 배경 + 테두리
  // 디테일 노드 (Level 2+): 흰색 배경 + 테두리
  const isCategory = levelType === 'category';

  const baseStyles = {
    minWidth: sizeConfig.minWidth,
    minHeight: sizeConfig.minHeight,
    borderRadius: sizeConfig.borderRadius,
    padding: sizeConfig.padding,
  };

  const stateStyles: Record<NodeState, NodeStyles> = {
    default: {
      ...baseStyles,
      background: 'white',
      border: isCategory ? `3px solid ${color.base}` : `2px solid ${color.base}`,
      shadow: 'none',
      textColor: '#434448',
      fontSize: isCategory ? '18px' : '16px',
      fontWeight: isCategory ? 600 : 500,
      iconBg: color.op20,
    },
    hover: {
      ...baseStyles,
      background: 'white',
      border: `3px solid ${color.base}`,
      shadow: `0px 0px 15px ${color.op30}`,
      textColor: '#222222',
      fontSize: isCategory ? '18px' : '16px',
      fontWeight: 600,
      iconBg: color.base,
    },
    selected: {
      ...baseStyles,
      background: 'white',
      border: `3px solid ${color.base}`,
      shadow: `0px 0px 25px ${color.op20}`,
      textColor: '#222222',
      fontSize: isCategory ? '18px' : '16px',
      fontWeight: 600,
      iconBg: color.base,
    },
    active: {
      ...baseStyles,
      background: 'white',
      border: `3px solid ${color.base}`,
      shadow: `0px 0px 25px ${color.op20}`,
      textColor: '#222222',
      fontSize: isCategory ? '18px' : '16px',
      fontWeight: 600,
      iconBg: color.base,
    },
    highlighted: {
      ...baseStyles,
      background: 'white',
      border: `3px solid ${color.base}`,
      shadow: `0px 0px 15px ${color.op30}`,
      textColor: '#222222',
      fontSize: isCategory ? '18px' : '16px',
      fontWeight: 600,
      iconBg: color.base,
    },
  };

  return stateStyles[state];
}

// 부모 경험 노드 찾기 (level 1 또는 nodeType === 'experience')
export function findParentExperience(node: MindMapNode, nodes: MindMapNode[]): MindMapNode | null {
  let current = node;
  while (current.parentId) {
    const parent = nodes.find(n => n.id === current.parentId);
    if (!parent) break;
    if (parent.level === 1 || parent.nodeType === 'experience') {
      return parent;
    }
    current = parent;
  }
  return null;
}

// 노드 색상 가져오기 (부모 경험의 색상 상속)
export function getNodeColor(node: MindMapNode, nodes: MindMapNode[]): string {
  // 중심 노드는 고정 색상
  if (node.id === 'center' || node.level === 0 || node.nodeType === 'center') {
    return CENTER_NODE_COLOR;
  }
  
  // 이미 색상이 할당되어 있으면 사용
  if (node.color) {
    return node.color;
  }
  
  // 부모 경험 노드 찾기
  const experienceNode = findParentExperience(node, nodes);
  if (experienceNode?.color) {
    return experienceNode.color;
  }
  
  // 기본 색상
  return NODE_COLOR_PALETTE[0].name;
}

// 경험 노드에 색상 할당
export function assignColorToExperience(
  experienceNode: MindMapNode,
  existingColors: Set<string> = new Set()
): string {
  // 이미 할당된 색상이 있으면 재사용
  if (experienceNode.color) {
    return experienceNode.color;
  }
  
  // 사용 가능한 색상 중 선택 (순환)
  const usedColorCount = existingColors.size;
  const selectedColor = NODE_COLOR_PALETTE[usedColorCount % NODE_COLOR_PALETTE.length];
  
  return selectedColor.name;
}

// 모든 경험 노드에 색상 할당 (초기화 시 사용)
export function assignColorsToAllExperiences(nodes: MindMapNode[]): MindMapNode[] {
  const experienceNodes = nodes.filter(n => n.level === 1 || n.nodeType === 'experience');
  const existingColors = new Set<string>();
  
  const updatedNodes = nodes.map(node => {
    if (node.level === 1 || node.nodeType === 'experience') {
      const color = assignColorToExperience(node, existingColors);
      existingColors.add(color);
      return { ...node, color };
    }
    return node;
  });
  
  // 하위 노드들도 부모 경험의 색상 상속
  return updatedNodes.map(node => {
    if (node.color || node.level === 0 || node.nodeType === 'center') {
      return node;
    }
    const color = getNodeColor(node, updatedNodes);
    return { ...node, color };
  });
}
