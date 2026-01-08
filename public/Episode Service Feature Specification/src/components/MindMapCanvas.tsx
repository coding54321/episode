import { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Share2, ExternalLink } from 'lucide-react';
import { User, Badge } from '../App';
import { MindMapNode, GapTag, ChatMessage, STARAsset, NodeTableEntry } from '../types';
import GapDiagnosisModal from './GapDiagnosisModal';
import AIChatbot from './AIChatbot';
import STAREditor from './STAREditor';
import ShareModal from './ShareModal';
import Header from './Header';
import { generateNodeTableEntries, saveNodeTableEntries, loadNodeTableEntries, updateNodeTableEntry } from '../utils/nodeTableUtils';

interface MindMapCanvasProps {
  user: User;
  badges: Badge[];
  onNavigateToDashboard: () => void;
  onNavigateToHome?: () => void;
  onLogout: () => void;
  onOpenNodeInNewTab?: (nodeId: string, nodeLabel: string) => void;
  renderTabBar?: () => React.ReactNode;
}

export default function MindMapCanvas({ user, badges, onNavigateToDashboard, onNavigateToHome, onLogout, onOpenNodeInNewTab, renderTabBar }: MindMapCanvasProps) {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [gapTags, setGapTags] = useState<GapTag[]>([]);
  const [draggedTag, setDraggedTag] = useState<GapTag | null>(null);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
  const [isSTAREditorOpen, setIsSTAREditorOpen] = useState(false);
  const [starMessages, setStarMessages] = useState<ChatMessage[]>([]);
  const [starNodeId, setStarNodeId] = useState('');
  const [starNodeLabel, setStarNodeLabel] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [tagDropPrompt, setTagDropPrompt] = useState<{ nodeId: string; tag: GapTag } | null>(null);
  const [tagDropInput, setTagDropInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareNode, setShareNode] = useState<MindMapNode | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedNodes = localStorage.getItem('episode_mindmap');
      if (savedNodes) {
        const parsedNodes = JSON.parse(savedNodes);
        if (Array.isArray(parsedNodes) && parsedNodes.length > 0) {
          setNodes(parsedNodes);
        } else {
          initializeMindMap();
        }
      } else {
        initializeMindMap();
      }

      const savedTags = localStorage.getItem('episode_gap_tags');
      if (savedTags) {
        const parsedTags = JSON.parse(savedTags);
        if (Array.isArray(parsedTags)) {
          setGapTags(parsedTags);
        }
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
      initializeMindMap();
    }

    // Keyboard event listeners for space key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !editingNodeId) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    // Listen for storage changes from other tabs (shared views)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'episode_mindmap' && e.newValue) {
        setNodes(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [editingNodeId]);

  useEffect(() => {
    if (nodes.length > 0) {
      try {
        localStorage.setItem('episode_mindmap', JSON.stringify(nodes));
      } catch (error) {
        console.error('Failed to save mindmap:', error);
      }
    }
  }, [nodes]);

  useEffect(() => {
    try {
      localStorage.setItem('episode_gap_tags', JSON.stringify(gapTags));
    } catch (error) {
      console.error('Failed to save gap tags:', error);
    }
  }, [gapTags]);

  // 노드 변경 시 테이블 엔트리 업데이트
  useEffect(() => {
    if (nodes.length > 0) {
      try {
        // STAR 에셋 로드
        const savedAssets = localStorage.getItem('episode_assets');
        const starAssets: STARAsset[] = savedAssets ? JSON.parse(savedAssets) : [];

        // 테이블 엔트리 생성/업데이트
        const tableEntries = generateNodeTableEntries(nodes, starAssets);
        saveNodeTableEntries(tableEntries);
      } catch (error) {
        console.error('Failed to update node table entries:', error);
      }
    }
  }, [nodes]);

  const initializeMindMap = () => {
    const centerNode: MindMapNode = {
      id: 'center',
      label: user.name || '나',
      parentId: null,
      children: [],
      x: 500,
      y: 300,
      level: 0,
    };

    const badgeNodes: MindMapNode[] = badges.map((badge, index) => {
      const angle = (index / badges.length) * 2 * Math.PI;
      const radius = 200;
      return {
        id: `badge_${badge.id}`,
        label: badge.label,
        parentId: 'center',
        children: [],
        x: 500 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        level: 1,
      };
    });

    centerNode.children = badgeNodes.map(n => n.id);
    setNodes([centerNode, ...badgeNodes]);
  };

  const addChildNode = (parentId: string, direction: 'right' | 'left' | 'top' | 'bottom' = 'right') => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) {
      console.warn('Parent node not found:', parentId);
      return;
    }

    // Calculate position based on direction and existing children
    let x = parent.x;
    let y = parent.y;
    const offset = 30; // Reduce spacing between nodes

    switch (direction) {
      case 'right':
        x = parent.x + 200;
        y = parent.y + (parent.children.length * offset) - (parent.children.length * offset / 2);
        break;
      case 'left':
        x = parent.x - 200;
        y = parent.y + (parent.children.length * offset) - (parent.children.length * offset / 2);
        break;
      case 'top':
        x = parent.x + (parent.children.length * offset) - (parent.children.length * offset / 2);
        y = parent.y - 120;
        break;
      case 'bottom':
        x = parent.x + (parent.children.length * offset) - (parent.children.length * offset / 2);
        y = parent.y + 120;
        break;
    }

    const newNode: MindMapNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: '새 노드',
      parentId,
      children: [],
      x,
      y,
      level: parent.level + 1,
      // Inherit shared status from parent
      isShared: parent.isShared,
      sharedLink: parent.sharedLink,
    };

    setNodes(prev => prev.map(n =>
      n.id === parentId
        ? { ...n, children: [...n.children, newNode.id] }
        : n
    ).concat(newNode));

    // Automatically start editing the new node
    setTimeout(() => {
      setEditingNodeId(newNode.id);
      setEditingValue('새 노드');
    }, 100);
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'center' || nodeId.startsWith('badge_')) return;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Remove from parent's children
    setNodes(prev => prev
      .filter(n => n.id !== nodeId && !isDescendant(nodeId, n.id, prev))
      .map(n => n.id === node.parentId
        ? { ...n, children: n.children.filter(id => id !== nodeId) }
        : n
      )
    );

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const isDescendant = (ancestorId: string, nodeId: string, nodeList: MindMapNode[]): boolean => {
    const node = nodeList.find(n => n.id === nodeId);
    if (!node || !node.parentId) return false;
    if (node.parentId === ancestorId) return true;
    return isDescendant(ancestorId, node.parentId, nodeList);
  };

  const handleNodeClick = (node: MindMapNode) => {
    setSelectedNode(node);
  };

  const handleNodeDoubleClick = (node: MindMapNode) => {
    if (node.id === 'center') return;
    setEditingNodeId(node.id);
    setEditingValue(node.label);
  };

  const handleEditComplete = () => {
    if (editingNodeId) {
      if (editingValue.trim()) {
        setNodes(prev => prev.map(n =>
          n.id === editingNodeId ? { ...n, label: editingValue.trim() } : n
        ));
      } else {
        // If empty, delete the node
        deleteNode(editingNodeId);
      }
    }
    setEditingNodeId(null);
    setEditingValue('');
  };

  const handleDiagnosisComplete = (tags: GapTag[]) => {
    setGapTags(prev => [...prev, ...tags]);
  };

  const handleTagDragStart = (tag: GapTag) => {
    setDraggedTag(tag);
  };

  const handleNodeDrop = (nodeId: string) => {
    if (!draggedTag) return;

    // Show prompt to ask about related experience
    setTagDropPrompt({ nodeId, tag: draggedTag });
    setDraggedTag(null);
  };

  const handleTagPromptSubmit = () => {
    if (!tagDropPrompt || !tagDropInput.trim()) return;

    const { nodeId, tag } = tagDropPrompt;
    const parent = nodes.find(n => n.id === nodeId);
    if (!parent) return;

    // Create new child node with user's input
    const newNode: MindMapNode = {
      id: `node_${Date.now()}`,
      label: tagDropInput.trim(),
      parentId: nodeId,
      children: [],
      x: parent.x + 180,
      y: parent.y + (parent.children.length * 60),
      level: parent.level + 1,
    };

    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, children: [...n.children, newNode.id] }
        : n
    ).concat(newNode));

    // Remove tag from sidebar
    setGapTags(prev => prev.filter(t => t.id !== tag.id));
    
    // Clear prompt state
    setTagDropPrompt(null);
    setTagDropInput('');

    // Select the new node to start chatting
    setSelectedNode(newNode);
  };

  const handleTagPromptSkip = () => {
    if (!tagDropPrompt) return;

    // Remove tag without creating node
    setGapTags(prev => prev.filter(t => t.id !== tagDropPrompt.tag.id));
    setTagDropPrompt(null);
    setTagDropInput('');
  };

  const handleSTARReady = (nodeId: string, messages: ChatMessage[]) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setStarNodeId(nodeId);
    setStarNodeLabel(node.label);
    setStarMessages(messages);
    setIsSTAREditorOpen(true);
  };

  const handleSTARSave = (asset: Omit<STARAsset, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const savedAssets = localStorage.getItem('episode_assets');
      const assets: STARAsset[] = savedAssets ? JSON.parse(savedAssets) : [];

      const newAsset: STARAsset = {
        ...asset,
        id: `asset_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      assets.push(newAsset);
      localStorage.setItem('episode_assets', JSON.stringify(assets));
      setIsSTAREditorOpen(false);

      // Show success message (using a better method than alert)
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMsg.textContent = 'STAR 에셋이 저장되었습니다! 대시보드에서 확인하세요.';
      document.body.appendChild(successMsg);
      setTimeout(() => {
        document.body.removeChild(successMsg);
      }, 3000);
    } catch (error) {
      console.error('Failed to save STAR asset:', error);
      alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    // Don't drag center node, while editing, or panning
    if (nodeId === 'center' || editingNodeId || spacePressed) return;

    // Check if the click is on a button or icon
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.tagName === 'SVG' ||
        target.tagName === 'path' ||
        target.classList.contains('lucide') ||
        target.getAttribute('data-lucide')) {
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Only start drag on left mouse button
    if (e.button !== 0) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggedNodeId(nodeId);

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

        setNodes(prev => prev.map(n =>
          n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Alt + Scroll for zoom
    if (e.altKey) {
      e.preventDefault();
      
      const delta = -e.deltaY;
      const zoomSpeed = 0.001;
      const newZoom = Math.min(Math.max(zoom + delta * zoomSpeed, 0.25), 3);
      
      setZoom(newZoom);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (spacePressed) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Close context menu and user menu when clicking on canvas
    setContextMenu(null);
    setShowMenu(false);
  };

  const handleNodeRightClick = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (nodeId === 'center') return;
    
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  };

  const handleShareNode = () => {
    if (!contextMenu) return;
    
    const node = nodes.find(n => n.id === contextMenu.nodeId);
    if (!node) return;

    // Generate share link
    const shareLink = `${window.location.origin}/share/${node.id}`;
    
    // Mark node and all descendants as shared
    setNodes(prev => prev.map(n => {
      if (n.id === node.id || isDescendant(node.id, n.id, prev)) {
        return { ...n, isShared: true, sharedLink: shareLink };
      }
      return n;
    }));

    setShareNode(node);
    setShareModalOpen(true);
    setContextMenu(null);
  };

  const handleOpenInNewTab = () => {
    if (!contextMenu || !onOpenNodeInNewTab) return;
    
    const node = nodes.find(n => n.id === contextMenu.nodeId);
    if (!node) return;

    onOpenNodeInNewTab(node.id, node.label);
    setContextMenu(null);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--toss-bg-secondary)' }}>
      {/* Header */}
      <Header
        user={user}
        showDiagnosisButton={true}
        onOpenDiagnosis={() => setIsDiagnosisOpen(true)}
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToHome={onNavigateToHome}
        onNavigateToMindmap={() => {/* 현재 페이지이므로 아무 동작 없음 */}}
        onLogout={onLogout}
        showMenu={showMenu}
        onToggleMenu={setShowMenu}
        currentPage="mindmap"
      />

      {/* Tab bar from App.tsx */}
      {renderTabBar && renderTabBar()}

      {/* Canvas Container - relative positioning for sidebar */}
      <div className="flex-1 relative overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`absolute inset-0 ${
            isPanning || spacePressed ? 'cursor-grab' :
            draggedNodeId ? 'cursor-move' :
            'cursor-default'
          } ${
            isPanning ? 'cursor-grabbing' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onClick={handleCanvasClick}
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
                    stroke="var(--toss-gray-300)"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  transform: 'translate(-50%, -50%)',
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleNodeDrop(node.id)}
                onContextMenu={(e) => handleNodeRightClick(e, node.id)}
              >
                {editingNodeId === node.id ? (
                  <div
                    className={`
                      group relative transition-all min-w-[120px] text-center select-none
                      ${node.id === 'center'
                        ? 'toss-card cursor-default'
                        : 'toss-card toss-card-interactive cursor-move'
                      }
                      ${node.isShared ? 'border-green-400 hover:border-green-500' : ''}
                    `}
                    style={{
                      backgroundColor: node.id === 'center' ? 'var(--toss-blue)' : node.isShared ? 'var(--toss-green-light)' : 'var(--toss-bg-primary)',
                      color: node.id === 'center' ? 'white' : node.level === 1 ? 'var(--toss-blue-dark)' : 'var(--toss-gray-900)',
                      borderColor: node.level === 1 ? 'var(--toss-blue)' : node.isShared ? 'var(--toss-green)' : 'var(--toss-gray-200)',
                      borderWidth: '2px',
                      borderRadius: 'var(--toss-radius-lg)',
                      padding: 'var(--toss-space-3) var(--toss-space-4)',
                      fontSize: node.id === 'center' ? 'var(--toss-text-h4)' : 'var(--toss-text-body2)',
                      fontWeight: node.id === 'center' ? '600' : '400',
                      outline: selectedNode?.id === node.id ? '4px solid var(--toss-blue-light)' : 'none',
                      outlineOffset: '2px',
                      opacity: draggedNodeId === node.id ? '0.7' : '1',
                      transform: draggedNodeId === node.id ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: draggedNodeId === node.id ? 'var(--toss-shadow-xl)' : 'var(--toss-shadow-sm)'
                    }}
                  >
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={handleEditComplete}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditComplete()}
                      autoFocus
                      className="bg-transparent border-none outline-none text-center w-full text-inherit"
                      style={{
                        minWidth: '80px',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        color: 'inherit'
                      }}
                      placeholder="노드 이름"
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => handleNodeClick(node)}
                    onDoubleClick={() => handleNodeDoubleClick(node)}
                    onMouseDown={(e) => handleNodeDragStart(node.id, e)}
                    className={`
                      group relative transition-all min-w-[120px] text-center select-none
                      ${node.id === 'center'
                        ? 'toss-card cursor-default'
                        : 'toss-card toss-card-interactive cursor-move'
                      }
                      ${node.isShared ? 'border-green-400 hover:border-green-500' : ''}
                    `}
                    style={{
                      backgroundColor: node.id === 'center' ? 'var(--toss-blue)' : node.isShared ? 'var(--toss-green-light)' : 'var(--toss-bg-primary)',
                      color: node.id === 'center' ? 'white' : node.level === 1 ? 'var(--toss-blue-dark)' : 'var(--toss-gray-900)',
                      borderColor: node.level === 1 ? 'var(--toss-blue)' : node.isShared ? 'var(--toss-green)' : 'var(--toss-gray-200)',
                      borderWidth: '2px',
                      borderRadius: 'var(--toss-radius-lg)',
                      padding: 'var(--toss-space-3) var(--toss-space-4)',
                      fontSize: node.id === 'center' ? 'var(--toss-text-h4)' : 'var(--toss-text-body2)',
                      fontWeight: node.id === 'center' ? '600' : '400',
                      outline: selectedNode?.id === node.id ? '4px solid var(--toss-blue-light)' : 'none',
                      outlineOffset: '2px',
                      opacity: draggedNodeId === node.id ? '0.7' : '1',
                      transform: draggedNodeId === node.id ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: draggedNodeId === node.id ? 'var(--toss-shadow-xl)' : 'var(--toss-shadow-sm)'
                    }}
                  >
                    <p style={{ fontSize: 'inherit', fontWeight: 'inherit' }}>{node.label}</p>

                    {/* Shared indicator */}
                    {node.isShared && (
                      <div
                        className="absolute flex items-center justify-center"
                        style={{
                          top: '-4px',
                          right: '-4px',
                          width: '20px',
                          height: '20px',
                          backgroundColor: 'var(--toss-green)',
                          borderRadius: '50%'
                        }}
                      >
                        <Share2 className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Directional Add Buttons */}
                    {node.id !== 'center' && (
                      <>
                        {/* Right */}
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addChildNode(node.id, 'right');
                          }}
                          className="toss-icon-button absolute left-full top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10"
                          style={{
                            marginLeft: 'var(--toss-space-2)',
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'var(--toss-blue)',
                            color: 'white',
                            borderRadius: '50%',
                            boxShadow: 'var(--toss-shadow-lg)'
                          }}
                          title="오른쪽에 노드 추가"
                        >
                          <Plus className="w-3 h-3 pointer-events-none" />
                        </button>

                        {/* Left */}
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addChildNode(node.id, 'left');
                          }}
                          className="toss-icon-button absolute right-full top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10"
                          style={{
                            marginRight: 'var(--toss-space-2)',
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'var(--toss-blue)',
                            color: 'white',
                            borderRadius: '50%',
                            boxShadow: 'var(--toss-shadow-lg)'
                          }}
                          title="왼쪽에 노드 추가"
                        >
                          <Plus className="w-3 h-3 pointer-events-none" />
                        </button>

                        {/* Top */}
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addChildNode(node.id, 'top');
                          }}
                          className="toss-icon-button absolute bottom-full left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10"
                          style={{
                            marginBottom: 'var(--toss-space-2)',
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'var(--toss-blue)',
                            color: 'white',
                            borderRadius: '50%',
                            boxShadow: 'var(--toss-shadow-lg)'
                          }}
                          title="위에 노드 추가"
                        >
                          <Plus className="w-3 h-3 pointer-events-none" />
                        </button>

                        {/* Bottom */}
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addChildNode(node.id, 'bottom');
                          }}
                          className="toss-icon-button absolute top-full left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10"
                          style={{
                            marginTop: 'var(--toss-space-2)',
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'var(--toss-blue)',
                            color: 'white',
                            borderRadius: '50%',
                            boxShadow: 'var(--toss-shadow-lg)'
                          }}
                          title="아래에 노드 추가"
                        >
                          <Plus className="w-3 h-3 pointer-events-none" />
                        </button>

                        {/* Delete Button */}
                        {!node.id.startsWith('badge_') && (
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteNode(node.id);
                            }}
                            className="toss-icon-button absolute opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                            style={{
                              top: '-8px',
                              right: '-8px',
                              width: '24px',
                              height: '24px',
                              backgroundColor: 'var(--toss-red)',
                              color: 'white',
                              borderRadius: '50%',
                              boxShadow: 'var(--toss-shadow-lg)',
                              fontSize: 'var(--toss-text-caption)'
                            }}
                            title="삭제"
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Chatbot - Fixed position on screen right, outside canvas */}
        <AIChatbot
          selectedNode={selectedNode}
          onNodeUpdate={(nodeId, content) => {
            // Could update node content if needed
          }}
          onSTARReady={handleSTARReady}
          gapTags={gapTags}
          onTagRemove={(tagId) => setGapTags(prev => prev.filter(t => t.id !== tagId))}
          onDragStart={handleTagDragStart}
          onOpenDiagnosis={() => setIsDiagnosisOpen(true)}
        />
      </div>

      {/* Components */}
      <GapDiagnosisModal
        isOpen={isDiagnosisOpen}
        onClose={() => setIsDiagnosisOpen(false)}
        onComplete={handleDiagnosisComplete}
      />

      <STAREditor
        isOpen={isSTAREditorOpen}
        nodeId={starNodeId}
        nodeLabel={starNodeLabel}
        messages={starMessages}
        onClose={() => setIsSTAREditorOpen(false)}
        onSave={handleSTARSave}
      />

      {/* Tag Drop Prompt */}
      {tagDropPrompt && (
        <div className="fixed inset-0 flex items-center justify-center z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="toss-card toss-fade-in max-w-md w-full mx-4" style={{ padding: 'var(--toss-space-6)' }}>
            <h3 className="toss-text-h3 mb-2">🎯 경험 연결하기</h3>
            <p className="toss-text-body2 mb-4" style={{ color: 'var(--toss-gray-600)' }}>
              {nodes.find(n => n.id === tagDropPrompt.nodeId)?.label} 경험에서<br />
              <span className="toss-text-body2" style={{ fontWeight: '600', color: 'var(--toss-blue-dark)' }}>{tagDropPrompt.tag.label}</span>과 관련된 세부 경험이나 에피소드가 있나요?
            </p>
            <input
              type="text"
              value={tagDropInput}
              onChange={(e) => setTagDropInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTagPromptSubmit()}
              placeholder="예: 팀원들과 협업한 프로젝트"
              autoFocus
              className="toss-input"
            />
            <div className="flex gap-2" style={{ marginTop: 'var(--toss-space-4)' }}>
              <button
                onClick={handleTagPromptSkip}
                className="toss-button toss-button-secondary flex-1"
              >
                건너뛰기
              </button>
              <button
                onClick={handleTagPromptSubmit}
                disabled={!tagDropInput.trim()}
                className={`toss-button flex-1 ${
                  tagDropInput.trim()
                    ? 'toss-button-primary'
                    : 'toss-button-secondary'
                }`}
                style={{
                  opacity: tagDropInput.trim() ? '1' : '0.5',
                  cursor: tagDropInput.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute toss-card z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            padding: 'var(--toss-space-2)',
            minWidth: '180px'
          }}
        >
          <button
            onClick={handleShareNode}
            className="toss-button toss-button-ghost w-full justify-start gap-2"
          >
            <Share2 className="w-4 h-4" />
            공유하기
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="toss-button toss-button-ghost w-full justify-start gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            새 탭에서 열기
          </button>
          <button
            onClick={handleCloseContextMenu}
            className="toss-button toss-button-ghost w-full justify-start gap-2"
          >
            취소
          </button>
        </div>
      )}

      {/* Share Modal */}
      {shareNode && (
        <ShareModal
          isOpen={shareModalOpen}
          nodeLabel={shareNode.label}
          shareLink={shareNode.sharedLink || ''}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Instructions */}
      {nodes.length <= badges.length + 1 && gapTags.length === 0 && (
        <div
          className="fixed toss-card toss-fade-in z-20"
          style={{
            bottom: 'var(--toss-space-6)',
            left: 'var(--toss-space-6)',
            maxWidth: '300px',
            borderColor: 'var(--toss-blue-light)',
            borderWidth: '2px'
          }}
        >
          <h3 className="toss-text-body1" style={{ fontWeight: '600', marginBottom: 'var(--toss-space-2)' }}>💡 시작 가이드</h3>
          <ul className="toss-text-caption space-y-1" style={{ color: 'var(--toss-gray-600)' }}>
            <li>• 노드를 드래그하여 위치 이동</li>
            <li>• 노드를 더블클릭하여 수정</li>
            <li>• 노드에 마우스를 올려 하위 노드 추가</li>
            <li>• Space + 드래그로 캔버스 이동</li>
            <li>• Alt + 스크롤로 확대/축소</li>
            <li>• "공백 진단하기"로 채워야 할 역량 찾기</li>
          </ul>
        </div>
      )}

      {/* Zoom Indicator */}
      <div
        className="fixed toss-card z-20"
        style={{
          bottom: 'var(--toss-space-6)',
          right: 'var(--toss-space-6)',
          padding: 'var(--toss-space-2) var(--toss-space-3)'
        }}
      >
        <p className="toss-text-caption" style={{ color: 'var(--toss-gray-600)' }}>{Math.round(zoom * 100)}%</p>
      </div>
    </div>
  );
}