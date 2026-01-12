'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MindMapNode, SharedNodeData, STARAsset, NodeType } from '@/types';
import { getSharedNodeByNodeId, updateNode, insertNode, deleteNode } from '@/lib/supabase/data';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, ArrowLeft, Share2, Calendar, Eye, FileText, X, Lock, Edit } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import MindMapCanvas from '@/components/mindmap/MindMapCanvas';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;
  const { user, loading: authLoading } = useUnifiedAuth();
  const [sharedData, setSharedData] = useState<SharedNodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<STARAsset | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // nodeId 검증
      if (!nodeId || typeof nodeId !== 'string' || nodeId.trim().length === 0) {
        if (isMounted) {
          setIsLoading(false);
          setSharedData(null);
        }
        return;
      }

      const trimmedNodeId = nodeId.trim();
      
      try {
        // 공유 노드 데이터 로드
        // getSharedNodeByNodeId 내부에서 이미 재시도 로직이 있으므로 여기서는 한 번만 호출
        const data = await getSharedNodeByNodeId(trimmedNodeId);
        
        if (!isMounted) {
          return;
        }
        
        if (!data) {
          if (isMounted) {
            setIsLoading(false);
            setSharedData(null);
          }
          return;
        }

        setSharedData(data);

        // children 배열 재구성
        const allNodes = [data.node, ...data.descendants];

        // 각 노드의 children 배열 재구성
        allNodes.forEach(node => {
          const children = allNodes
            .filter(n => n.parentId === node.id)
            .map(n => n.id);
          node.children = children;
        });

        setNodes(allNodes);

        // 로그인 상태는 별도 useEffect에서 처리 (authLoading 완료 후)
        // 여기서는 일단 읽기 전용으로 설정
        setIsReadOnly(true);
      } catch (error) {
        // AbortError는 조용히 무시 (컴포넌트 언마운트 등으로 인한 정상적인 중단)
        if (error instanceof Error && error.name === 'AbortError') {
          if (isMounted) {
            setIsLoading(false);
            setSharedData(null);
          }
          return;
        }
        
        // 다른 에러는 로깅
        console.error('[share/page] loadData: 공유 노드 데이터 로드 실패', {
          error: error instanceof Error ? error.message : String(error),
          nodeId: nodeId.trim(),
        });
        
        if (isMounted) {
          setSharedData(null);
        }
      } finally {
        // 에러 발생 여부와 관계없이 로딩 상태 해제
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();

    return () => {
      isMounted = false;
    };
  }, [nodeId]); // user와 authLoading 의존성 제거 - useEffect 내부에서 직접 체크

  // 인증 상태가 완료된 후 읽기 전용/편집 모드 명확하게 설정
  useEffect(() => {
    // 공유 데이터가 없으면 읽기 전용 유지
    if (!sharedData) {
      setIsReadOnly(true);
      return;
    }

    // 인증 로딩이 완료되지 않았으면 읽기 전용 유지 (안전하게)
    if (authLoading) {
      setIsReadOnly(true);
      return;
    }

    // 인증 로딩이 완료되었고 공유 데이터가 있으면
    // user가 있으면 편집 가능, 없으면 읽기 전용
    setIsReadOnly(!user);
  }, [user, authLoading, sharedData]);


  // 로그인 핸들러
  const handleLogin = () => {
    router.push(`/login?returnUrl=${encodeURIComponent(`/share/${nodeId}`)}`);
  };

  // 노드 변경 핸들러 (드래그 등 위치 변경 시)
  const handleNodesChange = async (newNodes: MindMapNode[]) => {
    if (isReadOnly || !sharedData) return;

    // React 상태 즉시 업데이트
    setNodes(newNodes);

    // 공유 페이지에서는 변경된 노드만 개별 업데이트 (다른 노드 삭제 방지)
    try {
      const previousNodes = nodes;
      const previousNodeMap = new Map(previousNodes.map(n => [n.id, n]));
      
      // 변경된 노드만 찾아서 개별 업데이트
      for (const newNode of newNodes) {
        const oldNode = previousNodeMap.get(newNode.id);
        
        if (!oldNode) {
          // 새 노드는 insertNode로 처리하지 않음 (handleNodeAddChild에서 처리)
          continue;
        }
        
        // 위치 변경 감지 (x, y 변경)
        if (oldNode.x !== newNode.x || oldNode.y !== newNode.y) {
          await updateNode(sharedData.projectId, newNode.id, {
            x: newNode.x,
            y: newNode.y,
          });
        }
        
        // children 변경 감지 (부모 노드의 children 배열 변경)
        const oldChildrenSet = new Set(oldNode.children);
        const newChildrenSet = new Set(newNode.children);
        if (oldChildrenSet.size !== newChildrenSet.size || 
            ![...oldChildrenSet].every(id => newChildrenSet.has(id))) {
          // children 변경은 부모 노드의 children 배열이 변경된 것이므로
          // 실제로는 부모 노드의 children는 DB에 저장되지 않으므로
          // 별도 처리 불필요 (children는 parentId로 계산됨)
        }
      }
    } catch (error) {
      console.error('[share/page] handleNodesChange: 노드 업데이트 실패', error);
    }
  };

  // 노드 편집 (단일 노드 업데이트 최적화)
  const handleNodeEdit = async (nodeId: string, label: string) => {
    if (!sharedData) return;
    
    // 단일 노드 라벨 변경은 updateNode 함수 사용 (성능 최적화)
    const success = await updateNode(sharedData.projectId, nodeId, { label });
    
    if (success) {
      // 로컬 상태만 업데이트
      setNodes(prev => {
        const updated = [...prev];
        const index = updated.findIndex(n => n.id === nodeId);
        if (index !== -1) {
          updated[index] = { ...updated[index], label, updatedAt: Date.now() };
        }
        return updated;
      });
    } else {
      // 실패 시 에러 로깅만 (공유 페이지에서는 전체 저장으로 폴백하지 않음)
      console.error('[share/page] handleNodeEdit: 단일 노드 업데이트 실패', {
        projectId: sharedData.projectId,
        nodeId,
        label,
      });
    }
  };

  // 노드 추가
  const handleNodeAddChild = async (parentId: string, direction: 'right' | 'left' | 'top' | 'bottom' = 'right') => {
    if (!sharedData) return;
    
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    let x = parent.x;
    let y = parent.y;
    const offset = 180;

    switch (direction) {
      case 'right':
        x = parent.x + offset;
        y = parent.y + (parent.children.length * 60) - (parent.children.length * 30);
        break;
      case 'left':
        x = parent.x - offset;
        y = parent.y + (parent.children.length * 60) - (parent.children.length * 30);
        break;
      case 'top':
        x = parent.x + (parent.children.length * 60) - (parent.children.length * 30);
        y = parent.y - 120;
        break;
      case 'bottom':
        x = parent.x + (parent.children.length * 60) - (parent.children.length * 30);
        y = parent.y + 120;
        break;
    }

    const newLevel = parent.level + 1;
    let nodeType: NodeType = 'detail';
    let defaultLabel = '새 노드';

    if (newLevel === 0) {
      nodeType = 'center';
      defaultLabel = '중심';
    } else if (newLevel === 1) {
      nodeType = 'category';
      defaultLabel = '대분류';
    } else if (newLevel === 2) {
      nodeType = 'experience';
      defaultLabel = '경험';
    } else if (newLevel === 3) {
      nodeType = 'episode';
      defaultLabel = '에피소드';
    } else if (newLevel >= 4) {
      nodeType = 'detail';
      defaultLabel = '새 노드';
    }

    const newChild: MindMapNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      label: defaultLabel,
      parentId: parentId,
      children: [],
      x,
      y,
      level: newLevel,
      nodeType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // DB에 새 노드 추가
    try {
      const success = await insertNode(sharedData.projectId, newChild);
      if (!success) {
        console.error('[share/page] handleNodeAddChild: 노드 추가 실패');
        return;
      }
    } catch (error) {
      console.error('[share/page] handleNodeAddChild: 노드 추가 중 에러', error);
      return;
    }

    // 로컬 상태 업데이트
    const updatedNodes = nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newChild.id] };
      }
      return node;
    });

    updatedNodes.push(newChild);
    setNodes(updatedNodes);
    setEditingNodeId(newChild.id);
  };

  // 노드 삭제
  const handleNodeDelete = async (nodeId: string) => {
    if (!sharedData) return;
    
    const deleteNodeAndChildren = (id: string): string[] => {
      const targetNode = nodes.find(n => n.id === id);
      if (!targetNode) return [];
      const children = targetNode.children.flatMap(childId => deleteNodeAndChildren(childId));
      return [id, ...children];
    };

    const idsToDelete = deleteNodeAndChildren(nodeId);

    // DB에서 노드들 삭제 (하위 노드부터 역순으로)
    try {
      // 하위 노드부터 삭제 (외래키 제약 조건을 위해)
      const sortedIdsToDelete = [...idsToDelete].reverse();
      
      for (const id of sortedIdsToDelete) {
        const success = await deleteNode(sharedData.projectId, id);
        if (!success) {
          console.warn(`[share/page] handleNodeDelete: 노드 삭제 실패 (계속 진행)`, { nodeId: id });
        }
      }
    } catch (error) {
      console.error('[share/page] handleNodeDelete: 노드 삭제 중 에러', error);
      return;
    }

    // 로컬 상태 업데이트
    const updatedNodes = nodes
      .filter(n => !idsToDelete.includes(n.id))
      .map(n => {
        if (n.children.some(childId => idsToDelete.includes(childId))) {
          return {
            ...n,
            children: n.children.filter(id => !idsToDelete.includes(id)),
            updatedAt: Date.now()
          };
        }
        return n;
      });

    setNodes(updatedNodes);

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!sharedData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md border border-gray-200 rounded-[16px] shadow-sm">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">공유된 노드를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">
            공유 링크가 만료되었거나 잘못된 링크일 수 있습니다.
          </p>
          <Link href="/">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-[12px] h-12 px-6 font-semibold shadow-sm">
              <Home className="h-4 w-4 mr-2" />
              홈으로 돌아가기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-white flex flex-col">
        {/* 헤더 */}
        <header className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-[12px]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                돌아가기
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Share2 className="h-4 w-4 text-gray-700" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  공유된 경험 맵
                </h1>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {sharedData.createdByUser && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-gray-700">{sharedData.createdByUser.name}</span>
                      <span>님이 공유</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(sharedData.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!user ? (
                <Button
                  onClick={handleLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] h-10 px-4 font-semibold shadow-sm flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  로그인하여 편집하기
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name}님
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 마인드맵 캔버스 */}
          <div className="flex-1 relative">
            {/* 읽기 전용 오버레이 */}
            {isReadOnly && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[16px] p-6 shadow-lg border border-gray-200 pointer-events-auto max-w-md mx-4"
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Lock className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                    읽기 전용 모드
                  </h3>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    이 노드는 조회만 가능합니다.
                    <br />
                    편집하려면 로그인이 필요합니다.
                  </p>
                  <Button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] h-12 font-semibold shadow-sm"
                  >
                    로그인하여 편집하기
                  </Button>
                </motion.div>
              </div>
            )}

            {/* MindMapCanvas */}
            <div ref={canvasRef} className="w-full h-full relative">
              <MindMapCanvas
                nodes={nodes}
                onNodesChange={handleNodesChange}
                selectedNodeId={selectedNodeId}
                editingNodeId={editingNodeId}
                onNodeSelect={(nodeId) => {
                  setSelectedNodeId(nodeId);
                }}
                onNodeEdit={handleNodeEdit}
                onNodeAddChild={handleNodeAddChild}
                onNodeDelete={handleNodeDelete}
                onNodeShare={() => {}} // 공유 노드에서는 공유 기능 비활성화
                onStartEdit={setEditingNodeId}
                onEndEdit={() => setEditingNodeId(null)}
                projectId={sharedData.projectId}
                centerNodeId={sharedData.node.id}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>

          {/* 사이드바 - 정보 & STAR 에셋 */}
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* 노드 정보 */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-[12px] flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-700">
                        {sharedData.node.label.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">{sharedData.node.label}</h2>
                      <p className="text-sm text-gray-500">공유된 경험</p>
                    </div>
                  </div>

                  {/* 공유한 사용자 정보 */}
                  {sharedData.createdByUser && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-[12px] border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {sharedData.createdByUser.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {sharedData.createdByUser.name}님이 공유
                          </p>
                          {sharedData.createdByUser.email && (
                            <p className="text-xs text-gray-500">{sharedData.createdByUser.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-[12px] p-4 space-y-3 border border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">하위 노드</span>
                      <span className="font-semibold text-gray-900">{nodes.length - 1}개</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">레벨</span>
                      <span className="font-semibold text-gray-900">{sharedData.node.level}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">공유일</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(sharedData.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* STAR 에셋 */}
                {sharedData.includeSTAR && sharedData.starAssets.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-gray-700" />
                      </div>
                      STAR 작성 내용
                    </h3>
                    <div className="space-y-3">
                      {sharedData.starAssets.map(asset => (
                        <div
                          key={asset.id}
                          className="bg-white border border-gray-200 rounded-[12px] p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => setSelectedAsset(asset)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm">{asset.title}</h4>
                            <Eye className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          </div>
                          {asset.company && (
                            <p className="text-xs text-gray-600 mb-2">{asset.company}</p>
                          )}
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {asset.content || '작성 중...'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                {!user ? (
                  <div className="bg-blue-50 rounded-[12px] p-6 text-center border border-blue-200">
                    <div className="flex items-center justify-center mb-3">
                      <Lock className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="font-bold text-blue-900">읽기 전용 모드</h3>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      편집하려면 로그인이 필요합니다
                    </p>
                    <Button
                      onClick={handleLogin}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] h-12 font-semibold shadow-sm"
                    >
                      로그인하여 편집하기
                    </Button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-[12px] p-6 text-center border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-2">편집 모드</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      노드를 편집하고 실시간으로 협업할 수 있습니다
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>편집 가능</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* STAR 에셋 상세 모달 */}
        {selectedAsset && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAsset(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedAsset.title}</h2>
                  {selectedAsset.company && (
                    <p className="text-sm text-blue-600">{selectedAsset.company}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-6">
                {selectedAsset.situation && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">상황 (Situation)</h3>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                      {selectedAsset.situation}
                    </p>
                  </div>
                )}

                {selectedAsset.task && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">과제 (Task)</h3>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                      {selectedAsset.task}
                    </p>
                  </div>
                )}

                {selectedAsset.action && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">행동 (Action)</h3>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                      {selectedAsset.action}
                    </p>
                  </div>
                )}

                {selectedAsset.result && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-2">결과 (Result)</h3>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                      {selectedAsset.result}
                    </p>
                  </div>
                )}

                {selectedAsset.content && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">최종 작성 내용</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-[12px] p-4 border border-gray-100">
                      {selectedAsset.content}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
