import { MindMapNode, LayoutConfig } from '@/types';
import { findCenterNode, buildNodeTree } from './layout-utils';

const DEFAULT_CONFIG: Required<LayoutConfig> = {
  autoLayout: true,
  spacing: {
    horizontal: 200,
    vertical: 150,
    radial: 200,
  },
  preserveManualPositions: false,
};

// Force-Directed Layout 상수
const DEFAULT_ITERATIONS = 100; // 기본 시뮬레이션 반복 횟수
const COOLING_FACTOR = 0.95; // 냉각 계수 (매 반복마다 힘 감소)
const INITIAL_TEMPERATURE = 100; // 초기 온도
const MIN_DISTANCE = 150; // 노드 간 최소 거리
const IDEAL_DISTANCE = 200; // 연결된 노드 간 이상적인 거리
const REPULSION_STRENGTH = 10000; // 반발력 강도
const ATTRACTION_STRENGTH = 0.01; // 인력 강도

// 노드 개수에 따른 반복 횟수 조정 (성능 최적화)
function getIterations(nodeCount: number): number {
  if (nodeCount <= 10) return 50;
  if (nodeCount <= 30) return 100;
  if (nodeCount <= 50) return 150;
  return 200; // 많은 노드일 때는 더 많은 반복
}

/**
 * Force-Directed Layout (물리 시뮬레이션)
 * 노드들을 물리적인 힘(인력, 반발력)을 시뮬레이션하여 배치
 */
export function calculateForceDirectedLayout(
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
    console.warn('[force-directed-layout] 중심 노드를 찾을 수 없습니다.');
    return nodes;
  }
  
  // 캔버스 중심 좌표
  const centerX = centerNode.x || 500;
  const centerY = centerNode.y || 300;
  
  // 중심 노드 위치 설정
  const center = nodeMap.get(centerNode.id)!;
  center.x = centerX;
  center.y = centerY;
  
  // 트리 구조 생성 (연결 관계 파악)
  const tree = buildNodeTree(Array.from(nodeMap.values()));
  
  // 초기 위치 설정 (중심 노드 주변에 원형 배치)
  const allNodes = Array.from(nodeMap.values());
  const nonCenterNodes = allNodes.filter(n => n.id !== centerNode.id);
  
  // 초기 위치를 중심 노드 주변에 원형으로 배치
  const initialRadius = spacing.radial || 200;
  const angleStep = (2 * Math.PI) / Math.max(nonCenterNodes.length, 1);
  nonCenterNodes.forEach((node, index) => {
    if (!node.isManuallyPositioned || !finalConfig.preserveManualPositions) {
      const angle = (angleStep * index) - (Math.PI / 2);
      node.x = centerX + Math.cos(angle) * initialRadius;
      node.y = centerY + Math.sin(angle) * initialRadius;
    }
  });
  
  // 시뮬레이션 실행
  const iterations = getIterations(allNodes.length);
  let temperature = INITIAL_TEMPERATURE;
  
  for (let iteration = 0; iteration < iterations; iteration++) {
    // 각 노드에 작용하는 힘 계산
    const forces = new Map<string, { fx: number; fy: number }>();
    
    allNodes.forEach(node => {
      if (node.id === centerNode.id) {
        // 중심 노드는 고정
        forces.set(node.id, { fx: 0, fy: 0 });
        return;
      }
      
      if (finalConfig.preserveManualPositions && node.isManuallyPositioned) {
        // 수동 조정된 노드는 고정
        forces.set(node.id, { fx: 0, fy: 0 });
        return;
      }
      
      let fx = 0;
      let fy = 0;
      
      // 모든 노드와의 반발력 계산
      allNodes.forEach(otherNode => {
        if (node.id === otherNode.id) return;
        
        const dx = node.x - otherNode.x;
        const dy = node.y - otherNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1; // 0 방지
        
        // 반발력 (모든 노드 간)
        const repulsion = REPULSION_STRENGTH / (distance * distance);
        fx += (dx / distance) * repulsion;
        fy += (dy / distance) * repulsion;
      });
      
      // 연결된 노드와의 인력 계산
      const parent = node.parentId ? nodeMap.get(node.parentId) : null;
      if (parent) {
        const dx = node.x - parent.x;
        const dy = node.y - parent.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // 인력 (연결된 노드 간)
        const attraction = ATTRACTION_STRENGTH * (distance - IDEAL_DISTANCE);
        fx -= (dx / distance) * attraction;
        fy -= (dy / distance) * attraction;
      }
      
      // 자식 노드들과의 인력 계산
      const children = tree.get(node.id) || [];
      children.forEach(child => {
        const dx = node.x - child.x;
        const dy = node.y - child.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const attraction = ATTRACTION_STRENGTH * (distance - IDEAL_DISTANCE);
        fx -= (dx / distance) * attraction;
        fy -= (dy / distance) * attraction;
      });
      
      // 온도에 따른 힘 제한 (초기에는 크게, 나중에는 작게)
      const forceLimit = temperature;
      const forceMagnitude = Math.sqrt(fx * fx + fy * fy);
      if (forceMagnitude > forceLimit) {
        fx = (fx / forceMagnitude) * forceLimit;
        fy = (fy / forceMagnitude) * forceLimit;
      }
      
      forces.set(node.id, { fx, fy });
    });
    
    // 힘에 따라 위치 업데이트
    allNodes.forEach(node => {
      if (node.id === centerNode.id) return;
      if (finalConfig.preserveManualPositions && node.isManuallyPositioned) return;
      
      const force = forces.get(node.id);
      if (force) {
        node.x += force.fx;
        node.y += force.fy;
      }
    });
    
    // 온도 감소 (냉각)
    temperature *= COOLING_FACTOR;
  }
  
  const result = Array.from(nodeMap.values());
  console.log('[force-directed-layout] 레이아웃 적용 완료', {
    nodeCount: result.length,
    iterations: iterations,
    layoutedNodes: result.map(n => ({ id: n.id, x: n.x, y: n.y, level: n.level })),
  });
  
  return result;
}
