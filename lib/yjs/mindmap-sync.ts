import * as Y from 'yjs';
import { MindMapNode } from '@/types';

/**
 * 마인드맵 노드 데이터를 Yjs Map으로 변환/동기화하는 유틸리티
 */

/**
 * Yjs Map에서 마인드맵 노드 배열로 변환
 */
export function yjsMapToNodes(ydoc: Y.Doc): MindMapNode[] {
  const nodesMap = ydoc.getMap('nodes');
  const nodes: MindMapNode[] = [];

  nodesMap.forEach((nodeData: any, nodeId: string) => {
    // children 배열 재구성
    const children: string[] = [];
    nodesMap.forEach((otherNodeData: any, otherNodeId: string) => {
      if (otherNodeData.parentId === nodeId) {
        children.push(otherNodeId);
      }
    });

    nodes.push({
      id: nodeId,
      label: nodeData.label || '',
      parentId: nodeData.parentId || null,
      children: children,
      level: nodeData.level || 0,
      x: nodeData.x || 0,
      y: nodeData.y || 0,
      nodeType: nodeData.nodeType || 'detail',
      badgeType: nodeData.badgeType || undefined,
      customLabel: nodeData.customLabel || undefined,
      isShared: nodeData.isShared || false,
      sharedLink: nodeData.sharedLink || undefined,
      createdAt: nodeData.createdAt || Date.now(),
      updatedAt: nodeData.updatedAt || Date.now(),
    });
  });

  return nodes;
}

/**
 * 마인드맵 노드 배열을 Yjs Map으로 변환
 */
export function nodesToYjsMap(ydoc: Y.Doc, nodes: MindMapNode[]) {
  const nodesMap = ydoc.getMap('nodes');

  // 기존 맵 초기화
  nodesMap.clear();

  // 노드들을 맵에 추가
  nodes.forEach((node) => {
    nodesMap.set(node.id, {
      label: node.label,
      level: node.level,
      x: node.x,
      y: node.y,
      parentId: node.parentId,
      nodeType: node.nodeType,
      badgeType: node.badgeType,
      customLabel: node.customLabel,
      isShared: node.isShared,
      sharedLink: node.sharedLink,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    });
  });
}

/**
 * 단일 노드를 Yjs Map에 업데이트
 */
export function updateNodeInYjs(ydoc: Y.Doc, node: MindMapNode) {
  const nodesMap = ydoc.getMap('nodes');
  nodesMap.set(node.id, {
    label: node.label,
    level: node.level,
    x: node.x,
    y: node.y,
    parentId: node.parentId,
    nodeType: node.nodeType,
    badgeType: node.badgeType,
    customLabel: node.customLabel,
    isShared: node.isShared,
    sharedLink: node.sharedLink,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  });
}

/**
 * Yjs Map에서 노드 삭제
 */
export function deleteNodeFromYjs(ydoc: Y.Doc, nodeId: string) {
  const nodesMap = ydoc.getMap('nodes');
  nodesMap.delete(nodeId);
}

