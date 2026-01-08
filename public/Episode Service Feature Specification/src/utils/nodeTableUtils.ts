import { MindMapNode, NodeTableEntry, STARAsset } from '../types';

export function generateNodeTableEntries(nodes: MindMapNode[], starAssets: STARAsset[]): NodeTableEntry[] {
  const entries: NodeTableEntry[] = [];
  const centerNode = nodes.find(n => n.id === 'center');
  if (!centerNode) return entries;

  // 노드 경로를 구성하는 헬퍼 함수
  const getNodePath = (nodeId: string, nodeMap: Map<string, MindMapNode>): string[] => {
    const path: string[] = [];
    let currentId: string | null = nodeId;

    while (currentId && currentId !== 'center') {
      const node = nodeMap.get(currentId);
      if (!node) break;
      path.unshift(node.label);
      currentId = node.parentId;
    }

    return path;
  };

  // 노드 맵 생성
  const nodeMap = new Map<string, MindMapNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  // 중앙 노드의 직접 자식들(대분류)부터 시작
  const categoryNodes = nodes.filter(n => n.parentId === 'center');

  categoryNodes.forEach(categoryNode => {
    // 레벨 1: 대분류 노드
    const categoryEntry = createTableEntry(categoryNode, [], nodeMap, starAssets);
    if (categoryEntry) entries.push(categoryEntry);

    // 레벨 2: 경험 노드들
    const experienceNodes = nodes.filter(n => n.parentId === categoryNode.id);
    experienceNodes.forEach(experienceNode => {
      const experienceEntry = createTableEntry(experienceNode, [categoryNode.label], nodeMap, starAssets);
      if (experienceEntry) entries.push(experienceEntry);

      // 레벨 3: 에피소드 노드들
      const episodeNodes = nodes.filter(n => n.parentId === experienceNode.id);
      episodeNodes.forEach(episodeNode => {
        const episodeEntry = createTableEntry(episodeNode, [categoryNode.label, experienceNode.label], nodeMap, starAssets);
        if (episodeEntry) entries.push(episodeEntry);

        // 레벨 4 이상도 재귀적으로 처리
        processDeepNodes(episodeNode.id, [categoryNode.label, experienceNode.label, episodeNode.label], nodes, nodeMap, starAssets, entries);
      });
    });
  });

  return entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

function processDeepNodes(
  parentId: string,
  parentPath: string[],
  nodes: MindMapNode[],
  nodeMap: Map<string, MindMapNode>,
  starAssets: STARAsset[],
  entries: NodeTableEntry[]
): void {
  const childNodes = nodes.filter(n => n.parentId === parentId);

  childNodes.forEach(childNode => {
    const childPath = [...parentPath, childNode.label];
    const childEntry = createTableEntry(childNode, parentPath, nodeMap, starAssets);
    if (childEntry) entries.push(childEntry);

    // 더 깊은 레벨이 있다면 재귀적으로 처리
    processDeepNodes(childNode.id, childPath, nodes, nodeMap, starAssets, entries);
  });
}

function createTableEntry(
  node: MindMapNode,
  parentPath: string[],
  nodeMap: Map<string, MindMapNode>,
  starAssets: STARAsset[]
): NodeTableEntry | null {
  // 해당 노드의 STAR 에셋 찾기
  const nodeSTARAsset = starAssets.find(asset => asset.nodeId === node.id);

  // 경로 구성
  const fullPath = [...parentPath, node.label];
  const pathString = fullPath.join(' > ');

  return {
    id: `table_${node.id}_${Date.now()}`,
    nodeId: node.id,
    category: parentPath[0] || node.label, // 대분류
    experience: parentPath[1] || (parentPath.length === 0 ? '' : node.label), // 경험
    episode: parentPath[2] || (parentPath.length <= 1 ? '' : node.label), // 에피소드
    situation: nodeSTARAsset?.situation || '',
    task: nodeSTARAsset?.task || '',
    action: nodeSTARAsset?.action || '',
    result: nodeSTARAsset?.result || '',
    competencyTags: nodeSTARAsset?.competency ? [nodeSTARAsset.competency] : [],
    level: node.level,
    path: pathString,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// 노드 변경 시 기존 테이블 엔트리 업데이트
export function updateNodeTableEntry(
  existingEntries: NodeTableEntry[],
  updatedNode: MindMapNode,
  allNodes: MindMapNode[],
  starAssets: STARAsset[]
): NodeTableEntry[] {
  const nodeMap = new Map<string, MindMapNode>();
  allNodes.forEach(node => nodeMap.set(node.id, node));

  return existingEntries.map(entry => {
    if (entry.nodeId === updatedNode.id) {
      // 경로 재계산
      const path = getUpdatedPath(updatedNode.id, nodeMap);
      const pathString = path.join(' > ');

      return {
        ...entry,
        category: path[0] || '',
        experience: path[1] || '',
        episode: path[2] || '',
        path: pathString,
        updatedAt: Date.now(),
      };
    }
    return entry;
  });
}

function getUpdatedPath(nodeId: string, nodeMap: Map<string, MindMapNode>): string[] {
  const path: string[] = [];
  let currentId: string | null = nodeId;

  while (currentId && currentId !== 'center') {
    const node = nodeMap.get(currentId);
    if (!node) break;
    path.unshift(node.label);
    currentId = node.parentId;
  }

  return path;
}

// localStorage에 테이블 엔트리 저장/로드
export function saveNodeTableEntries(entries: NodeTableEntry[]): void {
  try {
    localStorage.setItem('episode_node_table', JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to save node table entries:', error);
  }
}

export function loadNodeTableEntries(): NodeTableEntry[] {
  try {
    const saved = localStorage.getItem('episode_node_table');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load node table entries:', error);
  }
  return [];
}