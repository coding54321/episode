import { supabase } from './client';
import { MindMapProject, MindMapNode, STARAsset, GapTag, SharedNodeData, BadgeType } from '@/types';
import type { Database } from './types';

/**
 * Supabase 데이터 접근 함수
 * localStorage 대신 Supabase DB를 사용
 */

// ==================== Projects ====================

export async function getProjects(userId: string): Promise<MindMapProject[]> {
  try {
    // 프로젝트와 노드 개수를 함께 조회
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        nodes(count)
      `)
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false }) // 즐겨찾기 우선 정렬
      .order('updated_at', { ascending: false }); // 그 다음 최신순

    if (error) throw error;

    return (data || []).map((p: any) => {
      // Supabase의 count 결과는 배열 형태로 반환됨: [{ count: number }]
      const nodeCount = Array.isArray(p.nodes) && p.nodes.length > 0 
        ? p.nodes[0].count 
        : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        badges: (p.badges as BadgeType[]) || [],
        nodes: Array(nodeCount).fill(null).map((_, i) => ({ id: `placeholder_${i}` } as any)), // 개수만큼 플레이스홀더 생성 (하위 호환성)
        nodeCount, // 실제 노드 개수 (새 필드)
        createdAt: new Date(p.created_at || '').getTime(),
        updatedAt: new Date(p.updated_at || '').getTime(),
        isDefault: p.is_default || false,
        isFavorite: p.is_favorite || false,
      };
    });
  } catch (error) {
    console.error('Failed to get projects:', error);
    return [];
  }
}

export async function getProject(projectId: string, userId: string): Promise<MindMapProject | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
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

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      badges: (data.badges as BadgeType[]) || [],
      nodes,
      nodeCount: nodes.length, // 상세 조회 시에도 nodeCount 설정
      createdAt: new Date(data.created_at || '').getTime(),
      updatedAt: new Date(data.updated_at || '').getTime(),
      isDefault: data.is_default || false,
      isFavorite: data.is_favorite || false,
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

export async function createProject(
  project: Omit<MindMapProject, 'createdAt' | 'updatedAt'> & { userId?: string }
): Promise<MindMapProject | null> {
  try {
    // 사용자가 users 테이블에 존재하는지 확인하고 없으면 생성
    const userId = project.userId || (await ensureUserExists());

    if (!userId) {
      console.error('Cannot create project: No valid user ID provided');
      return null;
    }

    // id가 이미 존재하는지 확인 (중복 방지)
    if (project.id) {
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('id', project.id)
        .maybeSingle();

      if (existing) {
        console.warn('Project ID already exists:', project.id);
        return null;
      }
    }

    const insertData: any = {
      user_id: userId,
      name: project.name,
      description: project.description || null,
      badges: project.badges || [],
      is_default: project.isDefault || false,
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
      // 409 충돌 에러 처리
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.warn('Project creation conflict (duplicate ID):', error.message);
        return null;
      }
      throw error;
    }

    // 노드 저장 (생성된 프로젝트의 실제 ID 사용)
    const createdProjectId = data.id;
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

    return {
      ...project,
      id: createdProjectId, // DB에서 생성된 실제 ID 사용
      createdAt: new Date(data.created_at || '').getTime(),
      updatedAt: new Date(data.updated_at || '').getTime(),
      isFavorite: data.is_favorite || false,
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

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

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
    await supabase.from('nodes').delete().eq('project_id', projectId);

    // 프로젝트 삭제
    const { error } = await supabase.from('projects').delete().eq('id', projectId);

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
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const nodes = (data || []).map((n) => ({
      id: n.id,
      label: n.label,
      parentId: n.parent_id,
      children: [] as string[], // children은 아래에서 계산
      x: n.x || 0,
      y: n.y || 0,
      level: n.level || 0,
      nodeType: (n.node_type as any) || undefined,
      badgeType: (n.badge_type as any) || undefined,
      customLabel: n.custom_label || undefined,
      isShared: n.is_shared || false,
      sharedLink: n.shared_link || undefined,
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

    console.log('[data.ts] getNodes: 노드 로드 완료', {
      projectId,
      nodeCount: nodes.length,
      nodesWithChildren: nodes.filter(n => n.children.length > 0).length,
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
  updates: Partial<Pick<MindMapNode, 'label' | 'x' | 'y' | 'isShared' | 'sharedLink' | 'customLabel' | 'parentId' | 'children' | 'level' | 'nodeType' | 'badgeType'>>
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

    const { error } = await supabase
      .from('nodes')
      .update(updateData)
      .eq('id', nodeId)
      .eq('project_id', projectId);

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
      .eq('id', nodeId)
      .eq('project_id', projectId);

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
      const { error } = await supabase.from('nodes').delete().eq('project_id', projectId);
      if (error) {
        console.error('[data.ts] saveNodes: 노드 삭제 실패', { error, projectId });
        return false;
      }
      console.log('[data.ts] saveNodes: 모든 노드 삭제 완료', { projectId });
      return true;
    }

    // 부모-자식 관계를 고려하여 노드를 계층별로 정렬
    const sortedNodes = sortNodesByHierarchy(nodes);

    // 저장할 노드들의 모든 parentId 수집 (재귀적으로 모든 조상 노드 포함)
    const nodeIdsInArray = new Set(nodes.map(n => n.id));
    let allParentIds = new Set<string>();
    
    // 초기 parentId 수집
    nodes.forEach(node => {
      if (node.parentId && !nodeIdsInArray.has(node.parentId)) {
        allParentIds.add(node.parentId);
      }
    });

    // DB에서 누락된 부모 노드들 조회하여 포함 (재귀적으로 모든 조상 포함)
    const nodesToSave = [...nodes];
    let hasMoreParents = allParentIds.size > 0;
    const fetchedParentIds = new Set<string>();
    
    // 모든 조상 노드를 포함할 때까지 반복
    while (hasMoreParents) {
      const missingParentIds = Array.from(allParentIds).filter(id => !fetchedParentIds.has(id));
      
      if (missingParentIds.length === 0) {
        break;
      }
      
      // DB에서 누락된 부모 노드들 조회
      const { data: missingParents, error: fetchError } = await supabase
        .from('nodes')
        .select('*')
        .eq('project_id', projectId)
        .in('id', missingParentIds);

      if (fetchError || !missingParents || missingParents.length === 0) {
        break;
      }

      // 조회한 노드들을 추가
      const parentNodes: MindMapNode[] = missingParents.map((n: any) => ({
        id: n.id,
        label: n.label,
        parentId: n.parent_id,
        children: [],
        x: n.x || 0,
        y: n.y || 0,
        level: n.level || 0,
        nodeType: (n.node_type as any) || undefined,
        badgeType: (n.badge_type as any) || undefined,
        customLabel: n.custom_label || undefined,
        isShared: n.is_shared || false,
        sharedLink: n.shared_link || undefined,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      }));

      nodesToSave.push(...parentNodes);
      
      // 조회한 노드들의 parentId도 수집 (재귀적으로)
      const newParentIds = new Set<string>();
      parentNodes.forEach(node => {
        fetchedParentIds.add(node.id);
        if (node.parentId && !nodeIdsInArray.has(node.parentId) && !fetchedParentIds.has(node.parentId)) {
          newParentIds.add(node.parentId);
        }
      });
      
      allParentIds = newParentIds;
      hasMoreParents = newParentIds.size > 0;
    }

    // 부모 노드 포함하여 다시 계층별로 정렬
    const sortedNodesWithParents = sortNodesByHierarchy(nodesToSave);

    // 노드를 계층별로 저장 (부모부터 자식 순으로)
    for (let levelIndex = 0; levelIndex < sortedNodesWithParents.length; levelIndex++) {
      const levelNodes = sortedNodesWithParents[levelIndex];
      const nodesToUpsert = levelNodes.map((node) => {
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
        created_at: createdAt || nowTimestamp,
        updated_at: updatedAt || nowTimestamp,
      };

        return nodeData;
      });

      // 각 레벨의 노드들을 upsert
      console.log(`[data.ts] saveNodes: 레벨 ${levelIndex} 노드 저장 시도`, {
        levelIndex,
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
        console.error(`[data.ts] saveNodes: 레벨 ${levelIndex} 저장 실패`, {
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
            levelNodes: levelNodes.map(n => ({ id: n.id, parentId: n.parentId }))
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
                  .eq('project_id', projectId)
                  .in('id', Array.from(missingParentIds));
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
                .upsert(parentNodesToUpsert, {
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
    }

    // 프로젝트에 속하지 않는 노드 삭제 (삭제된 노드 처리)
    const nodeIds = nodes.map(n => n.id);
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('id, parent_id')
      .eq('project_id', projectId);

    if (existingNodes) {
      const existingNodeIds = existingNodes.map(n => n.id);
      const nodesToDeleteIds = existingNodeIds.filter(id => !nodeIds.includes(id));

      if (nodesToDeleteIds.length > 0) {
        // 삭제할 노드들을 자식부터 부모 순으로 정렬
        const nodesToDeleteData = existingNodes.filter(n => nodesToDeleteIds.includes(n.id));
        const sortedDeleteNodes = sortNodesByHierarchy(
          nodesToDeleteData.map(n => ({
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
            .in('id', levelNodeIds);

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
      .eq('project_id', projectId);

    if (verifyError) {
      console.error('[data.ts] saveNodes: 저장 검증 실패', { error: verifyError, projectId });
    } else {
      console.log('[data.ts] saveNodes: 저장 검증 완료', {
        projectId,
        expectedCount: nodes.length,
        actualCount: savedNodes?.length || 0,
        savedNodeIds: savedNodes?.map(n => n.id).slice(0, 5),
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
        errorCode: (error as any)?.code,
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

// ==================== STAR Assets ====================

export async function getSTARAssets(userId: string): Promise<STARAsset[]> {
  try {
    // 사용자의 프로젝트에 속한 노드들의 STAR 에셋만 가져오기
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    if (!projects || projects.length === 0) return [];

    const projectIds = projects.map((p) => p.id);

    const { data: nodes } = await supabase
      .from('nodes')
      .select('id')
      .in('project_id', projectIds);

    if (!nodes || nodes.length === 0) return [];

    const nodeIds = nodes.map((n) => n.id);

    const { data, error } = await supabase
      .from('star_assets')
      .select('*')
      .in('node_id', nodeIds);

    if (error) throw error;

    return (data || []).map((a) => ({
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
      .eq('id', assetId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST301') {
        return null;
      }
      console.error('Failed to get STAR asset by id:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      nodeId: data.node_id,
      title: data.title,
      situation: data.situation || '',
      task: data.task || '',
      action: data.action || '',
      result: data.result || '',
      content: data.content || '',
      company: data.company || undefined,
      competency: data.competency || undefined,
      tags: (data.tags as string[]) || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
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
      .eq('node_id', nodeId.trim())
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

    return {
      id: data.id,
      nodeId: data.node_id,
      title: data.title,
      situation: data.situation || '',
      task: data.task || '',
      action: data.action || '',
      result: data.result || '',
      content: data.content || '',
      company: data.company || undefined,
      competency: data.competency || undefined,
      tags: (data.tags as string[]) || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
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
      .eq('id', asset.nodeId.trim())
      .maybeSingle(); // .single() 대신 .maybeSingle() 사용

    if (nodeError) {
      console.error('Error fetching node:', {
        nodeId: asset.nodeId,
        error: nodeError,
        errorCode: (nodeError as any)?.code,
        errorMessage: (nodeError as any)?.message,
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

    // 프로젝트가 사용자의 것인지 확인
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', nodeData.project_id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !projectData) {
      console.error('Project not found or access denied:', {
        projectId: nodeData.project_id,
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
      const errorInfo: any = {};
      
      // PostgrestError의 속성들을 직접 접근
      if (error && typeof error === 'object') {
        const err = error as any;
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
        const fullError = error as any;
        console.error('❌ RLS Policy Error (403 Forbidden):', {
          message: 'star_assets 테이블에 대한 INSERT/UPDATE 권한이 없습니다.',
          hint: 'Supabase 대시보드에서 star_assets 테이블의 RLS 정책을 확인하세요.',
          errorStatus: fullError?.status,
          errorCode: fullError?.code,
          errorMessage: fullError?.message,
          errorDetails: fullError?.details,
          errorHint: fullError?.hint,
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
    const { error } = await supabase.from('star_assets').delete().eq('id', assetId);

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
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((t) => ({
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
    const { error } = await supabase.from('gap_tags').delete().eq('id', tagId);

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
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // SharedNodeData는 node와 descendants, starAssets를 포함해야 하므로
    // 별도로 노드 정보를 로드해야 함
    const sharedNodes: SharedNodeData[] = [];
    
    for (const s of data || []) {
      // 노드 정보 로드
      const { data: nodeData } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', s.node_id)
        .single();
      
      if (!nodeData) continue;
      
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
      
      // 모든 하위 노드들을 재귀적으로 로드
      // 먼저 프로젝트의 모든 노드를 가져옴
      const { data: allProjectNodes } = await supabase
        .from('nodes')
        .select('*')
        .eq('project_id', s.project_id);
      
      if (!allProjectNodes) {
        sharedNodes.push({
          id: s.id,
          nodeId: s.node_id,
          projectId: s.project_id,
          node,
          descendants: [],
          starAssets: [],
          includeSTAR: s.include_star || false,
          createdAt: s.created_at,
        });
        continue;
      }

      // 노드 맵 생성 (빠른 조회를 위해)
      const nodeMap = new Map<string, any>();
      allProjectNodes.forEach(n => {
        nodeMap.set(n.id, n);
      });

      // 재귀적으로 모든 하위 노드 가져오기
      const getDescendants = (parentId: string): MindMapNode[] => {
        const children = allProjectNodes.filter(n => n.parent_id === parentId);
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
      
      // STAR 에셋 로드 (노드와 모든 하위 노드들의 에셋)
      const starAssets: STARAsset[] = [];
      if (s.include_star) {
        // 노드와 모든 하위 노드의 ID 수집
        const allNodeIds = [node.id, ...descendants.map(d => d.id)];
        
        // 모든 관련 STAR 에셋 가져오기
        const { data: starData } = await supabase
          .from('star_assets')
          .select('*')
          .in('node_id', allNodeIds);
        
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
      
      // 공유한 사용자 정보 가져오기
      let createdByUser: { id: string; name: string; email?: string } | null = null;
      if (s.created_by) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', s.created_by)
          .maybeSingle();
        
        if (userData) {
          createdByUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email || undefined,
          };
        }
      }

      sharedNodes.push({
        id: s.id,
        nodeId: s.node_id,
        projectId: s.project_id,
        node,
        descendants,
        starAssets,
        includeSTAR: s.include_star || false,
        createdAt: s.created_at,
        createdBy: s.created_by || undefined,
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
    let data, error;
    
    try {
      const result = await supabase
        .from('shared_nodes')
        .select('*')
        .eq('node_id', trimmedNodeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = result.data;
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

    console.log('[data.ts] getSharedNodeByNodeId: 공유 노드 발견', {
      nodeId: trimmedNodeId,
      projectId: data.project_id,
    });

    // 병렬로 노드와 프로젝트 정보 로드 (성능 최적화)
    const [nodeResult, projectResult] = await Promise.all([
      supabase
        .from('nodes')
        .select('*')
        .eq('id', data.node_id)
        .single(),
      supabase
        .from('projects')
        .select('id')
        .eq('id', data.project_id)
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

    const nodeData = nodeResult.data;
    if (!nodeData) {
      console.warn('[data.ts] getSharedNodeByNodeId: 노드 데이터 없음', { nodeId: data.node_id });
      return null;
    }

    // 프로젝트 데이터 검증
    if (projectResult.error) {
      if (projectResult.error.code === 'PGRST116') {
        console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트를 찾을 수 없음', {
          projectId: nodeData.project_id,
          nodeId: data.node_id
        });
        return null;
      }
      if (projectResult.error.message?.includes('aborted') || projectResult.error.message?.includes('AbortError')) {
        console.log('[data.ts] getSharedNodeByNodeId: 프로젝트 조회 AbortError 무시', { nodeId: trimmedNodeId });
        return null;
      }
      console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 조회 에러', {
        projectId: nodeData.project_id,
        nodeId: data.node_id,
        error: projectResult.error.message,
        errorCode: projectResult.error.code,
      });
      return null;
    }

    const projectData = projectResult.data;
    if (!projectData) {
      console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 데이터 없음', {
        projectId: nodeData.project_id,
        nodeId: data.node_id
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
        .eq('project_id', data.project_id);
      allProjectNodes = result.data || [];
      
      // 에러가 있으면 확인
      if (result.error) {
        projectNodesLoadFailed = true;
        // AbortError는 조용히 무시하고 빈 배열 반환
        if (result.error.message?.includes('aborted') || result.error.message?.includes('AbortError') || (result.error as any)?.name === 'AbortError') {
          console.warn('[data.ts] getSharedNodeByNodeId: 프로젝트 노드 조회 AbortError, 공유 노드만 반환', { 
            nodeId: trimmedNodeId,
            projectId: data.project_id 
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
      
      const starData = await withRetry(
        async () => {
          const result = await supabase
            .from('star_assets')
            .select('*')
            .in('node_id', allNodeIds);
          return result.data || null;
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
            .eq('id', createdById)
            .maybeSingle();
          
          if (result.data) {
            return {
              id: result.data.id,
              name: result.data.name,
              email: result.data.email || undefined,
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
    const { error } = await supabase.from('shared_nodes').delete().eq('id', sharedNodeId);

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
      .eq('id', user.id)
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

    const { error: insertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        provider: provider,
        provider_user_id: providerUserId,
        name: name,
        email: email,
      }, { onConflict: 'id' });

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

