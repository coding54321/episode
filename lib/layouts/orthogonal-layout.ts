import { MindMapNode, LayoutConfig } from '@/types';
import { findCenterNode, buildNodeTree } from './layout-utils';

const DEFAULT_CONFIG: Required<LayoutConfig> = {
  autoLayout: true,
  spacing: {
    horizontal: 280,
    vertical: 120,
    radial: 180,
  },
  preserveManualPositions: false,
};

/**
 * Orthogonal Layout (직각 브랜치형)
 * - 중심 노드에서 좌우로 Level 1 노드 배치
 * - Level 2+ 노드는 수직으로 배열
 * - 직각 연결선 스타일에 최적화
 */
export function calculateOrthogonalLayout(
  nodes: MindMapNode[],
  config: LayoutConfig = {}
): MindMapNode[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const spacing = {
    horizontal: config.spacing?.horizontal ?? DEFAULT_CONFIG.spacing.horizontal,
    vertical: config.spacing?.vertical ?? DEFAULT_CONFIG.spacing.vertical,
  };

  // 노드 맵 생성 (수정 가능한 복사본)
  const nodeMap = new Map<string, MindMapNode>();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node });
  });

  // 중심 노드 찾기
  const centerNode = findCenterNode(Array.from(nodeMap.values()));
  if (!centerNode) {
    console.warn('[orthogonal-layout] 중심 노드를 찾을 수 없습니다.');
    return nodes;
  }

  // 시작 좌표
  const startX = centerNode.x || 800;
  const startY = centerNode.y || 400;

  // 중심 노드 위치 설정
  const center = nodeMap.get(centerNode.id)!;
  center.x = startX;
  center.y = startY;

  // 트리 구조 생성
  const tree = buildNodeTree(Array.from(nodeMap.values()));

  // Level 1 자식들 (중심 노드의 직접 자식)
  const level1Children = tree.get(centerNode.id) || [];

  // 좌우로 나눔 (홀수 인덱스는 왼쪽, 짝수 인덱스는 오른쪽)
  const leftChildren: MindMapNode[] = [];
  const rightChildren: MindMapNode[] = [];

  level1Children.forEach((child, index) => {
    if (index % 2 === 0) {
      rightChildren.push(child);
    } else {
      leftChildren.push(child);
    }
  });

  // 서브트리 높이 계산 (수직 배치를 위해)
  const calculateSubtreeHeight = (nodeId: string): number => {
    const children = tree.get(nodeId) || [];
    if (children.length === 0) {
      return spacing.vertical ?? 150;
    }

    let totalHeight = 0;
    children.forEach(child => {
      totalHeight += calculateSubtreeHeight(child.id);
    });

    return Math.max(totalHeight, spacing.vertical ?? 150);
  };

  // 수직으로 자식 노드들 배치
  const layoutVerticalSubtree = (
    nodeId: string,
    x: number,
    startY: number,
    direction: 'left' | 'right'
  ): number => {
    const children = tree.get(nodeId) || [];
    if (children.length === 0) return spacing.vertical ?? 150;

    let currentY = startY;
    const horizontalOffset = direction === 'left' ? -(spacing.horizontal ?? 280) : (spacing.horizontal ?? 280);

    children.forEach(child => {
      const childNode = nodeMap.get(child.id);
      if (!childNode) return;

      // 수동 조정된 노드는 제외
      if (finalConfig.preserveManualPositions && childNode.isManuallyPositioned) {
        return;
      }

      // 자식 노드 위치 설정 (부모 노드에서 수평으로 이동)
      childNode.x = x + horizontalOffset;
      childNode.y = currentY;

      // 손자 노드들의 높이 계산 후 재귀 배치
      const subtreeHeight = layoutVerticalSubtree(
        child.id,
        childNode.x,
        currentY,
        direction
      );

      currentY += subtreeHeight;
    });

    return currentY - startY;
  };

  // 왼쪽 브랜치 배치
  let leftTotalHeight = 0;
  leftChildren.forEach(child => {
    leftTotalHeight += calculateSubtreeHeight(child.id);
  });

  let leftStartY = startY - leftTotalHeight / 2;
  leftChildren.forEach(child => {
    const childNode = nodeMap.get(child.id);
    if (!childNode) return;

    if (finalConfig.preserveManualPositions && childNode.isManuallyPositioned) {
      return;
    }

    const subtreeHeight = calculateSubtreeHeight(child.id);

    // Level 1 노드 위치 (중심에서 왼쪽)
    childNode.x = startX - (spacing.horizontal ?? 280);
    childNode.y = leftStartY + subtreeHeight / 2;

    // Level 2+ 자식들 배치
    layoutVerticalSubtree(child.id, childNode.x, childNode.y - subtreeHeight / 2 + (spacing.vertical ?? 120) / 2, 'left');

    leftStartY += subtreeHeight;
  });

  // 오른쪽 브랜치 배치
  let rightTotalHeight = 0;
  rightChildren.forEach(child => {
    rightTotalHeight += calculateSubtreeHeight(child.id);
  });

  let rightStartY = startY - rightTotalHeight / 2;
  rightChildren.forEach(child => {
    const childNode = nodeMap.get(child.id);
    if (!childNode) return;

    if (finalConfig.preserveManualPositions && childNode.isManuallyPositioned) {
      return;
    }

    const subtreeHeight = calculateSubtreeHeight(child.id);

    // Level 1 노드 위치 (중심에서 오른쪽)
    childNode.x = startX + (spacing.horizontal ?? 280);
    childNode.y = rightStartY + subtreeHeight / 2;

    // Level 2+ 자식들 배치
    layoutVerticalSubtree(child.id, childNode.x, childNode.y - subtreeHeight / 2 + (spacing.vertical ?? 120) / 2, 'right');

    rightStartY += subtreeHeight;
  });

  const result = Array.from(nodeMap.values());
  console.log('[orthogonal-layout] 레이아웃 적용 완료', {
    nodeCount: result.length,
    leftCount: leftChildren.length,
    rightCount: rightChildren.length,
  });

  return result;
}
