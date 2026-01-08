import { useState, useEffect, useRef } from 'react';
import { Share2, ZoomIn, ZoomOut, Home, Plus } from 'lucide-react';
import { MindMapNode, GapTag, ChatMessage, STARAsset } from '../types';
import { User } from '../App';
import AIChatbot from './AIChatbot';
import Header from './Header';
import { generateNodeTableEntries, saveNodeTableEntries } from '../utils/nodeTableUtils';

interface SharedMindMapViewProps {
  nodeId: string;
  onBackToHome: () => void;
  isEmbedded?: boolean;
  renderTabBar?: () => React.ReactNode;
  user?: User;
  onNavigateToDashboard?: () => void;
  onNavigateToHome?: () => void;
  onLogout?: () => void;
}

export default function SharedMindMapView({
  nodeId,
  onBackToHome,
  isEmbedded = false,
  renderTabBar,
  user,
  onNavigateToDashboard,
  onNavigateToHome,
  onLogout
}: SharedMindMapViewProps) {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [centerNode, setCenterNode] = useState<MindMapNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [gapTags, setGapTags] = useState<GapTag[]>([]);
  const [spacePressed, setSpacePressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Store original positions to prevent storage pollution
  const originalPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const positionOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try {
      // Load all nodes from localStorage
      const savedNodes = localStorage.getItem('episode_mindmap');
      if (!savedNodes) {
        setError('마인드맵을 찾을 수 없습니다.');
        return;
      }

      const allNodes: MindMapNode[] = JSON.parse(savedNodes);
      
      if (!Array.isArray(allNodes)) {
        setError('마인드맵 데이터 형식이 올바르지 않습니다.');
        return;
      }
      
      // Find the shared node
      const sharedNode = allNodes.find(n => n.id === nodeId);
      
      if (!sharedNode) {
        setError('노드를 찾을 수 없습니다.');
        return;
      }

      // Get all descendant nodes
      const descendants = getDescendants(nodeId, allNodes);
      const sharedNodes = [sharedNode, ...descendants];

      // Store original positions before repositioning
      originalPositions.current.clear();
      sharedNodes.forEach(node => {
        originalPositions.current.set(node.id, { x: node.x, y: node.y });
      });

      // Calculate position offset
      positionOffset.current = {
        x: 500 - sharedNode.x,
        y: 300 - sharedNode.y
      };

      // Recalculate positions to center the shared node
      const repositionedNodes = repositionNodes(sharedNodes, sharedNode);
      
      setNodes(repositionedNodes);
      setCenterNode(repositionedNodes[0]);

      // Center the view on the shared node
      setTimeout(() => {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          // Center the node at (500, 300) in screen coordinates
          setPan({
            x: (rect.width / 2) - (500 * zoom),
            y: (rect.height / 2) - (300 * zoom)
          });
        }
      }, 100);

      // Listen for storage changes from other tabs
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'episode_mindmap' && e.newValue) {
          try {
            const updatedNodes: MindMapNode[] = JSON.parse(e.newValue);
            if (!Array.isArray(updatedNodes)) return;
            
            const updatedSharedNode = updatedNodes.find(n => n.id === nodeId);
            
            if (updatedSharedNode) {
              const updatedDescendants = getDescendants(nodeId, updatedNodes);
              const updatedSharedNodes = [updatedSharedNode, ...updatedDescendants];
              
              // Update original positions
              updatedSharedNodes.forEach(node => {
                originalPositions.current.set(node.id, { x: node.x, y: node.y });
              });
              
              const repositioned = repositionNodes(updatedSharedNodes, updatedSharedNode);
              setNodes(repositioned);
              setCenterNode(repositioned[0]);
            }
          } catch (error) {
            console.error('Failed to handle storage change:', error);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    } catch (error) {
      console.error('Failed to load shared mindmap:', error);
      setError('마인드맵을 불러오는 중 오류가 발생했습니다.');
    }
  }, [nodeId]);

  const getDescendants = (parentId: string, allNodes: MindMapNode[]): MindMapNode[] => {
    const descendants: MindMapNode[] = [];
    const children = allNodes.filter(n => n.parentId === parentId);
    
    children.forEach(child => {
      descendants.push(child);
      descendants.push(...getDescendants(child.id, allNodes));
    });
    
    return descendants;
  };

  const repositionNodes = (nodesToReposition: MindMapNode[], root: MindMapNode): MindMapNode[] => {
    // Create a copy and set root at center
    const newNodes = nodesToReposition.map(n => ({ ...n }));
    const rootNode = newNodes.find(n => n.id === root.id);
    
    if (!rootNode) return newNodes;

    // Calculate offset to center the root
    const offsetX = 500 - rootNode.x;
    const offsetY = 300 - rootNode.y;

    // Apply offset to all nodes
    return newNodes.map(n => ({
      ...n,
      x: n.x + offsetX,
      y: n.y + offsetY,
      parentId: n.id === root.id ? null : n.parentId // Root has no parent in this view
    }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.altKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomSpeed = 0.001;
      const newZoom = Math.min(Math.max(zoom + delta * zoomSpeed, 0.25), 3);
      setZoom(newZoom);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (draggedNodeId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        // Convert screen coordinates to canvas coordinates
        const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

        // Calculate new node position by subtracting the offset
        const newX = mouseCanvasX - dragOffset.x;
        const newY = mouseCanvasY - dragOffset.y;

        const updatedNodes = nodes.map(n =>
          n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n
        );
        setNodes(updatedNodes);
      }
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeId) {
      // Update original position for the dragged node (only locally, don't sync to storage)
      const draggedNode = nodes.find(n => n.id === draggedNodeId);
      if (draggedNode) {
        const offsetX = positionOffset.current.x;
        const offsetY = positionOffset.current.y;
        originalPositions.current.set(draggedNodeId, {
          x: draggedNode.x - offsetX,
          y: draggedNode.y - offsetY
        });
      }
      // Don't sync position changes to storage - only keep them local
      setDraggedNodeId(null);
    }
    setIsPanning(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.25));
  };

  // CRUD Operations that sync with localStorage
  const syncToStorage = (updatedLocalNodes: MindMapNode[]) => {
    // Get all nodes from storage
    const savedNodes = localStorage.getItem('episode_mindmap');
    if (!savedNodes) return;

    const allNodes: MindMapNode[] = JSON.parse(savedNodes);

    // Update the nodes in global storage using original positions
    const updatedAllNodes = allNodes.map(globalNode => {
      const localNode = updatedLocalNodes.find(ln => ln.id === globalNode.id);
      if (localNode) {
        const originalPos = originalPositions.current.get(localNode.id);
        if (originalPos) {
          // Use stored original position for existing nodes
          return {
            ...localNode,
            x: originalPos.x,
            y: originalPos.y,
            parentId: localNode.id === nodeId ? globalNode.parentId : localNode.parentId
          };
        } else {
          // For nodes that were moved in this view, calculate relative position
          const offsetX = positionOffset.current.x;
          const offsetY = positionOffset.current.y;
          return {
            ...localNode,
            x: localNode.x - offsetX,
            y: localNode.y - offsetY,
            parentId: localNode.id === nodeId ? globalNode.parentId : localNode.parentId
          };
        }
      }
      return globalNode;
    });

    // Add new nodes (those created in this view)
    const newNodes = updatedLocalNodes.filter(ln => 
      !allNodes.some(gn => gn.id === ln.id)
    ).map(ln => {
      const offsetX = positionOffset.current.x;
      const offsetY = positionOffset.current.y;
      return {
        ...ln,
        x: ln.x - offsetX,
        y: ln.y - offsetY,
        parentId: ln.id === nodeId ? allNodes.find(n => n.id === nodeId)?.parentId || null : ln.parentId
      };
    });

    const finalNodes = [...updatedAllNodes, ...newNodes];
    localStorage.setItem('episode_mindmap', JSON.stringify(finalNodes));

    // Update node table entries
    try {
      const savedAssets = localStorage.getItem('episode_assets');
      const starAssets: STARAsset[] = savedAssets ? JSON.parse(savedAssets) : [];
      const tableEntries = generateNodeTableEntries(finalNodes, starAssets);
      saveNodeTableEntries(tableEntries);
    } catch (error) {
      console.error('Failed to update node table entries:', error);
    }

    // Trigger storage event manually for same tab
    window.dispatchEvent(new Event('localStorageUpdate'));
  };

  const addChildNode = (parentId: string, direction: 'right' | 'left' | 'top' | 'bottom' = 'right') => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    let x = parent.x;
    let y = parent.y;
    
    switch (direction) {
      case 'right':
        x = parent.x + 180;
        y = parent.y + (parent.children.length * 60);
        break;
      case 'left':
        x = parent.x - 180;
        y = parent.y + (parent.children.length * 60);
        break;
      case 'top':
        x = parent.x + (parent.children.length * 60);
        y = parent.y - 100;
        break;
      case 'bottom':
        x = parent.x + (parent.children.length * 60);
        y = parent.y + 100;
        break;
    }

    const newNode: MindMapNode = {
      id: `node_${Date.now()}`,
      label: '새 노드',
      parentId,
      children: [],
      x,
      y,
      level: parent.level + 1,
      isShared: true,
      sharedLink: parent.sharedLink,
    };

    const updatedNodes = nodes.map(n =>
      n.id === parentId
        ? { ...n, children: [...n.children, newNode.id] }
        : n
    ).concat(newNode);

    setNodes(updatedNodes);
    syncToStorage(updatedNodes);
    
    setEditingNodeId(newNode.id);
    setEditingValue('새 노드');
  };

  const deleteNode = (nodeIdToDelete: string) => {
    if (nodeIdToDelete === nodeId) return; // Can't delete root of shared view

    const node = nodes.find(n => n.id === nodeIdToDelete);
    if (!node) return;

    const isDescendant = (ancestorId: string, targetId: string, nodeList: MindMapNode[]): boolean => {
      const n = nodeList.find(nd => nd.id === targetId);
      if (!n || !n.parentId) return false;
      if (n.parentId === ancestorId) return true;
      return isDescendant(ancestorId, n.parentId, nodeList);
    };

    const updatedNodes = nodes
      .filter(n => n.id !== nodeIdToDelete && !isDescendant(nodeIdToDelete, n.id, nodes))
      .map(n => n.id === node.parentId
        ? { ...n, children: n.children.filter(id => id !== nodeIdToDelete) }
        : n
      );

    setNodes(updatedNodes);
    syncToStorage(updatedNodes);

    if (selectedNode?.id === nodeIdToDelete) {
      setSelectedNode(null);
    }
  };

  const handleNodeClick = (node: MindMapNode) => {
    setSelectedNode(node);
  };

  const handleNodeDoubleClick = (node: MindMapNode, index: number) => {
    if (index === 0) return; // Don't edit root node (first node)
    setEditingNodeId(node.id);
    setEditingValue(node.label);
  };

  const handleEditComplete = () => {
    if (editingNodeId && editingValue.trim()) {
      const updatedNodes = nodes.map(n =>
        n.id === editingNodeId ? { ...n, label: editingValue.trim() } : n
      );
      setNodes(updatedNodes);
      syncToStorage(updatedNodes);
    }
    setEditingNodeId(null);
    setEditingValue('');
  };

  const handleNodeDragStart = (nodeIdToDrag: string, e: React.MouseEvent) => {
    if (editingNodeId || isPanning) return;

    const node = nodes.find(n => n.id === nodeIdToDrag);
    if (!node) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNodeId(nodeIdToDrag);

    // Calculate the offset from mouse position to node center
    // Convert screen coordinates to canvas coordinates
    const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

    setDragOffset({
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y
    });

    e.stopPropagation();
  };

  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBackToHome}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      {isEmbedded && user ? (
        <>
          <Header
            user={user}
            showDiagnosisButton={false}
            onNavigateToDashboard={onNavigateToDashboard}
            onNavigateToHome={onNavigateToHome}
            onNavigateToMindmap={() => {/* 현재 페이지이므로 아무 동작 없음 */}}
            onLogout={onLogout}
            showMenu={showMenu}
            onToggleMenu={setShowMenu}
            currentPage="mindmap"
          />

          {/* Tab Bar */}
          {renderTabBar && renderTabBar()}
        </>
      ) : !isEmbedded ? (
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg text-gray-900">공유된 경험 맵</h1>
              <p className="text-xs text-gray-500">
                {centerNode?.label} 및 관련 경험들
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToHome}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">홈으로</span>
            </button>
          </div>
        </header>
      ) : null}

      {/* Canvas Container - relative positioning for sidebar */}
      <div className="flex-1 relative overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`absolute inset-0 ${
            isPanning ? 'cursor-grabbing' :
            draggedNodeId ? 'cursor-move' :
            'cursor-grab'
          }`}
          onClick={() => setShowMenu(false)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
        >
          <div 
            className="absolute inset-0 min-w-[1200px] min-h-[800px]"
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'top left',
              transition: 'transform 0.1s ease-out',
            }}
          >
            {/* Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {nodes.map(node => {
                if (!node.parentId) return null;
                const parent = nodes.find(n => n.id === node.parentId);
                if (!parent) return null;

                return (
                  <line
                    key={`line_${node.id}`}
                    x1={parent.x}
                    y1={parent.y}
                    x2={node.x}
                    y2={node.y}
                    stroke="#86EFAC"
                    strokeWidth="3"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node, index) => (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {editingNodeId === node.id ? (
                  <div
                    className={`
                      group relative px-4 py-2 rounded-lg cursor-move transition-all min-w-[120px] text-center pointer-events-auto
                      ${index === 0
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white text-lg shadow-lg'
                        : 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 text-gray-900 shadow-md hover:border-green-500'
                      }
                      ring-4 ring-green-200
                    `}
                  >
                    {/* Shared indicator */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Share2 className="w-3 h-3 text-white" />
                    </div>

                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={handleEditComplete}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditComplete()}
                      autoFocus
                      className="bg-transparent border-none outline-none text-center w-full text-sm text-inherit placeholder-gray-400"
                      style={{ minWidth: '80px' }}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => handleNodeClick(node)}
                    onDoubleClick={() => handleNodeDoubleClick(node, index)}
                    onMouseDown={(e) => handleNodeDragStart(node.id, e)}
                    className={`
                      group relative px-4 py-2 rounded-lg cursor-move transition-all min-w-[120px] text-center pointer-events-auto
                      ${index === 0
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white text-lg shadow-lg'
                        : 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 text-gray-900 shadow-md hover:border-green-500'
                      }
                      ${selectedNode?.id === node.id ? 'ring-4 ring-green-200' : ''}
                      ${draggedNodeId === node.id ? 'opacity-70' : ''}
                    `}
                  >
                    <p className="text-sm">{node.label}</p>

                    {/* Shared indicator */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Share2 className="w-3 h-3 text-white" />
                    </div>

                    {/* Directional Add Buttons */}
                    {index !== 0 && (
                      <>
                        {/* Right */}
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addChildNode(node.id, 'right');
                          }}
                          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-6 h-6 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-auto"
                          title="오른쪽에 노드 추가"
                        >
                          <Plus className="w-3 h-3 pointer-events-none" />
                        </button>

                        {/* Left */}
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addChildNode(node.id, 'left');
                          }}
                          className="absolute right-full top-1/2 -translate-y-1/2 mr-2 w-6 h-6 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-auto"
                          title="왼쪽에 노드 추가"
                        >
                          <Plus className="w-3 h-3 pointer-events-none" />
                        </button>

                        {/* Top */}
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addChildNode(node.id, 'top');
                          }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-6 h-6 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-auto"
                          title="위에 노드 추가"
                        >
                          <Plus className="w-3 h-3 pointer-events-none" />
                        </button>

                        {/* Bottom */}
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addChildNode(node.id, 'bottom');
                          }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-6 h-6 bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-auto"
                          title="아래에 노드 추가"
                        >
                          <Plus className="w-3 h-3 pointer-events-none" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full hover:bg-red-700 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-auto"
                          title="삭제"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Chatbot - Only show in embedded mode */}
          {isEmbedded && (
            <AIChatbot
              selectedNode={selectedNode}
              onNodeUpdate={(nodeIdToUpdate, content) => {
                // Could update node content if needed
              }}
              onSTARReady={() => {
                // STAR editor functionality can be added later if needed
              }}
              gapTags={gapTags}
              onTagRemove={(tagId) => setGapTags(prev => prev.filter(t => t.id !== tagId))}
              onDragStart={() => {
                // Drag functionality can be added later if needed
              }}
            />
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20">
        <button
          onClick={handleZoomIn}
          className="px-3 py-2 hover:bg-gray-50 border-b border-gray-200 transition-colors"
          title="확대"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <div className="px-3 py-2 border-b border-gray-200">
          <p className="text-xs text-gray-600">{Math.round(zoom * 100)}%</p>
        </div>
        <button
          onClick={handleZoomOut}
          className="px-3 py-2 hover:bg-gray-50 transition-colors"
          title="축소"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Instructions - Only show when not embedded */}
      {!isEmbedded && (
        <div className="fixed bottom-6 left-6 bg-white rounded-xl shadow-xl border-2 border-green-100 p-4 max-w-xs z-20">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-4 h-4 text-green-600" />
            <h3 className="text-sm text-gray-900">공유된 경험 맵</h3>
          </div>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 노드 드래그로 위치 이동</li>
            <li>• 노드 더블클릭으로 수정</li>
            <li>• + 버튼으로 하위 노드 추가</li>
            <li>• Alt + 스크롤로 확대/축소</li>
            <li>• 변경사항이 전체 맵과 자동 동기화됩니다</li>
          </ul>
        </div>
      )}
    </div>
  );
}