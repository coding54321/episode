import { MindMapNode, LayoutConfig } from '@/types';
import { findCenterNode, buildNodeTree } from './layout-utils';

const DEFAULT_CONFIG: Required<LayoutConfig> = {
  autoLayout: true,
  spacing: {
    horizontal: 150,
    vertical: 120,
    radial: 300, // 중심 ↔ 메인 토픽 간격 (XMind: 280-320px)
  },
  preserveManualPositions: false,
};

// 노드 크기 추정 (실제 노드 크기에 맞게 조정 가능)
const NODE_WIDTH = 140; // XMind 스타일로 약간 증가
const NODE_HEIGHT = 65; // XMind 스타일로 약간 증가
const MIN_NODE_DISTANCE = 80; // 노드 간 최소 거리 (겹침 방지) - XMind 스타일로 증가
const NODE_PADDING = 25; // 노드 여백 증가

// XMind 스타일 간격 상수 (레퍼런스 이미지 기준 - 더 넓은 간격)
const MAIN_TOPIC_DISTANCE = 300; // 중심 노드 ↔ 메인 토픽 (XMind: 280-320px)
const SUBTOPIC_DISTANCE = 130; // 메인 토픽 ↔ 서브토픽 (XMind: 120-140px)
const SUBTOPIC_VERTICAL_SPACING = 55; // 서브토픽 간 수직 간격 (XMind: 50-60px)
const MAIN_TOPIC_VERTICAL_SPACING = 160; // 메인 토픽 간 수직 간격 (더 넓게 - XMind 스타일)

/**
 * 두 노드가 겹치는지 확인
 */
function nodesOverlap(
  x1: number, y1: number,
  x2: number, y2: number,
  padding: number = NODE_PADDING
): boolean {
  const distance = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  return distance < (MIN_NODE_DISTANCE + padding);
}

/**
 * 이미 배치된 노드들과의 충돌 체크 및 위치 조정
 * 레퍼런스 이미지처럼 완전히 평행하게 배치하면서 겹침 방지
 */
function adjustPositionToAvoidCollision(
  proposedX: number,
  proposedY: number,
  placedNodes: Array<{ x: number; y: number }>,
  horizontalDirection: number,
  verticalSpacing: number
): { x: number; y: number } {
  let adjustedX = proposedX;
  let adjustedY = proposedY;
  let attempts = 0;
  const maxAttempts = 100;
  
  // 충돌 체크 및 조정
  while (attempts < maxAttempts) {
    let hasCollision = false;
    let minDistance = Infinity;
    let closestNode: { x: number; y: number } | null = null;
    
    for (const node of placedNodes) {
      const distance = Math.sqrt((adjustedX - node.x) ** 2 + (adjustedY - node.y) ** 2);
      if (distance < (MIN_NODE_DISTANCE + NODE_PADDING)) {
        hasCollision = true;
        if (distance < minDistance) {
          minDistance = distance;
          closestNode = node;
        }
      }
    }
    
    if (!hasCollision) {
      break;
    }
    
    // 충돌 시 위치 조정
    // 세로 방향으로만 이동 (가로는 유지하여 평행 배치 유지)
    if (closestNode) {
      const dy = adjustedY - closestNode.y;
      if (Math.abs(dy) < MIN_NODE_DISTANCE) {
        // 세로로 충분히 떨어지도록 조정
        adjustedY = closestNode.y + (dy >= 0 ? MIN_NODE_DISTANCE : -MIN_NODE_DISTANCE);
      } else {
        // 약간의 오프셋 추가
        const offsetY = (attempts % 2 === 0 ? 1 : -1) * Math.ceil((attempts + 1) / 2) * (verticalSpacing * 0.2);
        adjustedY = proposedY + offsetY;
      }
    } else {
      // 세로 방향으로 약간 이동
      const offsetY = (attempts % 2 === 0 ? 1 : -1) * Math.ceil((attempts + 1) / 2) * (verticalSpacing * 0.2);
      adjustedY = proposedY + offsetY;
    }
    
    attempts++;
  }
  
  return { x: adjustedX, y: adjustedY };
}

/**
 * Radial Layout (XMind 스타일)
 * 각 부모 노드를 기준으로 자식 노드들을 원형으로 배치
 */
export function calculateRadialLayout(
  nodes: MindMapNode[],
  config: LayoutConfig = {}
): MindMapNode[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const spacing = { ...DEFAULT_CONFIG.spacing, ...config.spacing };
  
  // 노드 맵 생성 (수정 가능한 복사본)
  const nodeMap = new Map<string, MindMapNode>();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node });
  });
  
  // 중심 노드 찾기
  const centerNode = findCenterNode(Array.from(nodeMap.values()));
  if (!centerNode) {
    console.warn('[radial-layout] 중심 노드를 찾을 수 없습니다.');
    return nodes;
  }
  
  // 중심 노드를 (0, 0)에 임시 배치 (나중에 모든 노드의 중앙으로 이동)
  const center = nodeMap.get(centerNode.id)!;
  const centerX = 0;
  const centerY = 0;
  center.x = centerX;
  center.y = centerY;
  
  // 트리 구조 생성
  const tree = buildNodeTree(Array.from(nodeMap.values()));
  
  // 이미 배치된 노드들의 위치 추적 (겹침 방지용)
  // 각 분기별로 독립적으로 추적 (같은 분기 내에서만 충돌 체크)
  const placedNodesByBranch = new Map<string, Array<{ x: number; y: number }>>();
  
  // 분기 ID 생성 (중심 노드로부터의 경로)
  const getBranchId = (nodeId: string): string => {
    const node = nodeMap.get(nodeId);
    if (!node || !node.parentId) return nodeId;
    
    const parent = nodeMap.get(node.parentId);
    if (!parent || parent.id === centerNode.id) return nodeId;
    
    return getBranchId(node.parentId) + '_' + nodeId;
  };
  
  // 재귀적으로 각 부모 노드 주변에 자식 노드들을 원형 배치
  const layoutChildren = (parentId: string, parentX: number, parentY: number, level: number, branchId: string = '') => {
    const children = tree.get(parentId) || [];
    if (children.length === 0) return;
    
    // 수동 조정된 노드 제외 (preserveManualPositions가 true일 때)
    const childrenToLayout = finalConfig.preserveManualPositions
      ? children.filter(node => !node.isManuallyPositioned)
      : children;
    
    if (childrenToLayout.length === 0) return;
    
    // XMind 스타일 간격 적용
    // 레벨 0: 중심 ↔ 메인 토픽 간격
    // 레벨 1+: 메인 토픽 ↔ 서브토픽 간격
    const radius = level === 0 
      ? (spacing.radial || MAIN_TOPIC_DISTANCE) // 중심 노드 ↔ 메인 토픽
      : SUBTOPIC_DISTANCE; // 메인 토픽 ↔ 서브토픽
    
    // 노드 개수에 따른 최소 각도 계산 (노드가 겹치지 않도록)
    // 원주상에서 최소 거리를 각도로 변환
    const minAngleForDistance = 2 * Math.asin(MIN_NODE_DISTANCE / (2 * radius));
    const minAngleStep = Math.max(minAngleForDistance, (2 * Math.PI) / (childrenToLayout.length * 2)); // 최소 각도 간격
    
    // 각도 계산 (노드 개수에 따라 균등 분배, 최소 간격 보장)
    const angleStep = Math.max(
      (2 * Math.PI) / childrenToLayout.length, // 균등 분배
      minAngleStep // 최소 간격 보장
    );
    
    // 시작 각도 (12시 방향부터 시작)
    const startAngle = -Math.PI / 2;
    
    // 부모 노드의 방향 계산 (중심 노드로부터의 방향)
    let parentAngle = 0;
    if (level > 0) {
      const parent = nodeMap.get(parentId);
      if (parent) {
        // 중심 노드로부터의 방향 계산 (가지 뻗어나가기 형태)
        const dx = parent.x - centerX;
        const dy = parent.y - centerY;
        parentAngle = Math.atan2(dy, dx);
      }
    }
    
    childrenToLayout.forEach((child, index) => {
      let angle: number;
      
      if (level === 0) {
        // 중심 노드의 자식: 좌우로 균등 배치 (레퍼런스 이미지 스타일)
        const totalChildren = childrenToLayout.length;
        // 정확히 반반으로 나누기 (홀수일 때는 왼쪽에 하나 더)
        const leftCount = Math.ceil(totalChildren / 2);
        const rightCount = totalChildren - leftCount;
        
        // XMind 스타일: 메인 토픽 간 수직 간격 (더 넓게 - 레퍼런스 이미지 기준)
        const mainTopicSpacing = MAIN_TOPIC_VERTICAL_SPACING;
        
        // 각 분기별로 배치된 노드 추적
        const childBranchId = child.id;
        if (!placedNodesByBranch.has(childBranchId)) {
          placedNodesByBranch.set(childBranchId, []);
        }
        
        let childX: number;
        let childY: number;
        
        if (index < leftCount) {
          // 왼쪽 배치
          const leftIndex = index;
          
          // 왼쪽 세로로 분산 배치 (XMind 스타일)
          const totalLeftHeight = leftCount > 1 ? (leftCount - 1) * mainTopicSpacing : 0;
          const startY = parentY - (totalLeftHeight / 2);
          childY = startY + (leftIndex * mainTopicSpacing);
          childX = parentX - radius; // 왼쪽
        } else {
          // 오른쪽 배치
          const rightIndex = index - leftCount;
          
          // 오른쪽 세로로 분산 배치 (XMind 스타일)
          const totalRightHeight = rightCount > 1 ? (rightCount - 1) * mainTopicSpacing : 0;
          const startY = parentY - (totalRightHeight / 2);
          childY = startY + (rightIndex * mainTopicSpacing);
          childX = parentX + radius; // 오른쪽
        }
        
        const childInMap = nodeMap.get(child.id)!;
        
        // 중심 노드의 자식은 겹침 방지 없이 바로 배치 (레벨 0은 충분히 떨어져 있음)
        childInMap.x = childX;
        childInMap.y = childY;
        
        // 배치된 노드 목록에 추가
        const branchPlacedNodes = placedNodesByBranch.get(childBranchId)!;
        branchPlacedNodes.push({ x: childInMap.x, y: childInMap.y });
        
        // 자식 노드들도 재귀적으로 배치 (분기 ID 전달)
        layoutChildren(child.id, childInMap.x, childInMap.y, level + 1, childBranchId);
        return;
      } else {
        // 분기 노드의 자식: 부모 노드가 중심 노드의 어느 쪽에 있는지에 따라 가로로 완전히 평행하게 뻗어나가기
        const childInMap = nodeMap.get(child.id)!;
        
        // 부모 노드가 중심 노드의 왼쪽인지 오른쪽인지 판단
        const isParentOnLeft = parentX < centerX;
        const isParentOnRight = parentX > centerX;
        
        // 가로 방향 결정 (왼쪽에 있으면 왼쪽으로, 오른쪽에 있으면 오른쪽으로)
        const horizontalDirection = isParentOnLeft ? -1 : (isParentOnRight ? 1 : 0);
        
        // XMind 스타일: 서브토픽 간 수직 간격 (더 컴팩트하게)
        const verticalSpacing = SUBTOPIC_VERTICAL_SPACING;
        
        // 현재 분기의 배치된 노드 가져오기
        const currentBranchId = branchId || getBranchId(parentId);
        if (!placedNodesByBranch.has(currentBranchId)) {
          placedNodesByBranch.set(currentBranchId, []);
        }
        const branchPlacedNodes = placedNodesByBranch.get(currentBranchId)!;
        
        // 가로 위치는 항상 동일 (완전히 평행하게 배치) - XMind 스타일
        const fixedX = parentX + (horizontalDirection * radius);
        
        let proposedY: number;
        
        if (childrenToLayout.length === 1) {
          // 자식이 1개면 부모와 같은 세로 위치
          proposedY = parentY;
        } else {
          // 자식이 여러 개면 세로로 분산 배치 (XMind 스타일: 35-40px 간격)
          const totalHeight = (childrenToLayout.length - 1) * verticalSpacing;
          const startY = parentY - (totalHeight / 2);
          
          proposedY = startY + (index * verticalSpacing);
        }
        
        // 같은 분기 내에서 이미 배치된 노드들과의 충돌 체크
        // 같은 X 좌표를 가진 노드들과만 세로 간격 조정
        let adjustedY = proposedY;
        
        // 같은 분기 내의 다른 노드들과 충돌 체크 (같은 X 좌표인 경우만)
        for (const node of branchPlacedNodes) {
          if (Math.abs(node.x - fixedX) < 5) { // 완전히 같은 X 좌표
            const distanceY = Math.abs(node.y - proposedY);
            if (distanceY < MIN_NODE_DISTANCE) {
              // 세로로 충분히 떨어지도록 조정
              if (proposedY < node.y) {
                adjustedY = node.y - MIN_NODE_DISTANCE;
              } else {
                adjustedY = node.y + MIN_NODE_DISTANCE;
              }
              break;
            }
          }
        }
        
        // 다른 분기들과의 충돌 체크 (전역적으로)
        const allPlacedNodes = Array.from(placedNodesByBranch.values()).flat();
        for (const node of allPlacedNodes) {
          // 같은 분기가 아니고, 충돌하는 경우
          const isSameBranch = branchPlacedNodes.some(n => n.x === node.x && n.y === node.y);
          if (!isSameBranch) {
            const distance = Math.sqrt((fixedX - node.x) ** 2 + (adjustedY - node.y) ** 2);
            if (distance < MIN_NODE_DISTANCE) {
              // 세로로만 조정 (가로는 유지)
              const offsetY = adjustedY < node.y ? -MIN_NODE_DISTANCE : MIN_NODE_DISTANCE;
              adjustedY = node.y + offsetY;
            }
          }
        }
        
        childInMap.x = fixedX; // 가로는 항상 동일 (완전히 평행 유지)
        childInMap.y = adjustedY;
        
        // 배치된 노드 목록에 추가
        branchPlacedNodes.push({ x: childInMap.x, y: childInMap.y });
        
        // 자식 노드들도 재귀적으로 배치 (분기 ID 전달)
        layoutChildren(child.id, childInMap.x, childInMap.y, level + 1, currentBranchId);
        return;
      }
    });
  };
  
  // 중심 노드부터 시작하여 재귀적으로 배치
  layoutChildren(centerNode.id, centerX, centerY, 0, 'center');
  
  // 모든 노드 배치 완료 후, 모든 노드의 경계를 계산하여 중심 노드를 중앙으로 이동
  const allNodes = Array.from(nodeMap.values());
  if (allNodes.length > 0) {
    // 모든 노드의 경계 계산
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allNodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x > maxX) maxX = node.x;
      if (node.y > maxY) maxY = node.y;
    });
    
    // 경계의 중앙 좌표 계산
    const boundsCenterX = (minX + maxX) / 2;
    const boundsCenterY = (minY + maxY) / 2;
    
    // 중심 노드의 현재 위치
    const currentCenterX = center.x;
    const currentCenterY = center.y;
    
    // 이동해야 할 거리 계산
    const offsetX = boundsCenterX - currentCenterX;
    const offsetY = boundsCenterY - currentCenterY;
    
    // 모든 노드를 같은 양만큼 이동하여 중심 노드를 중앙에 배치
    allNodes.forEach(node => {
      node.x += offsetX;
      node.y += offsetY;
    });
  }
  
  const result = Array.from(nodeMap.values());
  console.log('[radial-layout] 레이아웃 적용 완료', {
    nodeCount: result.length,
    layoutedNodes: result.map(n => ({ id: n.id, x: n.x, y: n.y, level: n.level })),
  });
  
  return result;
}
