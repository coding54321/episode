import { MindMapNode, LayoutConfig } from '@/types';
import { findCenterNode, buildNodeTree } from './layout-utils';

const DEFAULT_CONFIG: Required<LayoutConfig> = {
  autoLayout: true,
  spacing: {
    horizontal: 400, // 중심 노드 ↔ Level 1 노드 간 가로 거리
    vertical: 280,   // Level 1 노드 간 세로 거리
    radial: 180,
  },
  preserveManualPositions: false,
};

/**
 * Branch Layout (직각 브랜치형)
 * 이미지 기준:
 * - 중심 노드에서 좌우로 브랜치가 뻗어나감
 * - 왼쪽 브랜치의 자식 노드들은 부모 노드 왼쪽에 수직으로 쌓임
 * - 오른쪽 브랜치의 자식 노드들은 부모 노드 오른쪽에 수직으로 쌓임
 * - 각 브랜치의 자식 노드들은 부모 노드 아래로 수직으로 쌓임
 */
export function calculateBranchLayout(
  nodes: MindMapNode[],
  config: LayoutConfig = {}
): MindMapNode[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const spacing = {
    horizontal: config.spacing?.horizontal ?? DEFAULT_CONFIG.spacing.horizontal ?? 300,
    vertical: config.spacing?.vertical ?? DEFAULT_CONFIG.spacing.vertical ?? 200,
  };
  
  // 노드 맵 생성 (수정 가능한 복사본)
  const nodeMap = new Map<string, MindMapNode>();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node });
  });
  
  // 중심 노드 찾기
  const centerNode = findCenterNode(Array.from(nodeMap.values()));
  if (!centerNode) {
    console.warn('[branch-layout] 중심 노드를 찾을 수 없습니다.');
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
  
  // 중심 노드의 직접 자식들 (Level 1)
  const level1Children = tree.get(centerNode.id) || [];
  
  if (level1Children.length === 0) {
    return Array.from(nodeMap.values());
  }
  
  // 좌우로 분배: 왼쪽과 오른쪽 브랜치로 나눔
  const leftBranch: MindMapNode[] = [];
  const rightBranch: MindMapNode[] = [];
  
  level1Children.forEach((child, index) => {
    if (index % 2 === 0) {
      leftBranch.push(child);
    } else {
      rightBranch.push(child);
    }
  });
  
  // 왼쪽 브랜치 배치 (중심 노드 왼쪽, 수직으로 쌓음)
  const leftX = startX - spacing.horizontal;
  let leftCurrentY = startY;
  
  leftBranch.forEach((child) => {
    const childNode = nodeMap.get(child.id)!;
    
    // 수동 조정된 노드는 제외
    if (finalConfig.preserveManualPositions && childNode.isManuallyPositioned) {
      return;
    }
    
    childNode.x = leftX;
    childNode.y = leftCurrentY;
    
    // 다음 노드를 위해 Y 좌표 업데이트 (아래로)
    leftCurrentY += spacing.vertical;
    
    // 재귀적으로 하위 노드들 배치 (왼쪽 브랜치이므로 자식들은 부모 왼쪽에 배치)
    layoutChildrenForBranch(child.id, childNode.x, childNode.y, tree, nodeMap, spacing, finalConfig, 'left');
  });
  
  // 오른쪽 브랜치 배치 (중심 노드 오른쪽, 수직으로 쌓음)
  const rightX = startX + spacing.horizontal;
  let rightCurrentY = startY;
  
  rightBranch.forEach((child) => {
    const childNode = nodeMap.get(child.id)!;
    
    // 수동 조정된 노드는 제외
    if (finalConfig.preserveManualPositions && childNode.isManuallyPositioned) {
      return;
    }
    
    childNode.x = rightX;
    childNode.y = rightCurrentY;
    
    // 다음 노드를 위해 Y 좌표 업데이트 (아래로)
    rightCurrentY += spacing.vertical;
    
    // 재귀적으로 하위 노드들 배치 (오른쪽 브랜치이므로 자식들은 부모 오른쪽에 배치)
    layoutChildrenForBranch(child.id, childNode.x, childNode.y, tree, nodeMap, spacing, finalConfig, 'right');
  });
  
  return Array.from(nodeMap.values());
}

/**
 * 브랜치별 자식 노드 배치 (재귀적)
 * 이미지 기준:
 * - 왼쪽 브랜치의 자식 노드들은 부모 노드 왼쪽에 수직으로 쌓임
 * - 오른쪽 브랜치의 자식 노드들은 부모 노드 오른쪽에 수직으로 쌓임
 * @param parentId 부모 노드 ID
 * @param parentX 부모 노드 X 좌표
 * @param parentY 부모 노드 Y 좌표
 * @param tree 트리 구조
 * @param nodeMap 노드 맵
 * @param spacing 간격 설정
 * @param config 레이아웃 설정
 * @param branchDirection 브랜치 방향 ('left' | 'right')
 */
function layoutChildrenForBranch(
  parentId: string,
  parentX: number,
  parentY: number,
  tree: Map<string, MindMapNode[]>,
  nodeMap: Map<string, MindMapNode>,
  spacing: { horizontal: number; vertical: number },
  config: Required<LayoutConfig>,
  branchDirection: 'left' | 'right'
): void {
  const children = tree.get(parentId) || [];
  if (children.length === 0) return;
  
  // 브랜치 방향에 따라 자식 노드들의 X 좌표 결정
  const childX = branchDirection === 'left' 
    ? parentX - spacing.horizontal  // 왼쪽 브랜치: 부모 왼쪽에 배치
    : parentX + spacing.horizontal; // 오른쪽 브랜치: 부모 오른쪽에 배치
  
  // 자식 노드들을 수직으로 쌓음
  let currentY = parentY;
  
  children.forEach((child) => {
    const childNode = nodeMap.get(child.id)!;
    
    // 수동 조정된 노드는 제외
    if (config.preserveManualPositions && childNode.isManuallyPositioned) {
      return;
    }
    
    // 브랜치 방향에 따라 X 좌표 설정, Y는 수직으로 쌓음
    childNode.x = childX;
    childNode.y = currentY;
    
    currentY += spacing.vertical;
    
    // 재귀적으로 하위 노드들도 배치 (같은 브랜치 방향 유지)
    layoutChildrenForBranch(child.id, childNode.x, childNode.y, tree, nodeMap, spacing, config, branchDirection);
  });
}
