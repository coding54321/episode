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
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      badges: (p.badges as BadgeType[]) || [],
      nodes: [], // 노드는 별도로 로드
      createdAt: new Date(p.created_at || '').getTime(),
      updatedAt: new Date(p.updated_at || '').getTime(),
      isDefault: p.is_default || false,
    }));
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
      .single();

    if (error) throw error;
    if (!data) return null;

    // 노드 로드
    const nodes = await getNodes(projectId);

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      badges: (data.badges as BadgeType[]) || [],
      nodes,
      createdAt: new Date(data.created_at || '').getTime(),
      updatedAt: new Date(data.updated_at || '').getTime(),
      isDefault: data.is_default || false,
    };
  } catch (error) {
    console.error('Failed to get project:', error);
    return null;
  }
}

export async function createProject(
  project: Omit<MindMapProject, 'createdAt' | 'updatedAt'> & { userId?: string }
): Promise<MindMapProject | null> {
  try {
    const userId = project.userId || (await getCurrentUserId());
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        id: project.id,
        user_id: userId,
        name: project.name,
        description: project.description || null,
        badges: project.badges,
        is_default: project.isDefault || false,
      })
      .select()
      .single();

    if (error) throw error;

    // 노드 저장
    if (project.nodes && project.nodes.length > 0) {
      await saveNodes(project.id, project.nodes);
    }

    return {
      ...project,
      createdAt: new Date(data.created_at || '').getTime(),
      updatedAt: new Date(data.updated_at || '').getTime(),
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

    return (data || []).map((n) => ({
      id: n.id,
      label: n.label,
      parentId: n.parent_id,
      children: [], // children은 클라이언트에서 계산
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
  } catch (error) {
    console.error('Failed to get nodes:', error);
    return [];
  }
}

export async function saveNodes(projectId: string, nodes: MindMapNode[]): Promise<boolean> {
  try {
    if (nodes.length === 0) {
      // 노드가 없으면 해당 프로젝트의 모든 노드 삭제
      await supabase.from('nodes').delete().eq('project_id', projectId);
      return true;
    }

    // upsert를 사용하여 기존 노드는 업데이트하고 새 노드는 삽입
    const nodesToUpsert = nodes.map((node) => ({
      id: node.id,
      project_id: projectId,
      parent_id: node.parentId,
      label: node.label,
      level: node.level,
      node_type: node.nodeType || null,
      badge_type: node.badgeType || null,
      custom_label: node.customLabel || null,
      x: node.x,
      y: node.y,
      is_shared: node.isShared || false,
      shared_link: node.sharedLink || null,
      created_at: node.createdAt,
      updated_at: node.updatedAt,
    }));

    // upsert 사용 (기존 노드는 업데이트, 새 노드는 삽입)
    const { error: upsertError } = await supabase
      .from('nodes')
      .upsert(nodesToUpsert, { onConflict: 'id' });

    if (upsertError) throw upsertError;

    // 프로젝트에 속하지 않는 노드 삭제 (삭제된 노드 처리)
    const nodeIds = nodes.map(n => n.id);
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('id')
      .eq('project_id', projectId);

    if (existingNodes) {
      const existingNodeIds = existingNodes.map(n => n.id);
      const nodesToDelete = existingNodeIds.filter(id => !nodeIds.includes(id));

      if (nodesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('nodes')
          .delete()
          .in('id', nodesToDelete);

        if (deleteError) {
          // 삭제 에러는 무시 (RLS 정책 문제일 수 있음)
          console.error('Failed to delete orphaned nodes:', deleteError);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to save nodes:', error);
    return false;
  }
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
      .eq('node_id', nodeId)
      .maybeSingle(); // .single() 대신 .maybeSingle() 사용 (없을 때 에러 대신 null 반환)

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

    // 노드가 사용자의 프로젝트에 속하는지 확인
    const { data: nodeData, error: nodeError } = await supabase
      .from('nodes')
      .select('id, project_id')
      .eq('id', asset.nodeId)
      .single();

    if (nodeError || !nodeData) {
      console.error('Node not found:', {
        nodeId: asset.nodeId,
        error: nodeError,
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

    // 데이터 검증 로깅
    console.log('Saving STAR asset:', {
      id: assetData.id,
      node_id: assetData.node_id,
      title: assetData.title,
      userId: user.id,
      created_at: assetData.created_at,
      updated_at: assetData.updated_at,
      hasTags: Array.isArray(assetData.tags),
      tagsLength: assetData.tags?.length || 0,
    });

    const { error, data } = await supabase
      .from('star_assets')
      .upsert(assetData, { onConflict: 'id' })
      .select();

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

    console.log('Successfully saved STAR asset:', data);
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
    const userId = tag.userId || (await getCurrentUserId());
    
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
    const sharedData: any = {
      id: sharedNode.id,
      node_id: sharedNode.nodeId,
      project_id: sharedNode.projectId,
      include_star: sharedNode.includeSTAR || false,
      created_at: sharedNode.createdAt,
      created_by: await getCurrentUserId(),
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

export async function getSharedNodeByNodeId(nodeId: string): Promise<SharedNodeData | null> {
  try {
    // node_id로 공유 노드 찾기 (사용자 ID 없이)
    const { data, error } = await supabase
      .from('shared_nodes')
      .select('*')
      .eq('node_id', nodeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 찾을 수 없음
      }
      throw error;
    }

    if (!data) return null;

    // 노드 정보 로드
    const { data: nodeData } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', data.node_id)
      .single();
    
    if (!nodeData) return null;
    
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
    const { data: allProjectNodes } = await supabase
      .from('nodes')
      .select('*')
      .eq('project_id', data.project_id);
    
    if (!allProjectNodes) {
      return {
        id: data.id,
        nodeId: data.node_id,
        projectId: data.project_id,
        node,
        descendants: [],
        starAssets: [],
        includeSTAR: data.include_star || false,
        createdAt: data.created_at,
      };
    }

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
    if (data.include_star) {
      const allNodeIds = [node.id, ...descendants.map(d => d.id)];
      
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
    if (data.created_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', data.created_by)
        .maybeSingle();
      
      if (userData) {
        createdByUser = {
          id: userData.id,
          name: userData.name,
          email: userData.email || undefined,
        };
      }
    }

    return {
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
  } catch (error) {
    console.error('Failed to get shared node by nodeId:', error);
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

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return user.id;
}

