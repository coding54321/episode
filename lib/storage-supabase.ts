import { 
  getProjects, 
  getProject, 
  createProject, 
  updateProject, 
  deleteProject,
  getNodes,
  saveNodes,
  getSTARAssets,
  getSTARAssetById,
  getSTARAssetByNodeId,
  saveSTARAsset,
  deleteSTARAsset,
  getGapTags,
  saveGapTag,
  deleteGapTag,
  getSharedNodes,
  getSharedNodeByNodeId,
  saveSharedNode,
  deleteSharedNode,
} from './supabase/data';
import { supabase } from './supabase/client';
import { getCurrentUser } from './supabase/auth';
import { User, BadgeType, MindMapNode, STARAsset, GapTag, MindMapProject, SharedNodeData } from '@/types';

/**
 * Supabase 기반 스토리지
 * localStorage 대신 Supabase DB를 사용
 */

// ==================== User ====================
// 사용자는 Supabase Auth로 관리되므로 별도 저장 불필요
// 하지만 호환성을 위해 유지

export const userStorage = {
  save: async (user: User): Promise<void> => {
    // Supabase Auth로 관리되므로 별도 저장 불필요
    // localStorage는 호환성을 위해 유지 (선택사항)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('episode_user', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Failed to save user to localStorage:', error);
    }
  },
  load: async (): Promise<User | null> => {
    // Supabase Auth에서 사용자 정보 가져오기
    const user = await getCurrentUser();
    if (user) {
      // localStorage에도 저장 (호환성)
      if (typeof window !== 'undefined') {
        localStorage.setItem('episode_user', JSON.stringify(user));
      }
      return user;
    }
    
    // Supabase에 없으면 localStorage 확인 (기존 사용자)
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem('episode_user');
        return data ? JSON.parse(data) : null;
      } catch (error) {
        return null;
      }
    }
    
    return null;
  },
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('episode_user');
    }
  },
};

// ==================== Projects ====================

export const mindMapProjectStorage = {
  save: async (projects: MindMapProject[]): Promise<void> => {
    // 각 프로젝트를 Supabase에 저장
    const userId = (await getCurrentUser())?.id;
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    for (const project of projects) {
      await updateProject(project.id, project);
    }
  },
  load: async (): Promise<MindMapProject[]> => {
    const userId = (await getCurrentUser())?.id;
    if (!userId) {
      return [];
    }
    return await getProjects(userId);
  },
  add: async (project: MindMapProject): Promise<void> => {
    await createProject(project);
  },
  update: async (projectId: string, updates: Partial<MindMapProject>): Promise<void> => {
    await updateProject(projectId, updates);
    // 업데이트 후 전체 프로젝트를 다시 가져와서 이벤트에 포함
    const userId = (await getCurrentUser())?.id;
    if (userId) {
      const updatedProject = await getProject(projectId, userId);
      if (updatedProject && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mindmap-project-updated', { 
          detail: { projectId, project: updatedProject, updates } 
        }));
      }
    }
  },
  delete: async (projectId: string): Promise<void> => {
    await deleteProject(projectId);
  },
  get: async (projectId: string): Promise<MindMapProject | null> => {
    const userId = (await getCurrentUser())?.id;
    if (!userId) {
      return null;
    }
    return await getProject(projectId, userId);
  },
  clear: (): void => {
    // DB에서는 삭제하지 않음 (사용자가 명시적으로 삭제해야 함)
    // 호환성을 위해 빈 함수로 유지
  },
};

// ==================== Nodes ====================
// 노드는 프로젝트에 포함되어 있으므로 별도 스토리지 불필요
// 하지만 호환성을 위해 유지

export const mindMapStorage = {
  save: async (nodes: MindMapNode[], projectId: string): Promise<void> => {
    await saveNodes(projectId, nodes);
  },
  load: async (projectId: string): Promise<MindMapNode[]> => {
    return await getNodes(projectId);
  },
  clear: (): void => {
    // DB에서는 삭제하지 않음
    // 호환성을 위해 빈 함수로 유지
  },
};

// ==================== STAR Assets ====================

export const assetStorage = {
  save: async (assets: STARAsset[]): Promise<void> => {
    // 각 에셋을 Supabase에 저장
    for (const asset of assets) {
      await saveSTARAsset(asset);
    }
  },
  load: async (): Promise<STARAsset[]> => {
    const userId = (await getCurrentUser())?.id;
    if (!userId) {
      return [];
    }
    return await getSTARAssets(userId);
  },
  add: async (asset: STARAsset): Promise<void> => {
    const success = await saveSTARAsset(asset);
    if (!success) {
      throw new Error(`Failed to add STAR asset: ${asset.id}`);
    }
  },
  update: async (id: string, updates: Partial<STARAsset>): Promise<void> => {
    // id로 먼저 찾기 시도
    let existing = await getSTARAssetById(id);
    
    // id로 찾지 못했고 nodeId가 있으면 nodeId로 찾기
    if (!existing && updates.nodeId) {
      existing = await getSTARAssetByNodeId(updates.nodeId);
    }
    
    if (!existing) {
      console.error('STAR asset not found for update:', { id, nodeId: updates.nodeId });
      throw new Error(`STAR asset not found: id=${id}, nodeId=${updates.nodeId}`);
    }
    
    // 기존 데이터와 업데이트를 병합
    const updatedAsset: STARAsset = {
      ...existing,
      ...updates,
      // updatedAt은 항상 현재 시간으로 업데이트
      updatedAt: Date.now(),
    };
    
    const success = await saveSTARAsset(updatedAsset);
    if (!success) {
      throw new Error('Failed to update STAR asset');
    }
  },
  delete: async (id: string): Promise<void> => {
    await deleteSTARAsset(id);
  },
  getByNodeId: async (nodeId: string): Promise<STARAsset | null> => {
    return await getSTARAssetByNodeId(nodeId);
  },
  clear: (): void => {
    // 호환성을 위해 빈 함수로 유지
  },
};

// ==================== Gap Tags ====================

export const gapTagStorage = {
  save: async (tags: GapTag[]): Promise<void> => {
    // 각 태그를 Supabase에 저장
    for (const tag of tags) {
      await saveGapTag(tag);
    }
  },
  load: async (): Promise<GapTag[]> => {
    const userId = (await getCurrentUser())?.id;
    if (!userId) {
      return [];
    }
    return await getGapTags(userId);
  },
  add: async (tag: GapTag): Promise<void> => {
    await saveGapTag(tag);
  },
  remove: async (id: string): Promise<void> => {
    await deleteGapTag(id);
  },
  clear: (): void => {
    // 호환성을 위해 빈 함수로 유지
  },
};

// ==================== Shared Nodes ====================

export const sharedNodeStorage = {
  save: async (sharedNodes: SharedNodeData[]): Promise<void> => {
    // 각 공유 노드를 Supabase에 저장
    for (const sharedNode of sharedNodes) {
      await saveSharedNode(sharedNode);
    }
  },
  load: async (): Promise<SharedNodeData[]> => {
    const userId = (await getCurrentUser())?.id;
    if (!userId) {
      return [];
    }
    return await getSharedNodes(userId);
  },
  add: async (sharedData: SharedNodeData): Promise<void> => {
    await saveSharedNode(sharedData);
  },
  get: async (nodeId: string): Promise<SharedNodeData | null> => {
    // 공유 링크로 접근하는 경우를 위해 사용자 ID 없이도 조회 가능하도록 수정
    return await getSharedNodeByNodeId(nodeId);
  },
  remove: async (nodeId: string): Promise<void> => {
    // shared_nodes 테이블에서 node_id로 찾아서 삭제
    const userId = (await getCurrentUser())?.id;
    if (!userId) {
      return;
    }
    const sharedNodes = await getSharedNodes(userId);
    const sharedNode = sharedNodes.find(s => s.nodeId === nodeId);
    if (sharedNode) {
      await deleteSharedNode(sharedNode.id);
    }
  },
  clear: (): void => {
    // 호환성을 위해 빈 함수로 유지
  },
};

// ==================== Badge Storage ====================
// 배지는 프로젝트의 badges 필드에 저장되므로 별도 스토리지 불필요

export const badgeStorage = {
  save: async (badges: BadgeType[]): Promise<void> => {
    // 배지는 프로젝트 생성 시 저장되므로 여기서는 처리하지 않음
    // 호환성을 위해 빈 함수로 유지
  },
  load: async (): Promise<BadgeType[]> => {
    // 배지는 프로젝트에서 가져와야 함
    // 호환성을 위해 빈 배열 반환
    return [];
  },
  clear: (): void => {
    // 호환성을 위해 빈 함수로 유지
  },
};

// ==================== Current Project ====================
// 현재 프로젝트는 클라이언트 상태이므로 localStorage 유지

export const currentProjectStorage = {
  save: (projectId: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('episode_current_project_id', projectId);
    }
  },
  load: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('episode_current_project_id');
    }
    return null;
  },
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('episode_current_project_id');
    }
  },
};

// ==================== Onboarding ====================
// 온보딩 상태는 클라이언트 상태이므로 localStorage 유지

export const mindMapOnboardingStorage = {
  saveShown: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('episode_mindmap_onboarding_v1', 'true');
    }
  },
  isShown: (): boolean => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('episode_mindmap_onboarding_v1') === 'true';
    }
    return false;
  },
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('episode_mindmap_onboarding_v1');
    }
  },
};

