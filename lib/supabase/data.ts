import { supabase } from './client';
import { MindMapProject, MindMapNode, STARAsset, GapTag, SharedNodeData, BadgeType } from '@/types';
import type { Database } from './types';

/**
 * Supabase 데이터 접근 함수
 * localStorage 대신 Supabase DB를 사용
 */

// ==================== Date Conversion Utilities ====================

/**
 * DB DATE 문자열 → TypeScript timestamp 변환
 * @param date DB의 DATE 타입 문자열 (YYYY-MM-DD) 또는 null
 * @returns timestamp (Date.getTime()) 또는 null
 */
function dateToTimestamp(date: string | null | undefined): number | null {
  if (!date) return null;
  try {
    const dateObj = new Date(date);
    return isNaN(dateObj.getTime()) ? null : dateObj.getTime();
  } catch {
    return null;
  }
}

/**
 * TypeScript timestamp → DB DATE 문자열 변환
 * @param timestamp Date.getTime() 값 또는 null/undefined
 * @returns YYYY-MM-DD 형식 문자열 또는 null
 */
function timestampToDate(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
  } catch {
    return null;
  }
}

// ==================== Projects ====================

export async function getProjects(userId: string): Promise<MindMapProject[]> {
  try {
    // 프로젝트 조회 (nodes count는 별도로 조회하여 RLS 문제 방지)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id' as any, userId as any)
      .order('is_favorite', { ascending: false }) // 즐겨찾기 우선 정렬
      .order('updated_at', { ascending: false }); // 그 다음 최신순

    if (error) {
      console.error('getProjects error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw error;
    }
    if (!data) return [];

    // 프로젝트별 노드 개수 조회 (별도 쿼리로 RLS 문제 방지)
    const projectIds = (data as any[]).map((p: any) => p.id);
    let nodeCountsMap = new Map<string, number>();
    
    if (projectIds.length > 0) {
      try {
        const { data: nodesData, error: nodesError } = await supabase
          .from('nodes')
          .select('project_id')
          .in('project_id' as any, projectIds as any);
        
        if (!nodesError && nodesData) {
          // 프로젝트별 노드 개수 계산
          const counts = new Map<string, number>();
          for (const node of nodesData as any[]) {
            const pid = node.project_id;
            counts.set(pid, (counts.get(pid) || 0) + 1);
          }
          nodeCountsMap = counts;
        }
      } catch (nodesErr) {
        console.warn('Failed to get node counts:', nodesErr);
        // 노드 개수 조회 실패해도 프로젝트는 반환
      }
    }

    return (data as any[]).map((p: any) => {
      const nodeCount = nodeCountsMap.get(p.id) || 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        badges: (p.badges as BadgeType[]) || [],
        nodes: Array(nodeCount).fill(null).map((_, i) => ({ id: `placeholder_${i}` } as MindMapNode)), // 개수만큼 플레이스홀더 생성 (하위 호환성)
        nodeCount, // 실제 노드 개수 (새 필드)
        layoutType: p.layout_type || 'radial',
        layoutConfig: p.layout_config || { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } },
        createdAt: new Date(p.created_at || '').getTime(),
        updatedAt: new Date(p.updated_at || '').getTime(),
        isDefault: p.is_default || false,
        isFavorite: p.is_favorite || false,
        projectType: (p.project_type as 'personal' | 'collaborative') || 'personal',
        isShared: p.is_shared || false,
        sharedBy: p.shared_by || undefined,
        sharedByUser: p.shared_by_user || undefined,
      };
    });
  } catch (error) {
    console.error('Failed to get projects:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
    return [];
  }
}

/**
 * 검색용: 모든 프로젝트와 노드 데이터를 함께 조회
 * 검색 기능에서 노드 라벨을 검색할 수 있도록 실제 노드 데이터를 포함
 */
export async function getProjectsWithNodes(userId: string): Promise<MindMapProject[]> {
  try {
    // 프로젝트 조회
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id' as any, userId as any)
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false });

    if (projectsError) throw projectsError;
    if (!projectsData || projectsData.length === 0) return [];

    // 모든 프로젝트의 노드를 한 번에 조회
    const projectIds = projectsData.map((p: any) => p.id);
    const { data: nodesData, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
      .in('project_id' as any, projectIds as any);

    if (nodesError) throw nodesError;

    // 프로젝트별로 노드 그룹화
    const nodesByProject = new Map<string, MindMapNode[]>();
    const nodeMap = new Map<string, MindMapNode>();
    
    if (nodesData) {
      // 먼저 모든 노드를 맵에 저장
      for (const node of nodesData as any[]) {
        const projectId = node.project_id;
        const mindMapNode: MindMapNode = {
          id: node.id,
          label: node.label,
          x: node.x,
          y: node.y,
          level: node.level,
          parentId: node.parent_id,
          nodeType: node.node_type,
          badgeType: node.badge_type,
          customLabel: node.custom_label,
          isShared: node.is_shared,
          sharedLink: node.shared_link,
          isManuallyPositioned: node.is_manually_positioned,
          color: node.color,
          startDate: dateToTimestamp(node.start_date),
          endDate: dateToTimestamp(node.end_date),
          children: [],
          createdAt: typeof node.created_at === 'number' ? node.created_at : new Date(node.created_at || '').getTime(),
          updatedAt: typeof node.updated_at === 'number' ? node.updated_at : new Date(node.updated_at || '').getTime(),
        } as MindMapNode;
        
        nodeMap.set(node.id, mindMapNode);
        
        if (!nodesByProject.has(projectId)) {
          nodesByProject.set(projectId, []);
        }
        nodesByProject.get(projectId)!.push(mindMapNode);
      }
      
      // 부모-자식 관계 구성 (children 배열 채우기)
      for (const node of nodeMap.values()) {
        if (node.parentId) {
          const parent = nodeMap.get(node.parentId);
          if (parent) {
            parent.children.push(node.id);
          }
        }
      }
    }

    return (projectsData as any[]).map((p: any) => {
      const nodes = nodesByProject.get(p.id) || [];
      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        badges: (p.badges as BadgeType[]) || [],
        nodes,
        nodeCount: nodes.length,
        layoutType: p.layout_type || 'radial',
        layoutConfig: p.layout_config || { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } },
        createdAt: new Date(p.created_at || '').getTime(),
        updatedAt: new Date(p.updated_at || '').getTime(),
        isDefault: p.is_default || false,
        isFavorite: p.is_favorite || false,
        projectType: (p.project_type as 'personal' | 'collaborative') || 'personal',
        isShared: p.is_shared || false,
        sharedBy: p.shared_by || undefined,
        sharedByUser: p.shared_by_user || undefined,
      };
    });
  } catch (error) {
    console.error('Failed to get projects with nodes:', error);
    return [];
  }
}

export async function getProject(projectId: string, userId: string): Promise<MindMapProject | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id' as any, projectId as any)
      .eq('user_id' as any, userId as any)
      .maybeSingle();

    if (error) {
      // 406 Not Acceptable이나 RLS 정책 오류 처리
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return null; // 데이터 없음
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.warn('Permission denied for project access:', { projectId, userId });
        return null;
      }
      throw error;
    }

    if (!data) return null;

    // 노드 로드
    const nodes = await getNodes(projectId);

    const projectData = data as any;

    return {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description || '',
      badges: (projectData.badges as BadgeType[]) || [],
      nodes,
      nodeCount: nodes.length, // 상세 조회 시에도 nodeCount 설정
      layoutType: projectData.layout_type || 'radial',
      layoutConfig: projectData.layout_config || { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } },
      createdAt: new Date(projectData.created_at || '').getTime(),
      updatedAt: new Date(projectData.updated_at || '').getTime(),
      isDefault: projectData.is_default || false,
      isFavorite: projectData.is_favorite || false,
      projectType: (projectData.project_type as 'personal' | 'collaborative') || 'personal',
      isShared: projectData.is_shared || false,
      sharedBy: projectData.shared_by || undefined,
      sharedByUser: projectData.shared_by_user || undefined,
    };
  } catch (error) {
    // AbortError는 조용히 무시 (컴포넌트 언마운트 등으로 인한 정상적인 중단)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Project query aborted (normal during navigation)');
      return null;
    }
    console.error('Failed to get project:', error);
    return null;
  }
}

/**
 * 공유된 프로젝트 조회 (로그인 없이도 접근 가능)
 */
export async function getSharedProject(projectId: string): Promise<MindMapProject | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id' as any, projectId as any)
      .eq('is_shared' as any, true as any)
      .eq('project_type' as any, 'collaborative' as any) // 팀 마인드맵만 허용
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        return null;
      }
      throw error;
    }

    if (!data) return null;

    // 노드 로드
    const nodes = await getNodes(projectId);

    const projectData = data as any;

    // 개인 마인드맵은 절대 공유 링크로 접근 불가
    if (projectData.project_type !== 'collaborative') {
      return null;
    }

    return {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description || '',
      badges: (projectData.badges as BadgeType[]) || [],
      nodes,
      nodeCount: nodes.length,
      layoutType: projectData.layout_type || 'radial',
      layoutConfig: projectData.layout_config || { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } },
      createdAt: new Date(projectData.created_at || '').getTime(),
      updatedAt: new Date(projectData.updated_at || '').getTime(),
      isDefault: projectData.is_default || false,
      isFavorite: projectData.is_favorite || false,
      projectType: 'collaborative' as const,
      isShared: projectData.is_shared || false,
      sharedBy: projectData.shared_by || undefined,
      sharedByUser: projectData.shared_by_user || undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Shared project query aborted');
      return null;
    }
    console.error('Failed to get shared project:', error);
    return null;
  }
}

export async function createProject(
  project: Omit<MindMapProject, 'createdAt' | 'updatedAt'> & { userId?: string }
): Promise<MindMapProject | null> {
  try {
    // 사용자가 users 테이블에 존재하는지 확인하고 없으면 생성
    let userId: string | undefined = project.userId;

    if (!userId) {
      userId = (await ensureUserExists()) ?? undefined;
    }

    if (!userId) {
      console.error('Cannot create project: No valid user ID provided', {
        hasProjectUserId: !!project.userId,
        ensureUserResult: userId,
      });
      return null;
    }

    // id가 이미 존재하는지 확인 (중복 방지)
    if (project.id) {
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('id' as any, project.id as any)
        .maybeSingle();

      if (existing) {
        console.warn('Project ID already exists:', project.id);
        return null;
      }
    }

    const projectType = project.projectType || 'personal';
    const insertData: any = {
      user_id: userId,
      name: project.name,
      description: project.description || null,
      badges: project.badges || [],
      is_default: project.isDefault || false,
      layout_type: project.layoutType || 'radial',
      layout_config: project.layoutConfig || { autoLayout: true, spacing: { horizontal: 150, vertical: 120, radial: 160 } },
      project_type: projectType,
      is_shared: projectType === 'collaborative' ? (project.isShared ?? true) : false, // 팀 마인드맵은 기본 공유 활성화
    };

    // id가 제공된 경우에만 포함 (그렇지 않으면 DB에서 자동 생성)
    if (project.id) {
      insertData.id = project.id;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('createProject insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        insertData: JSON.stringify(insertData, null, 2),
      });
      // 409 충돌 에러 처리
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.warn('Project creation conflict (duplicate ID):', error.message);
        return null;
      }
      throw error;
    }

    // 노드 저장 (생성된 프로젝트의 실제 ID 사용)
    const createdProjectId = (data as any).id;
    if (project.nodes && project.nodes.length > 0) {
      console.log('[data.ts] createProject: 노드 저장 시작', {
        projectId: createdProjectId,
        nodeCount: project.nodes.length,
      });
      const saveSuccess = await saveNodes(createdProjectId, project.nodes);
      if (!saveSuccess) {
        console.error('[data.ts] createProject: 노드 저장 실패', {
          projectId: createdProjectId,
          nodeCount: project.nodes.length,
        });
        // 노드 저장 실패해도 프로젝트는 생성되었으므로 경고만
      } else {
        console.log('[data.ts] createProject: 노드 저장 성공', {
          projectId: createdProjectId,
          nodeCount: project.nodes.length,
        });
      }
    } else {
      console.log('[data.ts] createProject: 저장할 노드 없음', {
        projectId: createdProjectId,
      });
    }

    const createdData = data as any;

    return {
      ...project,
      id: createdProjectId, // DB에서 생성된 실제 ID 사용
      createdAt: new Date(createdData.created_at || '').getTime(),
      updatedAt: new Date(createdData.updated_at || '').getTime(),
      isFavorite: createdData.is_favorite || false,
    };
  } catch (error) {
    console.error('Failed to create project:', error);
    return null;
  }
}

export async function updateProject(
  projectId: string,
  updates: Partial<MindMapProject>
): Promise<boolean> {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.badges !== undefined) updateData.badges = updates.badges;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
    if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
    if (updates.layoutType !== undefined) updateData.layout_type = updates.layoutType;
    if (updates.layoutConfig !== undefined) updateData.layout_config = updates.layoutConfig;
    if (updates.projectType !== undefined) updateData.project_type = updates.projectType;
    
    // 개인 마인드맵은 is_shared 변경 불가 (강제로 false)
    if (updates.projectType === 'personal') {
      updateData.is_shared = false;
    } else if (updates.isShared !== undefined) {
      updateData.is_shared = updates.isShared;
    }
    
    if (updates.sharedBy !== undefined) updateData.shared_by = updates.sharedBy;
    if (updates.sharedByUser !== undefined) updateData.shared_by_user = updates.sharedByUser;

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id' as any, projectId as any);

    if (error) throw error;

    // 노드 업데이트
    if (updates.nodes !== undefined) {
      await saveNodes(projectId, updates.nodes);
    }

    return true;
  } catch (error) {
    console.error('Failed to update project:', error);
    return false;
  }
}

export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    // 노드 먼저 삭제 (외래키 제약)
    await supabase.from('nodes').delete().eq('project_id' as any, projectId as any);

    // 프로젝트 삭제
    const { error } = await supabase.from('projects').delete().eq('id' as any, projectId as any);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    return false;
  }
}

// ==================== Nodes ====================

export async function getNodes(projectId: string): Promise<MindMapNode[]> {
  try {
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('project_id' as any, projectId as any)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    const nodesData = (data as any[]) || [];
    const nodes = nodesData.map((n: any) => ({
      id: n.id,
      label: n.label,
      parentId: n.parent_id,
      children: [] as string[], // children은 아래에서 계산
      x: n.x || 0,
      y: n.y || 0,
      level: n.level || 0,
      nodeType: n.node_type || undefined,
      badgeType: n.badge_type || undefined,
      customLabel: n.custom_label || undefined,
      isShared: n.is_shared || false,
      sharedLink: n.shared_link || undefined,
      isManuallyPositioned: n.is_manually_positioned || false,
      startDate: dateToTimestamp(n.start_date),
      endDate: dateToTimestamp(n.end_date),
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    // children 배열 계산 (parentId 기반)
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    nodes.forEach(node => {
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(node.id);
        }
      }
    });

    return nodes;
  } catch (error) {
    console.error('[data.ts] getNodes: 노드 로드 실패', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      projectId,
    });
    return [];
  }
}

/**
 * 노드들을 부모-자식 관계를 고려하여 계층별로 정렬
 * 부모 노드가 자식 노드보다 먼저 오도록 함
 */
function sortNodesByHierarchy(nodes: MindMapNode[]): MindMapNode[][] {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const levels: MindMapNode[][] = [];
  const processed = new Set<string>();

  // 루트 노드들 (parentId가 없거나 부모가 목록에 없는 노드들)
  const rootNodes = nodes.filter(node =>
    !node.parentId || !nodeMap.has(node.parentId)
  );

  let currentLevel = rootNodes;

  while (currentLevel.length > 0) {
    levels.push([...currentLevel]);
    currentLevel.forEach(node => processed.add(node.id));

    // 다음 레벨의 자식 노드들 찾기
    const nextLevel = nodes.filter(node =>
      node.parentId &&
      processed.has(node.parentId) &&
      !processed.has(node.id)
    );

    currentLevel = nextLevel;
  }

  return levels;
}

// saveNodes 중복 호출 방지를 위한 플래그
const saveNodesInProgress = new Map<string, Promise<boolean>>();

/**
 * 단일 노드 업데이트 (라벨 변경 등 간단한 업데이트용)
 * 전체 노드 배열을 처리하지 않고 해당 노드만 업데이트하여 성능 최적화
 */
export async function updateNode(
  projectId: string,
  nodeId: string,
  updates: Partial<Pick<MindMapNode, 'label' | 'x' | 'y' | 'isShared' | 'sharedLink' | 'customLabel' | 'parentId' | 'children' | 'level' | 'nodeType' | 'badgeType' | 'isManuallyPositioned' | 'startDate' | 'endDate'>>
): Promise<boolean> {
  try {
    const updateData: any = {
      updated_at: Date.now(),
    };

    // 업데이트할 필드만 추가
    if (updates.label !== undefined) {
      updateData.label = updates.label;
    }
    if (updates.x !== undefined) {
      updateData.x = updates.x;
    }
    if (updates.y !== undefined) {
      updateData.y = updates.y;
    }
    if (updates.isShared !== undefined) {
      updateData.is_shared = updates.isShared;
    }
    if (updates.sharedLink !== undefined) {
      updateData.shared_link = updates.sharedLink;
    }
    if (updates.customLabel !== undefined) {
      updateData.custom_label = updates.customLabel;
    }
    if (updates.parentId !== undefined) {
      updateData.parent_id = updates.parentId || null;
    }
    if (updates.level !== undefined) {
      updateData.level = updates.level;
    }
    if (updates.nodeType !== undefined) {
      updateData.node_type = updates.nodeType || null;
    }
    if (updates.badgeType !== undefined) {
      updateData.badge_type = updates.badgeType || null;
    }
    if (updates.isManuallyPositioned !== undefined) {
      updateData.is_manually_positioned = updates.isManuallyPositioned;
    }
    if (updates.startDate !== undefined) {
      updateData.start_date = timestampToDate(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      updateData.end_date = timestampToDate(updates.endDate);
    }

    const { error } = await supabase
      .from('nodes')
      .update(updateData)
      .eq('id' as any, nodeId as any)
      .eq('project_id' as any, projectId as any);

    if (error) {
      console.error('[data.ts] updateNode: 노드 업데이트 실패', {
        error,
        projectId,
        nodeId,
        updates,
      });
      return false;
    }

    console.log('[data.ts] updateNode: 노드 업데이트 성공', {
      projectId,
      nodeId,
      updatedFields: Object.keys(updateData),
    });

    return true;
  } catch (error) {
    console.error('[data.ts] updateNode: 예외 발생', {
      error,
      projectId,
      nodeId,
      updates,
    });
    return false;
  }
}

/**
 * 새 노드를 DB에 추가 (공유 페이지에서 사용)
 */
export async function insertNode(projectId: string, node: MindMapNode): Promise<boolean> {
  try {
    const nodeData: any = {
      id: node.id,
      project_id: projectId,
      parent_id: node.parentId || null,
      label: node.label || '',
      level: node.level ?? 0,
      node_type: node.nodeType || null,
      badge_type: node.badgeType || null,
      custom_label: node.customLabel || null,
      x: node.x ?? 0,
      y: node.y ?? 0,
      is_shared: node.isShared || false,
      shared_link: node.sharedLink || null,
      is_manually_positioned: node.isManuallyPositioned || false,
      start_date: timestampToDate(node.startDate),
      end_date: timestampToDate(node.endDate),
      created_at: node.createdAt || Date.now(),
      updated_at: node.updatedAt || Date.now(),
    };

    const { error } = await supabase
      .from('nodes')
      .insert(nodeData);

    if (error) {
      console.error('[data.ts] insertNode: 노드 추가 실패', {
        error,
        projectId,
        nodeId: node.id,
      });
      return false;
    }

    console.log('[data.ts] insertNode: 노드 추가 성공', {
      projectId,
      nodeId: node.id,
      label: node.label,
    });

    return true;
  } catch (error) {
    console.error('[data.ts] insertNode: 예외 발생', {
      error,
      projectId,
      nodeId: node.id,
    });
    return false;
  }
}

/**
 * 노드를 DB에서 삭제 (공유 페이지에서 사용)
 * 하위 노드도 함께 삭제하려면 재귀적으로 호출해야 함
 */
export async function deleteNode(projectId: string, nodeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('nodes')
      .delete()
      .eq('id' as any, nodeId as any)
      .eq('project_id' as any, projectId as any);

    if (error) {
      console.error('[data.ts] deleteNode: 노드 삭제 실패', {
        error,
        projectId,
        nodeId,
      });
      return false;
    }

    console.log('[data.ts] deleteNode: 노드 삭제 성공', {
      projectId,
      nodeId,
    });

    return true;
  } catch (error) {
    console.error('[data.ts] deleteNode: 예외 발생', {
      error,
      projectId,
      nodeId,
    });
    return false;
  }
}

export async function saveNodes(projectId: string, nodes: MindMapNode[]): Promise<boolean> {
  // 이미 진행 중인 저장이 있으면 대기
  const existingPromise = saveNodesInProgress.get(projectId);
  if (existingPromise) {
    console.log('[data.ts] saveNodes: 이미 진행 중인 저장이 있음, 대기', { projectId });
    return await existingPromise;
  }

  const savePromise = (async () => {
    try {
      console.log('[data.ts] saveNodes: 시작', {
        projectId,
        nodeCount: nodes.length,
        nodeIds: nodes.map(n => n.id).slice(0, 5), // 처음 5개만 로깅
        sampleNode: nodes[0] ? {
          id: nodes[0].id,
          label: nodes[0].label,
          level: nodes[0].level,
          parentId: nodes[0].parentId,
          childrenCount: nodes[0].children.length,
        } : null,
      });
    
    if (nodes.length === 0) {
      // 노드가 없으면 해당 프로젝트의 모든 노드 삭제
      const { error } = await supabase.from('nodes').delete().eq('project_id' as any, projectId as any);
      if (error) {
        console.error('[data.ts] saveNodes: 노드 삭제 실패', { error, projectId });
        return false;
      }
      console.log('[data.ts] saveNodes: 모든 노드 삭제 완료', { projectId });
      return true;
    }

    // 부모-자식 관계를 고려하여 노드를 계층별로 정렬
    const sortedNodes = sortNodesByHierarchy(nodes);

    // 저장할 노드들의 모든 parentId 수집
    const nodeIdsInArray = new Set(nodes.map(n => n.id));
    const allMissingParentIds = new Set<string>();

    // 초기 parentId 수집
    nodes.forEach(node => {
      if (node.parentId && !nodeIdsInArray.has(node.parentId)) {
        allMissingParentIds.add(node.parentId);
      }
    });

    // DB에서 누락된 부모 노드들을 최대 2단계까지 조회 (최적화: while 루프 대신 2단계로 제한)
    const nodesToSave = [...nodes];

    if (allMissingParentIds.size > 0) {
      const missingParentIds = Array.from(allMissingParentIds);

      // 1단계: 누락된 부모 노드 조회
      const { data: missingParents, error: fetchError } = await supabase
        .from('nodes')
        .select('*')
        .eq('project_id' as any, projectId as any)
        .in('id' as any, missingParentIds as any);

      if (!fetchError && missingParents && missingParents.length > 0) {
        const missingParentsTyped = (missingParents as any[]) || [];
        const parentNodes: MindMapNode[] = missingParentsTyped.map((n: any) => ({
          id: n.id,
          label: n.label,
          parentId: n.parent_id,
          children: [],
          x: n.x || 0,
          y: n.y || 0,
          level: n.level || 0,
          nodeType: n.node_type || undefined,
          badgeType: n.badge_type || undefined,
          customLabel: n.custom_label || undefined,
          isShared: n.is_shared || false,
          sharedLink: n.shared_link || undefined,
          isManuallyPositioned: n.is_manually_positioned || false,
          startDate: dateToTimestamp(n.start_date),
          endDate: dateToTimestamp(n.end_date),
          createdAt: n.created_at,
          updatedAt: n.updated_at,
        }));

        nodesToSave.push(...parentNodes);

        // 2단계: 조회한 부모 노드들의 parentId도 수집하여 추가 조회
        const secondLevelParentIds = new Set<string>();
        parentNodes.forEach(node => {
          if (node.parentId && !nodeIdsInArray.has(node.parentId) && !allMissingParentIds.has(node.parentId)) {
            secondLevelParentIds.add(node.parentId);
          }
        });

        // 2단계 조상 노드도 조회 (대부분의 경우 충분함, 마인드맵 깊이가 5단계를 넘지 않으므로)
        if (secondLevelParentIds.size > 0) {
          const { data: secondLevelParents } = await supabase
            .from('nodes')
            .select('*')
            .eq('project_id' as any, projectId as any)
            .in('id' as any, Array.from(secondLevelParentIds) as any);

          if (secondLevelParents && secondLevelParents.length > 0) {
            const secondLevelParentsTyped = (secondLevelParents as any[]) || [];
            const secondLevelNodes: MindMapNode[] = secondLevelParentsTyped.map((n: any) => ({
              id: n.id,
              label: n.label,
              parentId: n.parent_id,
              children: [],
              x: n.x || 0,
              y: n.y || 0,
              level: n.level || 0,
              nodeType: n.node_type || undefined,
              badgeType: n.badge_type || undefined,
              customLabel: n.custom_label || undefined,
              isShared: n.is_shared || false,
              sharedLink: n.shared_link || undefined,
              isManuallyPositioned: n.is_manually_positioned || false,
              startDate: dateToTimestamp(n.start_date),
              endDate: dateToTimestamp(n.end_date),
              createdAt: n.created_at,
              updatedAt: n.updated_at,
            }));

            nodesToSave.push(...secondLevelNodes);
          }
        }
      }
    }

    // 부모 노드 포함하여 다시 계층별로 정렬
    const sortedNodesWithParents = sortNodesByHierarchy(nodesToSave);

    // 노드를 계층별로 저장 (부모부터 자식 순으로)
    // 배치 크기 제한 (한 번에 100개씩 저장)
    const BATCH_SIZE = 100;

    for (let levelIndex = 0; levelIndex < sortedNodesWithParents.length; levelIndex++) {
      const levelNodes = sortedNodesWithParents[levelIndex];

      // 레벨 내 노드가 많으면 배치로 나누어 저장
      for (let batchStart = 0; batchStart < levelNodes.length; batchStart += BATCH_SIZE) {
        const batchNodes = levelNodes.slice(batchStart, batchStart + BATCH_SIZE);
        const nodesToUpsert = batchNodes.map((node) => {
      // createdAt과 updatedAt을 숫자(bigint)로 변환
      // 실제 DB 스키마: created_at bigint, updated_at bigint
      let createdAt: number | null = null;
      if (node.createdAt) {
        if (typeof node.createdAt === 'number') {
          createdAt = node.createdAt;
        } else if (typeof node.createdAt === 'string') {
          createdAt = new Date(node.createdAt).getTime();
        } else {
          createdAt = Date.now();
        }
      }

      let updatedAt: number | null = null;
      if (node.updatedAt) {
        if (typeof node.updatedAt === 'number') {
          updatedAt = node.updatedAt;
        } else if (typeof node.updatedAt === 'string') {
          updatedAt = new Date(node.updatedAt).getTime();
        } else {
          updatedAt = Date.now();
        }
      }

      // null 체크 및 기본값 설정
      // created_at과 updated_at은 항상 포함 (bigint 타임스탬프)
      const nowTimestamp = Date.now();
      
      const nodeData: any = {
        id: node.id,
        project_id: projectId,
        parent_id: node.parentId || null,
        label: node.label || '',
        level: node.level ?? 0,
        node_type: node.nodeType || null,
        badge_type: node.badgeType || null,
        custom_label: node.customLabel || null,
        x: node.x ?? 0,
        y: node.y ?? 0,
        is_shared: node.isShared || false,
        shared_link: node.sharedLink || null,
        is_manually_positioned: node.isManuallyPositioned || false,
        start_date: timestampToDate(node.startDate),
        end_date: timestampToDate(node.endDate),
        created_at: createdAt || nowTimestamp,
        updated_at: updatedAt || nowTimestamp,
      };

        return nodeData;
      });

        // 각 배치의 노드들을 upsert
        console.log(`[data.ts] saveNodes: 레벨 ${levelIndex} 배치 ${Math.floor(batchStart / BATCH_SIZE)} 노드 저장 시도`, {
          levelIndex,
          batchIndex: Math.floor(batchStart / BATCH_SIZE),
          nodeCount: nodesToUpsert.length,
          nodeIds: nodesToUpsert.map(n => n.id),
          firstNode: nodesToUpsert[0] ? {
            id: nodesToUpsert[0].id,
            project_id: nodesToUpsert[0].project_id,
            label: nodesToUpsert[0].label,
            level: nodesToUpsert[0].level,
          } : null,
        });

        const result = await supabase
          .from('nodes')
          .upsert(nodesToUpsert, {
            onConflict: 'id',
            ignoreDuplicates: false // 중복 시 업데이트하도록 설정
          });

        if (result.error) {
          console.error(`[data.ts] saveNodes: 레벨 ${levelIndex} 배치 ${Math.floor(batchStart / BATCH_SIZE)} 저장 실패`, {
            error: result.error,
            errorCode: result.error.code,
            errorMessage: result.error.message,
            errorDetails: (result.error as any).details,
            errorHint: (result.error as any).hint,
            nodeCount: nodesToUpsert.length,
            projectId,
          });
          // Foreign Key 제약조건 위반인 경우 (부모 노드 누락)
          if (result.error.code === '23503') {
            console.warn(`Foreign key constraint violation at level ${levelIndex}:`, {
              error: result.error.message,
              batchNodes: batchNodes.map(n => ({ id: n.id, parentId: n.parentId }))
            });
          
          // 부모 노드가 누락된 경우, 누락된 부모 노드들을 찾아서 먼저 저장
          const missingParentIds = new Set<string>();
          levelNodes.forEach(node => {
            if (node.parentId) {
              // 부모 노드가 현재 저장 대상에 포함되어 있는지 확인
              const parentExists = nodesToSave.some(n => n.id === node.parentId);
              if (!parentExists) {
                missingParentIds.add(node.parentId);
              }
            }
          });

          if (missingParentIds.size > 0) {
            // DB에서 누락된 부모 노드들 조회 (재시도 로직 추가)
            let missingParents: any[] | null = null;
            let fetchError: any = null;
            let fetchRetryCount = 0;
            const maxFetchRetries = 2;
            
            while (fetchRetryCount <= maxFetchRetries) {
              try {
                const fetchResult = await supabase
                  .from('nodes')
                  .select('*')
                  .eq('project_id' as any, projectId as any)
                  .in('id' as any, Array.from(missingParentIds) as any);
                missingParents = fetchResult.data;
                fetchError = fetchResult.error;
                
                if (!fetchError && missingParents) {
                  break; // 성공
                }
                
                // AbortError인 경우 재시도
                if (fetchError && (fetchError.message?.includes('aborted') || fetchError.message?.includes('AbortError'))) {
                  if (fetchRetryCount < maxFetchRetries) {
                    fetchRetryCount++;
                    console.log(`[data.ts] saveNodes: 부모 노드 조회 AbortError, 재시도 ${fetchRetryCount}/${maxFetchRetries}`);
                    await new Promise(resolve => setTimeout(resolve, 100 * fetchRetryCount));
                    continue;
                  }
                  console.warn('[data.ts] saveNodes: 부모 노드 조회 AbortError 재시도 실패');
                  fetchError = null; // 에러 무시하고 계속 진행
                  missingParents = [];
                  break;
                }
                
                break;
              } catch (fetchErr) {
                if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
                  if (fetchRetryCount < maxFetchRetries) {
                    fetchRetryCount++;
                    console.log(`[data.ts] saveNodes: 부모 노드 조회 예외 AbortError, 재시도 ${fetchRetryCount}/${maxFetchRetries}`);
                    await new Promise(resolve => setTimeout(resolve, 100 * fetchRetryCount));
                    continue;
                  }
                  console.warn('[data.ts] saveNodes: 부모 노드 조회 예외 AbortError 재시도 실패');
                  fetchError = null;
                  missingParents = [];
                  break;
                }
                throw fetchErr;
              }
            }

            if (!fetchError && missingParents && missingParents.length > 0) {
              // 부모 노드들을 먼저 저장
              const parentNodesToUpsert = missingParents.map((n: any) => ({
                id: n.id,
                project_id: projectId,
                parent_id: n.parent_id,
                label: n.label,
                level: n.level || 0,
                node_type: n.node_type || null,
                badge_type: n.badge_type || null,
                custom_label: n.custom_label || null,
                x: n.x || 0,
                y: n.y || 0,
                is_shared: n.is_shared || false,
                shared_link: n.shared_link || null,
                created_at: n.created_at,
                updated_at: n.updated_at,
              }));

              const parentResult = await supabase
                .from('nodes')
                .upsert(parentNodesToUpsert as any, {
                  onConflict: 'id',
                  ignoreDuplicates: false
                });

              if (!parentResult.error) {
                // 부모 노드 저장 성공 후 현재 레벨 재시도
                const retryResult = await supabase
                  .from('nodes')
                  .upsert(nodesToUpsert, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                  });

                if (retryResult.error) {
                  console.warn(`Retry failed for level ${levelIndex}:`, retryResult.error);
                  continue;
                }
                // 재시도 성공, 다음 레벨로 진행
                continue;
              }
            }
          }
          
          // 부모 노드를 찾을 수 없거나 저장 실패한 경우 해당 레벨을 건너뛰고 계속 진행
          continue;
        }

        // 409 Conflict 에러는 동시 업데이트로 인한 것일 수 있으므로 재시도 또는 무시
        if (result.error.code === '409' || result.error.message?.includes('conflict')) {
          console.warn('Node update conflict detected, likely due to concurrent updates:', {
            errorCode: result.error.code,
            message: result.error.message,
            nodeCount: nodesToUpsert.length,
            level: levelIndex
          });
          // 충돌은 무시하고 계속 진행
          continue;
        }

          console.error('Failed to save nodes:', result.error);
          throw result.error;
        }
      } // 배치 루프 종료
    } // 레벨 루프 종료

    // 프로젝트에 속하지 않는 노드 삭제 (삭제된 노드 처리)
    const nodeIds = nodes.map(n => n.id);
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('id, parent_id')
      .eq('project_id' as any, projectId as any);

    if (existingNodes) {
      const existingNodesTyped = (existingNodes as any[]) || [];
      const existingNodeIds = existingNodesTyped.map((n: any) => n.id);
      const nodesToDeleteIds = existingNodeIds.filter(id => !nodeIds.includes(id));

      if (nodesToDeleteIds.length > 0) {
        // 삭제할 노드들을 자식부터 부모 순으로 정렬
        const nodesToDeleteData = existingNodesTyped.filter((n: any) => nodesToDeleteIds.includes(n.id));
        const sortedDeleteNodes = sortNodesByHierarchy(
          nodesToDeleteData.map((n: any) => ({
            id: n.id,
            parentId: n.parent_id,
            label: '',
            children: [],
            x: 0,
            y: 0,
            level: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
          } as MindMapNode))
        );

        // 자식 노드부터 삭제 (역순)
        for (let i = sortedDeleteNodes.length - 1; i >= 0; i--) {
          const levelNodes = sortedDeleteNodes[i];
          const levelNodeIds = levelNodes.map(n => n.id);

          const { error: deleteError } = await supabase
            .from('nodes')
            .delete()
            .eq('project_id' as any, projectId as any)
            .in('id' as any, levelNodeIds as any);

          if (deleteError) {
            // 삭제 에러는 무시 (RLS 정책이나 이미 삭제된 노드일 수 있음)
            console.warn(`Failed to delete level ${i} nodes:`, deleteError.message);
          }
        }
      }
    }

    // 저장 후 실제로 저장되었는지 확인
    const { data: savedNodes, error: verifyError } = await supabase
      .from('nodes')
      .select('id')
      .eq('project_id' as any, projectId as any);

    if (verifyError) {
      console.error('[data.ts] saveNodes: 저장 검증 실패', { error: verifyError, projectId });
    } else {
      const savedNodesTyped = (savedNodes as any[]) || [];
      console.log('[data.ts] saveNodes: 저장 검증 완료', {
        projectId,
        expectedCount: nodes.length,
        actualCount: savedNodesTyped.length || 0,
        savedNodeIds: savedNodesTyped.map((n: any) => n.id).slice(0, 5),
      });
    }

      console.log('[data.ts] saveNodes: 성공', {
        projectId,
        nodeCount: nodes.length,
        savedCount: savedNodes?.length || 0,
      });
      return true;
    } catch (error) {
      // AbortError는 조용히 무시 (컴포넌트 언마운트 등으로 인한 정상적인 중단)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[data.ts] saveNodes: AbortError 무시 (정상적인 중단)', { projectId });
        return false;
      }
      console.error('[data.ts] saveNodes: 실패', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined,
        projectId,
        nodeCount: nodes.length,
      });
      return false;
    } finally {
      // 완료 후 플래그 제거
      saveNodesInProgress.delete(projectId);
    }
  })();

  saveNodesInProgress.set(projectId, savePromise);
  return await savePromise;
}

/**
 * 기존 프로젝트의 center 노드 ID를 프로젝트별 고유 ID로 마이그레이션
 * 이 함수는 한 번만 실행하면 됩니다 (기존 데이터 마이그레이션용)
 */
export async function migrateCenterNodeIds(): Promise<{ migrated: number; errors: number }> {
  try {
    // 모든 프로젝트 조회
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id');

    if (projectsError) {
      console.error('[data.ts] migrateCenterNodeIds: 프로젝트 조회 실패', projectsError);
      return { migrated: 0, errors: 0 };
    }

    if (!projects || projects.length === 0) {
      console.log('[data.ts] migrateCenterNodeIds: 마이그레이션할 프로젝트 없음');
      return { migrated: 0, errors: 0 };
    }

    let migrated = 0;
    let errors = 0;

    for (const project of projects) {
      try {
        // 프로젝트의 center 노드 찾기 (id가 'center'이거나 nodeType이 'center'이거나 level이 0)
        const { data: centerNodes, error: nodesError } = await supabase
          .from('nodes')
          .select('*')
          .eq('project_id' as any, project.id)
          .or('id.eq.center,node_type.eq.center,level.eq.0')
          .limit(1);

        if (nodesError) {
          console.error(`[data.ts] migrateCenterNodeIds: 프로젝트 ${project.id} 노드 조회 실패`, nodesError);
          errors++;
          continue;
        }

        if (!centerNodes || centerNodes.length === 0) {
          continue; // center 노드가 없으면 스킵
        }

        const centerNode = centerNodes[0];
        const newCenterId = `${project.id}_center`;

        // 이미 마이그레이션된 경우 스킵
        if (centerNode.id === newCenterId) {
          continue;
        }

        // 1. 새 ID로 노드 업데이트
        const { error: updateError } = await supabase
          .from('nodes')
          .update({ id: newCenterId })
          .eq('id' as any, centerNode.id)
          .eq('project_id' as any, project.id);

        if (updateError) {
          console.error(`[data.ts] migrateCenterNodeIds: 프로젝트 ${project.id} center 노드 업데이트 실패`, updateError);
          errors++;
          continue;
        }

        // 2. 이 center 노드를 parent로 가진 모든 노드들의 parent_id 업데이트
        const { error: updateChildrenError } = await supabase
          .from('nodes')
          .update({ parent_id: newCenterId })
          .eq('parent_id' as any, centerNode.id)
          .eq('project_id' as any, project.id);

        if (updateChildrenError) {
          console.error(`[data.ts] migrateCenterNodeIds: 프로젝트 ${project.id} 자식 노드 업데이트 실패`, updateChildrenError);
          errors++;
          continue;
        }

        // 3. badge 노드들도 마이그레이션 (id가 'badge_'로 시작하는 경우)
        const { data: badgeNodes, error: badgeError } = await supabase
          .from('nodes')
          .select('id')
          .eq('project_id' as any, project.id)
          .like('id' as any, 'badge_%');

        if (!badgeError && badgeNodes) {
          for (const badgeNode of badgeNodes) {
            // 이미 프로젝트 ID가 포함된 경우 스킵
            if (badgeNode.id.startsWith(`${project.id}_`)) {
              continue;
            }

            const newBadgeId = `${project.id}_${badgeNode.id}`;

            // badge 노드 ID 업데이트
            const { error: badgeUpdateError } = await supabase
              .from('nodes')
              .update({ id: newBadgeId })
              .eq('id' as any, badgeNode.id)
              .eq('project_id' as any, project.id);

            if (badgeUpdateError) {
              console.error(`[data.ts] migrateCenterNodeIds: 프로젝트 ${project.id} badge 노드 ${badgeNode.id} 업데이트 실패`, badgeUpdateError);
              // badge 노드 업데이트 실패는 에러로 카운트하지 않음 (선택적)
            } else {
              // badge 노드를 parent로 가진 노드들의 parent_id 업데이트
              await supabase
                .from('nodes')
                .update({ parent_id: newBadgeId })
                .eq('parent_id' as any, badgeNode.id)
                .eq('project_id' as any, project.id);
            }
          }
        }

        migrated++;
        console.log(`[data.ts] migrateCenterNodeIds: 프로젝트 ${project.id} 마이그레이션 완료`);
      } catch (error) {
        console.error(`[data.ts] migrateCenterNodeIds: 프로젝트 ${project.id} 마이그레이션 중 예외`, error);
        errors++;
      }
    }

    console.log(`[data.ts] migrateCenterNodeIds: 마이그레이션 완료 - 성공: ${migrated}, 실패: ${errors}`);
    return { migrated, errors };
  } catch (error) {
    console.error('[data.ts] migrateCenterNodeIds: 마이그레이션 실패', error);
    return { migrated: 0, errors: 0 };
  }
}

// ==================== STAR Assets ====================

export async function getSTARAssets(userId: string): Promise<STARAsset[]> {
  try {
    // 사용자의 프로젝트에 속한 노드들의 STAR 에셋만 가져오기
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id' as any, userId as any);

    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) return [];

    const projectsTyped = (projects as any[]) || [];
    const projectIds = projectsTyped.map((p: any) => p.id);

    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .select('id')
      .in('project_id' as any, projectIds as any);

    if (nodesError) throw nodesError;
    if (!nodes || nodes.length === 0) return [];

    const nodesTyped = (nodes as any[]) || [];
    const nodeIds = nodesTyped.map((n: any) => n.id);

    const { data, error } = await supabase
      .from('star_assets')
      .select('*')
      .in('node_id' as any, nodeIds as any);

    if (error) throw error;
    if (!data) return [];

    const dataTyped = (data as any[]) || [];
    return dataTyped.map((a: any) => ({
      id: a.id,
      nodeId: a.node_id,
      title: a.title,
      situation: a.situation || '',
      task: a.task || '',
      action: a.action || '',
      result: a.result || '',
      content: a.content || '',
      company: a.company || undefined,
      competency: a.competency || undefined,
      tags: (a.tags as string[]) || [],
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));
  } catch (error) {
    console.error('Failed to get STAR assets:', error);
    return [];
  }
}

export async function getSTARAssetById(assetId: string): Promise<STARAsset | null> {
  try {
    const { data, error } = await supabase
      .from('star_assets')
      .select('*')
      .eq('id' as any, assetId as any)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST301') {
        return null;
      }
      console.error('Failed to get STAR asset by id:', error);
      return null;
    }

    if (!data) return null;

    const dataTyped = data as any;
    return {
      id: dataTyped.id,
      nodeId: dataTyped.node_id,
      title: dataTyped.title,
      situation: dataTyped.situation || '',
      task: dataTyped.task || '',
      action: dataTyped.action || '',
      result: dataTyped.result || '',
      content: dataTyped.content || '',
      company: dataTyped.company || undefined,
      competency: dataTyped.competency || undefined,
      tags: (dataTyped.tags as string[]) || [],
      createdAt: dataTyped.created_at,
      updatedAt: dataTyped.updated_at,
    };
  } catch (error) {
    console.error('Failed to get STAR asset by id:', error);
    return null;
  }
}

export async function getSTARAssetByNodeId(nodeId: string): Promise<STARAsset | null> {
  try {
    const { data, error } = await supabase
      .from('star_assets')
      .select('*')
      .eq('node_id' as any, nodeId.trim() as any)
      .maybeSingle();

    if (error) {
      // 406 에러나 다른 에러는 무시하고 null 반환
      // PGRST116: Not found, PGRST301: Multiple rows returned
      // PostgrestError는 status 속성이 없으므로 code만 확인
      if (error.code === 'PGRST116' || error.code === 'PGRST301') {
        return null;
      }
      // HTTP 상태 코드는 message나 details에서 확인 가능하지만, 일반적으로 code로 충분
      // 다른 에러는 로그만 남기고 null 반환
      console.error('Failed to get STAR asset by nodeId:', error);
      return null;
    }

    if (!data) return null;

    const dataTyped = data as any;
    return {
      id: dataTyped.id,
      nodeId: dataTyped.node_id,
      title: dataTyped.title,
      situation: dataTyped.situation || '',
      task: dataTyped.task || '',
      action: dataTyped.action || '',
      result: dataTyped.result || '',
      content: dataTyped.content || '',
      company: dataTyped.company || undefined,
      competency: dataTyped.competency || undefined,
      tags: (dataTyped.tags as string[]) || [],
      createdAt: dataTyped.created_at,
      updatedAt: dataTyped.updated_at,
    };
  } catch (error) {
    // 모든 에러는 무시하고 null 반환
    console.error('Failed to get STAR asset by nodeId:', error);
    return null;
  }
}

export async function saveSTARAsset(asset: STARAsset): Promise<boolean> {
  try {
    // 필수 필드 검증
    if (!asset.id || !asset.nodeId || !asset.title) {
      const errorMsg = `Missing required fields: id=${asset.id}, nodeId=${asset.nodeId}, title=${asset.title}`;
      console.error('Invalid STAR asset data:', errorMsg);
      throw new Error(errorMsg);
    }

    // 사용자 인증 상태 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('User not authenticated:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // 노드 ID 유효성 검증
    if (!asset.nodeId || typeof asset.nodeId !== 'string' || asset.nodeId.trim() === '') {
      console.error('Invalid nodeId:', asset.nodeId);
      throw new Error(`Invalid nodeId: ${asset.nodeId}`);
    }

    // 노드가 사용자의 프로젝트에 속하는지 확인
    const { data: nodeData, error: nodeError } = await supabase
      .from('nodes')
      .select('id, project_id')
      .eq('id' as any, asset.nodeId.trim() as any)
      .maybeSingle(); // .single() 대신 .maybeSingle() 사용

    if (nodeError) {
      console.error('Error fetching node:', {
        nodeId: asset.nodeId,
        error: nodeError,
        errorCode: nodeError.code,
        errorMessage: nodeError.message,
      });
      throw new Error(`Failed to fetch node: ${asset.nodeId}`);
    }

    if (!nodeData) {
      console.error('Node not found:', {
        nodeId: asset.nodeId,
        nodeIdType: typeof asset.nodeId,
        nodeIdLength: asset.nodeId.length,
      });
      throw new Error(`Node not found: ${asset.nodeId}`);
    }

    const nodeDataTyped = nodeData as any;

    // 프로젝트가 사용자의 것인지 확인
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id' as any, nodeDataTyped.project_id as any)
      .eq('user_id' as any, user.id as any)
      .single();

    if (projectError || !projectData) {
      console.error('Project not found or access denied:', {
        projectId: nodeDataTyped.project_id,
        userId: user.id,
        error: projectError,
      });
      throw new Error('You do not have permission to modify this STAR asset.');
    }

    // 타임스탬프 검증 및 기본값 설정
    const createdAt = asset.createdAt && asset.createdAt > 0 ? asset.createdAt : Date.now();
    const updatedAt = asset.updatedAt && asset.updatedAt > 0 ? asset.updatedAt : Date.now();

    const assetData: any = {
      id: asset.id,
      node_id: asset.nodeId,
      title: asset.title,
      situation: asset.situation || null,
      task: asset.task || null,
      action: asset.action || null,
      result: asset.result || null,
      content: asset.content || null,
      company: asset.company || null,
      competency: asset.competency || null,
      tags: asset.tags || [],
      created_at: createdAt,
      updated_at: updatedAt,
    };

    const { error } = await supabase
      .from('star_assets')
      .upsert(assetData, { onConflict: 'id' });

    if (error) {
      // 에러 객체를 더 자세히 로깅
      const errorInfo: {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
        status?: number;
        allProperties?: string[];
        errorString?: string;
      } = {};
      
      // PostgrestError의 속성들을 직접 접근
      if (error && typeof error === 'object') {
        const err = error as { code?: string; message?: string; details?: string; hint?: string; status?: number };
        errorInfo.code = err.code;
        errorInfo.message = err.message;
        errorInfo.details = err.details;
        errorInfo.hint = err.hint;
        errorInfo.status = err.status;
        
        // 에러 객체의 모든 속성을 로깅
        try {
          errorInfo.allProperties = Object.keys(err);
          errorInfo.errorString = JSON.stringify(err, null, 2);
        } catch (e) {
          errorInfo.errorString = String(err);
        }
      } else {
        errorInfo.errorString = String(error);
      }

      // 403 에러인 경우 RLS 정책 문제로 안내
      if (errorInfo.status === 403 || errorInfo.code === '42501') {
        // 실제 에러 객체의 모든 속성을 로깅
        const fullError = error as { status?: number; code?: string; message?: string; details?: string; hint?: string };
        console.error('❌ RLS Policy Error (403 Forbidden):', {
          message: 'star_assets 테이블에 대한 INSERT/UPDATE 권한이 없습니다.',
          hint: 'Supabase 대시보드에서 star_assets 테이블의 RLS 정책을 확인하세요.',
          errorStatus: fullError.status,
          errorCode: fullError.code,
          errorMessage: fullError.message,
          errorDetails: fullError.details,
          errorHint: fullError.hint,
          errorInfo,
          assetData: {
            id: assetData.id,
            node_id: assetData.node_id,
            title: assetData.title,
          },
          // 에러 객체 전체를 문자열로 변환
          errorString: JSON.stringify(fullError, null, 2),
        });
      } else {
        console.error('Supabase error saving STAR asset:', {
          ...errorInfo,
          assetData: {
            id: assetData.id,
            node_id: assetData.node_id,
            title: assetData.title,
            created_at: assetData.created_at,
            updated_at: assetData.updated_at,
          },
        });
      }
      throw error;
    }

    return true;
  } catch (error) {
    // 에러를 더 자세히 로깅
    const errorInfo: any = {
      errorType: typeof error,
      errorString: String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
    };

    if (error && typeof error === 'object') {
      try {
        errorInfo.errorJson = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorInfo.errorJsonStringifyFailed = true;
      }
    }

    console.error('Failed to save STAR asset:', {
      ...errorInfo,
      asset: {
        id: asset.id,
        nodeId: asset.nodeId,
        title: asset.title,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        hasSituation: !!asset.situation,
        hasTask: !!asset.task,
        hasAction: !!asset.action,
        hasResult: !!asset.result,
        tagsCount: asset.tags?.length || 0,
      },
    });
    return false;
  }
}

export async function deleteSTARAsset(assetId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('star_assets').delete().eq('id' as any, assetId as any);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete STAR asset:', error);
    return false;
  }
}

// ==================== Gap Tags ====================

export async function getGapTags(userId: string): Promise<GapTag[]> {
  try {
    const { data, error } = await supabase
      .from('gap_tags')
      .select('*')
      .eq('user_id' as any, userId as any)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const gapTagsData = (data as any[]) || [];
    return gapTagsData.map((t: any) => ({
      id: t.id,
      label: t.label,
      category: t.category,
      source: t.source,
      questions: (t.questions as any) || [],
      createdAt: t.created_at,
      company_id: t.company_id || undefined,
      job_id: t.job_id || undefined,
      question_id: t.question_id || undefined,
    }));
  } catch (error) {
    console.error('Failed to get gap tags:', error);
    return [];
  }
}

export async function saveGapTag(tag: GapTag & { userId?: string }): Promise<boolean> {
  try {
    const userId = tag.userId || (await ensureUserExists());

    if (!userId) {
      console.error('Cannot save gap tag: No valid user ID provided');
      return false;
    }
    
    const tagData: any = {
      id: tag.id,
      user_id: userId,
      label: tag.label,
      category: tag.category,
      source: tag.source,
      questions: tag.questions || [],
      created_at: tag.createdAt,
      company_id: tag.company_id || null,
      job_id: tag.job_id || null,
      question_id: tag.question_id || null,
    };

    const { error } = await supabase
      .from('gap_tags')
      .upsert(tagData, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to save gap tag:', error);
    return false;
  }
}

export async function deleteGapTag(tagId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('gap_tags').delete().eq('id' as any, tagId as any);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete gap tag:', error);
    return false;
  }
}

// ==================== Shared Nodes ====================

export async function getSharedNodes(userId: string): Promise<SharedNodeData[]> {
  try {
    const { data, error } = await supabase
      .from('shared_nodes')
      .select('*')
      .eq('created_by' as any, userId as any)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // SharedNodeData는 node와 descendants, starAssets를 포함해야 하므로
    // 별도로 노드 정보를 로드해야 함
    const sharedNodes: SharedNodeData[] = [];
    
    const sharedNodesData = (data as any[]) || [];
    for (const s of sharedNodesData) {
      // 노드 정보 로드
      const { data: nodeData } = await supabase
        .from('nodes')
        .select('*')
        .eq('id' as any, (s as any).node_id as any)
        .single();
      
      if (!nodeData) continue;
      
      const nodeDataTyped = nodeData as any;
      
      const node: MindMapNode = {
        id: nodeDataTyped.id,
        label: nodeDataTyped.label,
        parentId: nodeDataTyped.parent_id,
        children: [],
        x: nodeDataTyped.x || 0,
        y: nodeDataTyped.y || 0,
        level: nodeDataTyped.level || 0,
        nodeType: (nodeDataTyped.node_type as any) || undefined,
        badgeType: (nodeDataTyped.badge_type as any) || undefined,
        customLabel: nodeDataTyped.custom_label || undefined,
        isShared: nodeDataTyped.is_shared || false,
        sharedLink: nodeDataTyped.shared_link || undefined,
        createdAt: nodeDataTyped.created_at,
        updatedAt: nodeDataTyped.updated_at,
      };
      
      // 모든 하위 노드들을 재귀적으로 로드
      // 먼저 프로젝트의 모든 노드를 가져옴
      const { data: allProjectNodes } = await supabase
        .from('nodes')
        .select('*')
        .eq('project_id' as any, (s as any).project_id as any);
      
      const allProjectNodesTyped = (allProjectNodes as any[]) || [];
      
      if (allProjectNodesTyped.length === 0) {
        sharedNodes.push({
          id: (s as any).id,
          nodeId: (s as any).node_id,
          projectId: (s as any).project_id,
          node,
          descendants: [],
          starAssets: [],
          includeSTAR: (s as any).include_star || false,
          createdAt: (s as any).created_at,
        });
        continue;
      }

      // 노드 맵 생성 (빠른 조회를 위해)
      const nodeMap = new Map<string, any>();
      allProjectNodesTyped.forEach((n: any) => {
        nodeMap.set(n.id, n);
      });

      // 재귀적으로 모든 하위 노드 가져오기
      const getDescendants = (parentId: string): MindMapNode[] => {
        const children = allProjectNodesTyped.filter((n: any) => n.parent_id === parentId);
        const descendants: MindMapNode[] = [];
        
        children.forEach((child: any) => {
          const childNode: MindMapNode = {
            id: child.id,
            label: child.label,
            parentId: child.parent_id,
            children: [],
            x: child.x || 0,
            y: child.y || 0,
            level: child.level || 0,
            nodeType: (child.node_type as any) || undefined,
            badgeType: (child.badge_type as any) || undefined,
            customLabel: child.custom_label || undefined,
            isShared: child.is_shared || false,
            sharedLink: child.shared_link || undefined,
            createdAt: child.created_at,
            updatedAt: child.updated_at,
          };
          descendants.push(childNode);
          // 재귀적으로 하위 노드들도 추가
          descendants.push(...getDescendants(child.id));
        });
        
        return descendants;
      };

      const descendants = getDescendants(node.id);
      
      // STAR 에셋 로드 (노드와 모든 하위 노드들의 에셋)
      const starAssets: STARAsset[] = [];
      if ((s as any).include_star) {
        // 노드와 모든 하위 노드의 ID 수집
        const allNodeIds = [node.id, ...descendants.map(d => d.id)];
        
        // 모든 관련 STAR 에셋 가져오기
        const { data: starData } = await supabase
          .from('star_assets')
          .select('*')
          .in('node_id' as any, allNodeIds as any);
        
        if (starData) {
          const starDataTyped = starData as any[];
          starAssets.push(...starDataTyped.map((a: any) => ({
            id: a.id,
            nodeId: a.node_id,
            title: a.title,
            situation: a.situation || '',
            task: a.task || '',
            action: a.action || '',
            result: a.result || '',
            content: a.content || '',
            company: a.company || undefined,
            competency: a.competency || undefined,
            tags: (a.tags as string[]) || [],
            createdAt: a.created_at,
            updatedAt: a.updated_at,
          })));
        }
      }
      
      // 공유한 사용자 정보 가져오기
      let createdByUser: { id: string; name: string; email?: string } | null = null;
      if ((s as any).created_by) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id' as any, (s as any).created_by as any)
          .maybeSingle();
        
        if (userData) {
          const userDataTyped = userData as any;
          createdByUser = {
            id: userDataTyped.id,
            name: userDataTyped.name,
            email: userDataTyped.email || undefined,
          };
        }
      }

      sharedNodes.push({
        id: (s as any).id,
        nodeId: (s as any).node_id,
        projectId: (s as any).project_id,
        node,
        descendants,
        starAssets,
        includeSTAR: (s as any).include_star || false,
        createdAt: (s as any).created_at,
        createdBy: (s as any).created_by || undefined,
        createdByUser: createdByUser || undefined,
      });
    }
    
    return sharedNodes;
  } catch (error) {
    console.error('Failed to get shared nodes:', error);
    return [];
  }
}

export async function saveSharedNode(sharedNode: SharedNodeData): Promise<boolean> {
  try {
    // getCurrentUserId를 안전하게 호출 (AbortError 무시)
    let createdBy: string | undefined;
    try {
      createdBy = await getCurrentUserId() || undefined;
    } catch (error) {
      // 공유 링크 컨텍스트에서는 인증이 없을 수 있으므로 무시
      createdBy = undefined;
    }

    const sharedData: any = {
      id: sharedNode.id,
      node_id: sharedNode.nodeId,
      project_id: sharedNode.projectId,
      include_star: sharedNode.includeSTAR || false,
      created_at: sharedNode.createdAt,
      created_by: createdBy,
    };

    const { error } = await supabase
      .from('shared_nodes')
      .upsert(sharedData, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to save shared node:', error);
    return false;
  }
}

// 공통 재시도 함수
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  context: string = 'unknown'
): Promise<T | null> {
  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      const result = await fn();
      if (result !== undefined) {
        return result;
      }
      
      // undefined인 경우 재시도
      if (retryCount < maxRetries) {
        console.log(`[data.ts] ${context}: 재시도 ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
        continue;
      }
      
      return null;
    } catch (err) {
      // AbortError인 경우 재시도
      if (err instanceof Error && err.name === 'AbortError') {
        if (retryCount < maxRetries) {
          console.log(`[data.ts] ${context}: AbortError 재시도 ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
          continue;
        }
        console.warn(`[data.ts] ${context}: AbortError 재시도 실패`);
        return null;
      }
      // 다른 에러는 즉시 반환
      throw err;
    }
  }
  return null;
}

// nodeId 형식 검증
function isValidNodeId(nodeId: string): boolean {
  if (!nodeId || typeof nodeId !== 'string') {
    return false;
  }
  
  const trimmed = nodeId.trim();
  
  // 빈 문자열 체크
  if (trimmed.length === 0) {
    return false;
  }
  
  // 최소/최대 길이 체크 (node_1234567890_abc123def 형식)
  if (trimmed.length < 10 || trimmed.length > 100) {
    return false;
  }
  
  // 허용 문자: 영문자, 숫자, 언더스코어, 하이픈
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return false;
  }
  
  return true;
}

export async function getSharedNodeByNodeId(nodeId: string): Promise<SharedNodeData | null> {
  try {
    // 유효한 nodeId인지 먼저 검증
    if (!isValidNodeId(nodeId)) {
      console.warn('[data.ts] getSharedNodeByNodeId: 유효하지 않은 nodeId 형식', { nodeId });
      return null;
    }

    const trimmedNodeId = nodeId.trim();
    console.log('[data.ts] getSharedNodeByNodeId: 시작', { nodeId: trimmedNodeId });

    // node_id로 공유 노드 찾기 (사용자 ID 없이) - 공개 접근 가능
    // AbortError는 컴포넌트 언마운트 등으로 인한 정상적인 중단이므로 즉시 반환
    let data: Database['public']['Tables']['shared_nodes']['Row'] | null = null;
    let error: any = null;
    
    try {
      const result = await supabase
        .from('shared_nodes')
        .select('*')
        .eq('node_id' as any, trimmedNodeId as any)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = result.data as Database['public']['Tables']['shared_nodes']['Row'] | null;
      error = result.error;
    } catch (err) {
      // AbortError는 조용히 무시 (컴포넌트 언마운트 등으로 인한 정상적인 중단)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[data.ts] getSharedNodeByNodeId: AbortError 무시 (정상적인 중단)', { nodeId: trimmedNodeId });
        return null;
      }
      throw err;
    }

    if (error) {
      // 찾을 수 없음 (정상적인 경우)
      if (error.code === 'PGRST116') {
        console.log('[data.ts] getSharedNodeByNodeId: 공유 노드를 찾을 수 없음', { nodeId: trimmedNodeId });
        return null;
      }
      // AbortError 체크 (에러 객체에서도 확인)
      if (error.message?.includes('aborted') || error.message?.includes('AbortError') || error.name === 'AbortError') {
        console.log('[data.ts] getSharedNodeByNodeId: AbortError 무시', { nodeId: trimmedNodeId });
        return null;
      }
      console.error('[data.ts] getSharedNodeByNodeId: 에러 발생', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorName: (error as any)?.name,
        nodeId: trimmedNodeId,
      });
      // 공유 페이지에서는 에러를 throw하지 않고 null 반환 (더 안전)
      return null;
    }

    if (!data) {
      console.log('[data.ts] getSharedNodeByNodeId: 데이터 없음', { nodeId: trimmedNodeId });
      return null;
    }

    const dataTyped = data as any;
    console.log('[data.ts] getSharedNodeByNodeId: 공유 노드 발견', {
      nodeId: trimmedNodeId,
      projectId: dataTyped.project_id,
    });

    // 병렬로 노드와 프로젝트 정보 로드 (성능 최적화)
    const [nodeResult, projectResult] = await Promise.all([
      supabase
        .from('nodes')
        .select('*')
        .eq('id' as any, dataTyped.node_id as any)
        .single(),
      supabase
        .from('projects')
        .select('id')
        .eq('id' as any, dataTyped.project_id as any)
        .single()
    ]);

    // 노드 데이터 검증
    if (nodeResult.error) {
      if (nodeResult.error.code === 'PGRST116') {
        console.log('[data.ts] getSharedNodeByNodeId: 노드를 찾을 수 없음', { nodeId: data.node_id });
        return null;
      }
      if (nodeResult.error.message?.includes('aborted') || nodeResult.error.message?.includes('AbortError')) {
        console.log('[data.ts] getSharedNodeByNodeId: 노드 조회 AbortError 무시', { nodeId: trimmedNodeId });
        return null;
      }
      console.warn('[data.ts] getSharedNodeByNodeId: 노드 조회 에러', {
        nodeId: data.node_id,
        error: nodeResult.error.message,
        errorCode: nodeResult.error.code,
      });
      return null;
    }

    const nodeData = nodeResult.data as any;
    if (!nodeData) {
      console.warn('[data.ts] getSharedNodeByNodeId: 노드 데이터 없음', { nodeId: dataTyped.node_id });
      return null;
    }

    // 프로젝트 데이터 검증
    if (projectResult.error) {
      if (projectResult.error.code === 'PGRST116') {
        console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트를 찾을 수 없음', {
          projectId: nodeData.project_id,
          nodeId: dataTyped.node_id
        });
        return null;
      }
      if (projectResult.error.message?.includes('aborted') || projectResult.error.message?.includes('AbortError')) {
        console.log('[data.ts] getSharedNodeByNodeId: 프로젝트 조회 AbortError 무시', { nodeId: trimmedNodeId });
        return null;
      }
      console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 조회 에러', {
        projectId: nodeData.project_id,
        nodeId: dataTyped.node_id,
        error: projectResult.error.message,
        errorCode: projectResult.error.code,
      });
      return null;
    }

    const projectData = projectResult.data as any;
    if (!projectData) {
      console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 데이터 없음', {
        projectId: nodeData.project_id,
        nodeId: dataTyped.node_id
      });
      return null;
    }
    
    const node: MindMapNode = {
      id: nodeData.id,
      label: nodeData.label,
      parentId: nodeData.parent_id,
      children: [],
      x: nodeData.x || 0,
      y: nodeData.y || 0,
      level: nodeData.level || 0,
      nodeType: (nodeData.node_type as any) || undefined,
      badgeType: (nodeData.badge_type as any) || undefined,
      customLabel: nodeData.custom_label || undefined,
      isShared: nodeData.is_shared || false,
      sharedLink: nodeData.shared_link || undefined,
      createdAt: nodeData.created_at,
      updatedAt: nodeData.updated_at,
    };
    
    // 프로젝트의 모든 노드를 가져와서 재귀적으로 하위 노드 찾기
    let allProjectNodes: any[] | null = null;
    let projectNodesLoadFailed = false;
    
    try {
      const result = await supabase
        .from('nodes')
        .select('*')
        .eq('project_id' as any, dataTyped.project_id as any);
      allProjectNodes = result.data || [];
      
      // 에러가 있으면 확인
      if (result.error) {
        projectNodesLoadFailed = true;
        // AbortError는 조용히 무시하고 빈 배열 반환
        if (result.error.message?.includes('aborted') || result.error.message?.includes('AbortError') || (result.error as any)?.name === 'AbortError') {
          console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 노드 조회 AbortError, 공유 노드만 반환', { 
            nodeId: trimmedNodeId,
            projectId: dataTyped.project_id 
          });
          allProjectNodes = [];
        } else {
          console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 노드 조회 에러, 공유 노드만 반환', {
            error: result.error.message,
            errorCode: result.error.code,
            nodeId: trimmedNodeId,
            projectId: data.project_id,
          });
          allProjectNodes = [];
        }
      } else {
        console.log('[data.ts] getSharedNodeByNodeId: 프로젝트 노드 로드 성공', {
          nodeId: trimmedNodeId,
          projectId: data.project_id,
          nodeCount: allProjectNodes.length,
        });
      }
    } catch (err) {
      projectNodesLoadFailed = true;
      // AbortError는 조용히 무시하고 빈 descendants 반환
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 노드 조회 AbortError, 공유 노드만 반환', { 
          nodeId: trimmedNodeId,
          projectId: data.project_id 
        });
        allProjectNodes = [];
      } else {
        console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 노드 조회 예외, 공유 노드만 반환', {
          error: err instanceof Error ? err.message : String(err),
          nodeId: trimmedNodeId,
          projectId: data.project_id,
        });
        allProjectNodes = [];
      }
    }
    
    // AbortError로 인해 null이면 빈 배열로 처리
    if (!allProjectNodes) {
      allProjectNodes = [];
      projectNodesLoadFailed = true;
    }

    // 재귀적으로 모든 하위 노드 가져오기
    const getDescendants = (parentId: string): MindMapNode[] => {
      if (!allProjectNodes || allProjectNodes.length === 0) {
        console.warn('[data.ts] getSharedNodeByNodeId: allProjectNodes가 비어있어 descendants를 찾을 수 없음', { 
          nodeId: trimmedNodeId,
          parentId 
        });
        return [];
      }
      
      const children = allProjectNodes.filter((n: any) => n.parent_id === parentId);
      const descendants: MindMapNode[] = [];
      
      children.forEach(child => {
        const childNode: MindMapNode = {
          id: child.id,
          label: child.label,
          parentId: child.parent_id,
          children: [],
          x: child.x || 0,
          y: child.y || 0,
          level: child.level || 0,
          nodeType: (child.node_type as any) || undefined,
          badgeType: (child.badge_type as any) || undefined,
          customLabel: child.custom_label || undefined,
          isShared: child.is_shared || false,
          sharedLink: child.shared_link || undefined,
          createdAt: child.created_at,
          updatedAt: child.updated_at,
        };
        descendants.push(childNode);
        // 재귀적으로 하위 노드들도 추가
        descendants.push(...getDescendants(child.id));
      });
      
      return descendants;
    };

    const descendants = getDescendants(node.id);
    
    // 프로젝트 노드 로드 실패 시 경고 로그
    if (projectNodesLoadFailed) {
      console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 노드 로드 실패로 descendants를 찾을 수 없음. 공유 노드만 반환합니다.', {
        nodeId: trimmedNodeId,
        projectId: data.project_id,
        descendantCount: descendants.length,
      });
    } else {
      console.log('[data.ts] getSharedNodeByNodeId: descendants 계산 완료', {
        nodeId: trimmedNodeId,
        allProjectNodesCount: allProjectNodes.length,
        descendantCount: descendants.length,
        descendantIds: descendants.map(d => d.id).slice(0, 5),
      });
    }

    // STAR 에셋 로드 (노드와 모든 하위 노드들의 에셋) - 재시도 로직 사용
    const starAssets: STARAsset[] = [];
    if (data.include_star) {
      const allNodeIds = [node.id, ...descendants.map(d => d.id)];
      
      const starData = await withRetry<Database['public']['Tables']['star_assets']['Row'][] | null>(
        async () => {
          const result = await supabase
            .from('star_assets')
            .select('*')
            .in('node_id' as any, allNodeIds as any);
          if (result.error) {
            return null;
          }
          return (result.data as unknown as Database['public']['Tables']['star_assets']['Row'][] | null) || null;
        },
        2,
        'getSharedNodeByNodeId: STAR 에셋 조회'
      );
      
      if (starData) {
        starAssets.push(...starData.map((a) => ({
          id: a.id,
          nodeId: a.node_id,
          title: a.title,
          situation: a.situation || '',
          task: a.task || '',
          action: a.action || '',
          result: a.result || '',
          content: a.content || '',
          company: a.company || undefined,
          competency: a.competency || undefined,
          tags: (a.tags as string[]) || [],
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        })));
      }
    }
    
    // 공유한 사용자 정보 가져오기 (실패해도 계속 진행, 재시도 로직 사용)
    let createdByUser: { id: string; name: string; email?: string } | null = null;
    if (data.created_by) {
      const createdById = data.created_by; // null 체크 후 변수에 저장
      const userData = await withRetry(
        async () => {
          const result = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id' as any, createdById as any)
            .maybeSingle();
          
          // 에러가 있으면 null 반환
          if (result.error) {
            return null;
          }
          
          // 데이터가 있으면 반환 (타입 단언 사용)
          const userData = result.data as { id: string; name: string; email?: string } | null;
          if (userData) {
            return {
              id: userData.id,
              name: userData.name,
              email: userData.email || undefined,
            };
          }
          
          // 데이터가 없으면 null 반환 (재시도 불필요)
          return null;
        },
        2,
        'getSharedNodeByNodeId: 사용자 정보 조회'
      );
      
      createdByUser = userData;
    }

    const result = {
      id: data.id,
      nodeId: data.node_id,
      projectId: data.project_id,
      node,
      descendants,
      starAssets,
      includeSTAR: data.include_star || false,
      createdAt: data.created_at,
      createdBy: data.created_by || undefined,
      createdByUser: createdByUser || undefined,
    };
    
    console.log('[data.ts] getSharedNodeByNodeId: 성공', {
      nodeId: trimmedNodeId,
      projectId: result.projectId,
      descendantCount: result.descendants.length,
    });
    
    return result;
  } catch (error) {
    // AbortError는 조용히 무시 (컴포넌트 언마운트 등으로 인한 정상적인 중단)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[data.ts] getSharedNodeByNodeId: AbortError 무시 (정상적인 중단)', { nodeId });
      return null;
    }
    console.error('[data.ts] getSharedNodeByNodeId: 전체 에러 발생', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      nodeId,
    });
    return null;
  }
}

export async function deleteSharedNode(sharedNodeId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('shared_nodes').delete().eq('id' as any, sharedNodeId as any);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete shared node:', error);
    return false;
  }
}

// ==================== Helper Functions ====================

/**
 * 현재 인증된 사용자를 users 테이블에 등록하거나 업데이트
 */
async function ensureUserExists(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.warn('User not authenticated:', error?.message);
      return null;
    }

    // users 테이블에 사용자가 이미 존재하는지 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id' as any, user.id as any)
      .maybeSingle();

    if (existingUser) {
      return user.id; // 이미 존재하면 ID 반환
    }

    // 사용자가 존재하지 않으면 users 테이블에 등록
    const provider = user.app_metadata?.provider ||
                     user.identities?.[0]?.provider ||
                     'email';

    // Provider User ID 추출
    let providerUserId = user.id; // 기본값은 Supabase user ID
    if (user.identities && user.identities.length > 0) {
      providerUserId = user.identities[0].id || user.id;
    }

    // 이름 추출
    let name = user.user_metadata?.full_name ||
               user.user_metadata?.name ||
               user.user_metadata?.kakao_account?.profile?.nickname ||
               user.user_metadata?.nickname ||
               user.email?.split('@')[0] ||
               '사용자';

    // 이메일 추출
    let email = user.email ||
                user.user_metadata?.kakao_account?.email ||
                user.user_metadata?.email ||
                '';

    const userData = {
      id: user.id,
      provider: provider,
      provider_user_id: providerUserId,
      name: name,
      email: email || null,
    };

    const { error: insertError } = await supabase
      .from('users')
      .upsert(userData as any, { onConflict: 'id' });

    if (insertError) {
      console.error('Failed to create user record:', insertError);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return null;
  }
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // AbortError는 조용히 무시 (공유 링크 등에서 인증 타임아웃 시)
      if (error.name === 'AbortError') {
        return null;
      }
      console.warn('Failed to get current user:', error.message);
      return null;
    }
    if (!user) {
      return null;
    }
    return user.id;
  } catch (error) {
    // AbortError는 조용히 무시 (컴포넌트 언마운트 등으로 인한 정상적인 중단)
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    console.warn('Error getting current user ID:', error);
    return null;
  }
}

// ==================== Active Editors ====================

export interface ActiveEditor {
  id: string;
  projectId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  lastSeen: number;
}

/**
 * 현재 사용자를 활성 편집자로 등록/업데이트
 */
export async function updateActiveEditor(projectId: string, userId: string, userName?: string, userEmail?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('active_editors')
      .upsert({
        project_id: projectId,
        user_id: userId,
        user_name: userName || null,
        user_email: userEmail || null,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'project_id,user_id',
      });

    if (error) {
      console.error('Failed to update active editor:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update active editor:', error);
    return false;
  }
}

/**
 * 프로젝트의 활성 편집자 목록 조회
 */
export async function getActiveEditors(projectId: string): Promise<ActiveEditor[]> {
  try {
    const { data, error } = await supabase
      .from('active_editors')
      .select('*')
      .eq('project_id' as any, projectId as any)
      .gte('last_seen' as any, new Date(Date.now() - 5 * 60 * 1000).toISOString() as any) // 5분 이내 활동만
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('Failed to get active editors:', error);
      return [];
    }

    if (!data) return [];

    return (data as any[]).map((e: any) => ({
      id: e.id,
      projectId: e.project_id,
      userId: e.user_id,
      userName: e.user_name || null,
      userEmail: e.user_email || null,
      lastSeen: new Date(e.last_seen).getTime(),
    }));
  } catch (error) {
    console.error('Failed to get active editors:', error);
    return [];
  }
}

/**
 * 현재 사용자를 활성 편집자에서 제거
 */
export async function removeActiveEditor(projectId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('active_editors')
      .delete()
      .eq('project_id' as any, projectId as any)
      .eq('user_id' as any, userId as any);

    if (error) {
      console.error('Failed to remove active editor:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to remove active editor:', error);
    return false;
  }
}
