import { MindMapNode } from '@/types';

/**
 * 노드들을 레벨별로 그룹화
 */
export function groupNodesByLevel(nodes: MindMapNode[]): Record<number, MindMapNode[]> {
  const grouped: Record<number, MindMapNode[]> = {};
  
  nodes.forEach(node => {
    const level = node.level ?? 0;
    if (!grouped[level]) {
      grouped[level] = [];
    }
    grouped[level].push(node);
  });
  
  return grouped;
}

/**
 * 노드들을 부모-자식 관계로 트리 구조 생성
 */
export function buildNodeTree(nodes: MindMapNode[]): Map<string, MindMapNode[]> {
  const tree = new Map<string, MindMapNode[]>();
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  
  nodes.forEach(node => {
    const parentId = node.parentId || 'root';
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(node);
  });
  
  return tree;
}

/**
 * 특정 노드의 모든 하위 노드 ID 수집 (재귀적)
 */
export function collectDescendantIds(
  nodeId: string,
  nodeMap: Map<string, MindMapNode>
): string[] {
  const descendants: string[] = [];
  const node = nodeMap.get(nodeId);
  
  if (!node) return descendants;
  
  node.children.forEach(childId => {
    descendants.push(childId);
    const childDescendants = collectDescendantIds(childId, nodeMap);
    descendants.push(...childDescendants);
  });
  
  return descendants;
}

/**
 * 중심 노드 찾기
 */
export function findCenterNode(nodes: MindMapNode[]): MindMapNode | null {
  return nodes.find(node => 
    node.id === 'center' || 
    node.nodeType === 'center' || 
    node.level === 0
  ) || null;
}
