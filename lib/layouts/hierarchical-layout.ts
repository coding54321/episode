import { MindMapNode, LayoutConfig } from '@/types';
import { findCenterNode, buildNodeTree } from './layout-utils';

const DEFAULT_CONFIG: Required<LayoutConfig> = {
  autoLayout: true,
  spacing: {
    horizontal: 200,
    vertical: 150,
    radial: 180,
  },
  preserveManualPositions: false,
};

/**
 * Hierarchical Layout (계층형)
 * 위에서 아래로 계층 구조 배치
 */
export function calculateHierarchicalLayout(
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
    console.warn('[hierarchical-layout] 중심 노드를 찾을 수 없습니다.');
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
  
  // 레벨별로 노드 배치 (재귀적)
  const layoutNode = (nodeId: string, level: number, parentX: number, parentY: number, siblingIndex: number, siblingCount: number) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    // 수동 조정된 노드는 제외 (preserveManualPositions가 true일 때)
    if (finalConfig.preserveManualPositions && node.isManuallyPositioned) {
      return;
    }
    
    // 레벨 0 (중심 노드)은 이미 배치됨
    if (level === 0) {
      const children = tree.get(nodeId) || [];
      children.forEach((child, index) => {
        layoutNode(child.id, level + 1, node.x, node.y, index, children.length);
      });
      return;
    }
    
    // 같은 레벨의 노드들을 가로로 배치
    const horizontal: number = spacing.horizontal ?? DEFAULT_CONFIG.spacing.horizontal ?? 200;
    const vertical: number = spacing.vertical ?? DEFAULT_CONFIG.spacing.vertical ?? 150;
    const totalWidth = (siblingCount - 1) * horizontal;
    const startXForLevel = parentX - (totalWidth / 2);
    const x = startXForLevel + (siblingIndex * horizontal);
    const y = startY + (level * vertical);
    
    node.x = x;
    node.y = y;
    
    // 자식 노드들 재귀적으로 배치
    const children = tree.get(nodeId) || [];
    children.forEach((child, index) => {
      layoutNode(child.id, level + 1, node.x, node.y, index, children.length);
    });
  };
  
  // 중심 노드부터 시작하여 재귀적으로 배치
  layoutNode(centerNode.id, 0, startX, startY, 0, 1);
  
  const result = Array.from(nodeMap.values());
  console.log('[hierarchical-layout] 레이아웃 적용 완료', {
    nodeCount: result.length,
    layoutedNodes: result.map(n => ({ id: n.id, x: n.x, y: n.y, level: n.level })),
  });
  
  return result;
}
