import { User, BadgeType, MindMapNode, STARAsset, GapTag, MindMapProject, SharedNodeData } from '@/types';

/**
 * @deprecated 이 파일은 Supabase 기반으로 마이그레이션되었습니다.
 * 새로운 코드는 lib/storage-supabase.ts를 사용하세요.
 * 
 * 기존 코드와의 호환성을 위해 유지되지만, 내부적으로 Supabase를 사용합니다.
 */

// localStorage 키 상수 (온보딩, 현재 프로젝트 ID 등 클라이언트 상태용)
export const STORAGE_KEYS = {
  USER: 'episode_user',
  BADGES: 'episode_badges',
  MINDMAP: 'episode_mindmap',
  MINDMAP_PROJECTS: 'episode_mindmap_projects',
  CURRENT_PROJECT_ID: 'episode_current_project_id',
  ASSETS: 'episode_assets',
  GAP_TAGS: 'episode_gap_tags',
  SHARED_NODES: 'episode_shared_nodes',
  MINDMAP_ONBOARDING: 'episode_mindmap_onboarding_v1',
} as const;

// Supabase 기반 스토리지 import
import * as supabaseStorage from './storage-supabase';

// 사용자 정보 저장/로드 (Supabase 기반)
export const userStorage = {
  save: async (user: User): Promise<void> => {
    await supabaseStorage.userStorage.save(user);
  },
  load: async (): Promise<User | null> => {
    return await supabaseStorage.userStorage.load();
  },
  clear: (): void => {
    supabaseStorage.userStorage.clear();
  },
};

// 마인드맵 온보딩(튜토리얼) 노출 여부 (클라이언트 상태 - localStorage 유지)
export const mindMapOnboardingStorage = {
  saveShown: (): void => {
    supabaseStorage.mindMapOnboardingStorage.saveShown();
  },
  isShown: (): boolean => {
    return supabaseStorage.mindMapOnboardingStorage.isShown();
  },
  clear: (): void => {
    supabaseStorage.mindMapOnboardingStorage.clear();
  },
};

// 배지 저장/로드 (Supabase 기반 - 프로젝트의 badges 필드에 저장됨)
export const badgeStorage = {
  save: async (badges: BadgeType[]): Promise<void> => {
    await supabaseStorage.badgeStorage.save(badges);
  },
  load: async (): Promise<BadgeType[]> => {
    return await supabaseStorage.badgeStorage.load();
  },
  clear: (): void => {
    supabaseStorage.badgeStorage.clear();
  },
};

// 마인드맵 저장/로드 (레거시 호환 - Supabase 기반)
// projectId가 필요하므로 사용 시 주의
export const mindMapStorage = {
  save: async (nodes: MindMapNode[], projectId?: string): Promise<void> => {
    if (!projectId) {
      console.error('projectId is required for mindMapStorage.save()');
      return;
    }
    await supabaseStorage.mindMapStorage.save(nodes, projectId);
    // 다른 탭에 변경사항 알림
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  },
  load: async (projectId?: string): Promise<MindMapNode[]> => {
    if (!projectId) {
      console.error('projectId is required for mindMapStorage.load()');
      return [];
    }
    return await supabaseStorage.mindMapStorage.load(projectId);
  },
  clear: (): void => {
    supabaseStorage.mindMapStorage.clear();
  },
};

// 마인드맵 프로젝트 저장/로드 (Supabase 기반)
export const mindMapProjectStorage = {
  save: async (projects: MindMapProject[]): Promise<void> => {
    await supabaseStorage.mindMapProjectStorage.save(projects);
  },
  load: async (): Promise<MindMapProject[]> => {
    return await supabaseStorage.mindMapProjectStorage.load();
  },
  add: async (project: MindMapProject): Promise<void> => {
    await supabaseStorage.mindMapProjectStorage.add(project);
  },
  update: async (projectId: string, updates: Partial<MindMapProject>): Promise<void> => {
    // updateProject 내부에서 이벤트를 발생시키므로 여기서는 호출만
    await supabaseStorage.mindMapProjectStorage.update(projectId, updates);
  },
  delete: async (projectId: string): Promise<void> => {
    await supabaseStorage.mindMapProjectStorage.delete(projectId);
  },
  get: async (projectId: string): Promise<MindMapProject | null> => {
    return await supabaseStorage.mindMapProjectStorage.get(projectId);
  },
  clear: (): void => {
    supabaseStorage.mindMapProjectStorage.clear();
  },
};

// 현재 프로젝트 ID 관리 (클라이언트 상태 - localStorage 유지)
export const currentProjectStorage = {
  save: (projectId: string): void => {
    supabaseStorage.currentProjectStorage.save(projectId);
  },
  load: (): string | null => {
    return supabaseStorage.currentProjectStorage.load();
  },
  clear: (): void => {
    supabaseStorage.currentProjectStorage.clear();
  },
};

// STAR 에셋 저장/로드 (Supabase 기반)
export const assetStorage = {
  save: async (assets: STARAsset[]): Promise<void> => {
    await supabaseStorage.assetStorage.save(assets);
  },
  load: async (): Promise<STARAsset[]> => {
    return await supabaseStorage.assetStorage.load();
  },
  add: async (asset: STARAsset): Promise<void> => {
    await supabaseStorage.assetStorage.add(asset);
  },
  update: async (id: string, updates: Partial<STARAsset>): Promise<void> => {
    await supabaseStorage.assetStorage.update(id, updates);
  },
  delete: async (id: string): Promise<void> => {
    await supabaseStorage.assetStorage.delete(id);
  },
  getByNodeId: async (nodeId: string): Promise<STARAsset | null> => {
    return await supabaseStorage.assetStorage.getByNodeId(nodeId);
  },
  clear: (): void => {
    supabaseStorage.assetStorage.clear();
  },
};

// 공백 태그 저장/로드 (Supabase 기반)
export const gapTagStorage = {
  save: async (tags: GapTag[]): Promise<void> => {
    await supabaseStorage.gapTagStorage.save(tags);
  },
  load: async (): Promise<GapTag[]> => {
    return await supabaseStorage.gapTagStorage.load();
  },
  add: async (tag: GapTag): Promise<void> => {
    await supabaseStorage.gapTagStorage.add(tag);
  },
  remove: async (id: string): Promise<void> => {
    await supabaseStorage.gapTagStorage.remove(id);
  },
  clear: (): void => {
    supabaseStorage.gapTagStorage.clear();
  },
};

// 공유된 노드 저장/로드 (Supabase 기반)
export const sharedNodeStorage = {
  save: async (sharedNodes: SharedNodeData[]): Promise<void> => {
    await supabaseStorage.sharedNodeStorage.save(sharedNodes);
  },
  load: async (): Promise<SharedNodeData[]> => {
    return await supabaseStorage.sharedNodeStorage.load();
  },
  add: async (sharedData: SharedNodeData): Promise<void> => {
    await supabaseStorage.sharedNodeStorage.add(sharedData);
  },
  get: async (nodeId: string): Promise<SharedNodeData | null> => {
    return await supabaseStorage.sharedNodeStorage.get(nodeId);
  },
  remove: async (nodeId: string): Promise<void> => {
    await supabaseStorage.sharedNodeStorage.remove(nodeId);
  },
  clear: (): void => {
    supabaseStorage.sharedNodeStorage.clear();
  },
};

