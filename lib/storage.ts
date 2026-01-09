import { User, BadgeType, MindMapNode, STARAsset, GapTag, MindMapProject, SharedNodeData } from '@/types';

// localStorage 키 상수
export const STORAGE_KEYS = {
  USER: 'episode_user',
  BADGES: 'episode_badges',
  MINDMAP: 'episode_mindmap',
  MINDMAP_PROJECTS: 'episode_mindmap_projects',
  CURRENT_PROJECT_ID: 'episode_current_project_id',
  ASSETS: 'episode_assets',
  GAP_TAGS: 'episode_gap_tags',
  SHARED_NODES: 'episode_shared_nodes',
} as const;

// 사용자 정보 저장/로드
export const userStorage = {
  save: (user: User): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  },
  load: (): User | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load user:', error);
      return null;
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('Failed to clear user:', error);
    }
  },
};

// 배지 저장/로드
export const badgeStorage = {
  save: (badges: BadgeType[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
    } catch (error) {
      console.error('Failed to save badges:', error);
    }
  },
  load: (): BadgeType[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BADGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load badges:', error);
      return [];
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.BADGES);
    } catch (error) {
      console.error('Failed to clear badges:', error);
    }
  },
};

// 마인드맵 저장/로드 (레거시 호환)
export const mindMapStorage = {
  save: (nodes: MindMapNode[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.MINDMAP, JSON.stringify(nodes));
      // 다른 탭에 변경사항 알림
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Failed to save mindmap:', error);
    }
  },
  load: (): MindMapNode[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MINDMAP);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load mindmap:', error);
      return [];
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.MINDMAP);
    } catch (error) {
      console.error('Failed to clear mindmap:', error);
    }
  },
};

// 마인드맵 프로젝트 저장/로드
export const mindMapProjectStorage = {
  save: (projects: MindMapProject[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.MINDMAP_PROJECTS, JSON.stringify(projects));
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Failed to save mindmap projects:', error);
    }
  },
  load: (): MindMapProject[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MINDMAP_PROJECTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load mindmap projects:', error);
      return [];
    }
  },
  add: (project: MindMapProject): void => {
    const projects = mindMapProjectStorage.load();
    projects.push(project);
    mindMapProjectStorage.save(projects);
  },
  update: (projectId: string, updates: Partial<MindMapProject>): void => {
    const projects = mindMapProjectStorage.load();
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates, updatedAt: Date.now() };
      mindMapProjectStorage.save(projects);
      // 같은 탭에서도 동기화를 위해 custom event 발생
      window.dispatchEvent(new CustomEvent('mindmap-project-updated', { detail: { projectId, project: projects[index] } }));
    }
  },
  delete: (projectId: string): void => {
    const projects = mindMapProjectStorage.load();
    mindMapProjectStorage.save(projects.filter(p => p.id !== projectId));
  },
  get: (projectId: string): MindMapProject | null => {
    const projects = mindMapProjectStorage.load();
    return projects.find(p => p.id === projectId) || null;
  },
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.MINDMAP_PROJECTS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    } catch (error) {
      console.error('Failed to clear mindmap projects:', error);
    }
  },
};

// 현재 프로젝트 ID 관리
export const currentProjectStorage = {
  save: (projectId: string): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, projectId);
    } catch (error) {
      console.error('Failed to save current project ID:', error);
    }
  },
  load: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    } catch (error) {
      console.error('Failed to load current project ID:', error);
      return null;
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    } catch (error) {
      console.error('Failed to clear current project ID:', error);
    }
  },
};

// STAR 에셋 저장/로드
export const assetStorage = {
  save: (assets: STARAsset[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
    } catch (error) {
      console.error('Failed to save assets:', error);
    }
  },
  load: (): STARAsset[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ASSETS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load assets:', error);
      return [];
    }
  },
  add: (asset: STARAsset): void => {
    const assets = assetStorage.load();
    assets.push(asset);
    assetStorage.save(assets);
  },
  update: (id: string, updates: Partial<STARAsset>): void => {
    const assets = assetStorage.load();
    const index = assets.findIndex(a => a.id === id);
    if (index !== -1) {
      assets[index] = { ...assets[index], ...updates, updatedAt: Date.now() };
      assetStorage.save(assets);
    }
  },
  delete: (id: string): void => {
    const assets = assetStorage.load();
    assetStorage.save(assets.filter(a => a.id !== id));
  },
  getByNodeId: (nodeId: string): STARAsset | null => {
    const assets = assetStorage.load();
    return assets.find(a => a.nodeId === nodeId) || null;
  },
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ASSETS);
    } catch (error) {
      console.error('Failed to clear assets:', error);
    }
  },
};

// 공백 태그 저장/로드
export const gapTagStorage = {
  save: (tags: GapTag[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.GAP_TAGS, JSON.stringify(tags));
    } catch (error) {
      console.error('Failed to save gap tags:', error);
    }
  },
  load: (): GapTag[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GAP_TAGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load gap tags:', error);
      return [];
    }
  },
  add: (tag: GapTag): void => {
    const tags = gapTagStorage.load();
    tags.push(tag);
    gapTagStorage.save(tags);
  },
  remove: (id: string): void => {
    const tags = gapTagStorage.load();
    gapTagStorage.save(tags.filter(t => t.id !== id));
  },
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.GAP_TAGS);
    } catch (error) {
      console.error('Failed to clear gap tags:', error);
    }
  },
};

// 공유된 노드 저장/로드
export const sharedNodeStorage = {
  save: (sharedNodes: SharedNodeData[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHARED_NODES, JSON.stringify(sharedNodes));
    } catch (error) {
      console.error('Failed to save shared nodes:', error);
    }
  },
  load: (): SharedNodeData[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHARED_NODES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load shared nodes:', error);
      return [];
    }
  },
  add: (sharedData: SharedNodeData): void => {
    const sharedNodes = sharedNodeStorage.load();
    // 같은 노드 ID가 이미 있으면 업데이트
    const existingIndex = sharedNodes.findIndex(s => s.id === sharedData.id);
    if (existingIndex !== -1) {
      sharedNodes[existingIndex] = sharedData;
    } else {
      sharedNodes.push(sharedData);
    }
    sharedNodeStorage.save(sharedNodes);
  },
  get: (nodeId: string): SharedNodeData | null => {
    const sharedNodes = sharedNodeStorage.load();
    return sharedNodes.find(s => s.id === nodeId) || null;
  },
  remove: (nodeId: string): void => {
    const sharedNodes = sharedNodeStorage.load();
    sharedNodeStorage.save(sharedNodes.filter(s => s.id !== nodeId));
  },
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.SHARED_NODES);
    } catch (error) {
      console.error('Failed to clear shared nodes:', error);
    }
  },
};

