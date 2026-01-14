import { MindMapNode, LayoutType, LayoutConfig } from '@/types';
import { calculateRadialLayout } from './radial-layout';
import { calculateTreeLayout } from './tree-layout';

/**
 * 레이아웃 타입에 따라 적절한 레이아웃 알고리즘 실행
 */
export function applyLayout(
  nodes: MindMapNode[],
  layoutType: LayoutType = 'radial',
  config: LayoutConfig = {}
): MindMapNode[] {
  let result: MindMapNode[];
  
  switch (layoutType) {
    case 'radial':
      result = calculateRadialLayout(nodes, config);
      break;
    case 'tree':
      result = calculateTreeLayout(nodes, config);
      break;
    case 'hierarchical':
    case 'force-directed':
      // 제거된 레이아웃은 radial로 대체
      console.warn(`[layout] ${layoutType} 레이아웃은 제거되었습니다. Radial 레이아웃으로 대체합니다.`);
      result = calculateRadialLayout(nodes, config);
      break;
    default:
      result = calculateRadialLayout(nodes, config);
  }
  
  return result;
}

/**
 * 노드 추가 시 자동 레이아웃 적용
 */
export function applyAutoLayoutForNewNode(
  nodes: MindMapNode[],
  newNode: MindMapNode,
  layoutType: LayoutType = 'radial',
  config: LayoutConfig = {}
): MindMapNode[] {
  // 새 노드를 포함한 전체 노드 배열
  const allNodes = [...nodes, newNode];
  
  // 레이아웃 적용
  return applyLayout(allNodes, layoutType, config);
}

/**
 * 노드 삭제 시 자동 레이아웃 적용
 */
export function applyAutoLayoutAfterDelete(
  nodes: MindMapNode[],
  deletedNodeId: string,
  layoutType: LayoutType = 'radial',
  config: LayoutConfig = {}
): MindMapNode[] {
  // 삭제된 노드를 제외한 노드 배열
  const remainingNodes = nodes.filter(node => node.id !== deletedNodeId);
  
  // 레이아웃 적용
  return applyLayout(remainingNodes, layoutType, config);
}
