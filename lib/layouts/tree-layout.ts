import { MindMapNode, LayoutConfig } from '@/types';
import { findCenterNode, buildNodeTree } from './layout-utils';

const DEFAULT_CONFIG: Required<LayoutConfig> = {
  autoLayout: true,
  spacing: {
    horizontal: 400, // 노드 간 가로 거리 증가
    vertical: 280,   // 노드 간 세로 거리 증가
    radial: 180,
  },
  preserveManualPositions: false,
};

/**
 * Tree Layout (트리형)
 * 좌우 대칭 트리 구조 배치
 */
export function calculateTreeLayout(
  nodes: MindMapNode[],
  config: LayoutConfig = {}
): MindMapNode[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const spacing = {
    horizontal: config.spacing?.horizontal ?? DEFAULT_CONFIG.spacing.horizontal,
    vertical: config.spacing?.vertical ?? DEFAULT_CONFIG.spacing.vertical,
    radial: config.spacing?.radial ?? DEFAULT_CONFIG.spacing.radial,
  };
  
  // 노드 맵 생성 (수정 가능한 복사본)
  const nodeMap = new Map<string, MindMapNode>();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node });
  });
  
  // 중심 노드 찾기
  const centerNode = findCenterNode(Array.from(nodeMap.values()));
  if (!centerNode) {
    console.warn('[tree-layout] 중심 노드를 찾을 수 없습니다.');
    return nodes;
  }
  
  // 시작 좌표
  const startX = centerNode.x || 500;
  const startY = centerNode.y || 100;
  
  // 중심 노드 위치 설정
  const center = nodeMap.get(centerNode.id)!;
  center.x = startX;
  center.y = startY;
  
  // 트리 구조 생성
  const tree = buildNodeTree(Array.from(nodeMap.values()));
  
  // 각 서브트리의 너비 계산 (재귀적)
  const horizontal: number = spacing.horizontal ?? DEFAULT_CONFIG.spacing.horizontal ?? 200;
  const vertical: number = spacing.vertical ?? DEFAULT_CONFIG.spacing.vertical ?? 150;
  
  const calculateSubtreeWidth = (nodeId: string): number => {
    const children = tree.get(nodeId) || [];
    if (children.length === 0) {
      return horizontal;
    }
    
    let totalWidth = 0;
    children.forEach(child => {
      totalWidth += calculateSubtreeWidth(child.id);
    });
    
    return Math.max(totalWidth, horizontal);
  };
  
  // 노드 배치 (재귀적)
  const layoutNode = (nodeId: string, level: number, x: number, y: number) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    // 수동 조정된 노드는 제외 (preserveManualPositions가 true일 때)
    if (finalConfig.preserveManualPositions && node.isManuallyPositioned) {
      return;
    }
    
    // 레벨 0 (중심 노드)는 이미 배치됨
    if (level > 0) {
      node.x = x;
      node.y = y;
    }
    
    const children = tree.get(nodeId) || [];
    if (children.length === 0) return;
    
    // 자식 노드들의 서브트리 너비 계산
    const subtreeWidths = children.map(child => calculateSubtreeWidth(child.id));
    const totalWidth = subtreeWidths.reduce((sum, width) => sum + width, 0);
    
    // 자식 노드들을 좌우 대칭으로 배치
    let currentX = x - (totalWidth / 2);
    children.forEach((child, index) => {
      const subtreeWidth = subtreeWidths[index];
      const childX = currentX + (subtreeWidth / 2);
      const childY = y + vertical;
      
      layoutNode(child.id, level + 1, childX, childY);
      currentX += subtreeWidth;
    });
  };
  
  // 중심 노드부터 시작하여 재귀적으로 배치
  layoutNode(centerNode.id, 0, startX, startY);
  
  const result = Array.from(nodeMap.values());
  console.log('[tree-layout] 레이아웃 적용 완료', {
    nodeCount: result.length,
    layoutedNodes: result.map(n => ({ id: n.id, x: n.x, y: n.y, level: n.level })),
  });
  
  return result;
}
