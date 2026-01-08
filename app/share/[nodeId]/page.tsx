'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MindMapNode, SharedNodeData, STARAsset } from '@/types';
import { sharedNodeStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, ArrowLeft, Share2, Calendar, Eye, FileText, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function SharePage() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  const [sharedData, setSharedData] = useState<SharedNodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedAsset, setSelectedAsset] = useState<STARAsset | null>(null);

  useEffect(() => {
    const data = sharedNodeStorage.get(nodeId);
    
    if (data) {
      setSharedData(data);
      // 초기 뷰를 중앙에 맞추기
      const canvas = canvasRef.current;
      if (canvas) {
        const centerX = canvas.clientWidth / 2;
        const centerY = canvas.clientHeight / 2;
        setPan({ x: centerX - data.node.x, y: centerY - data.node.y });
      }
    }
    setIsLoading(false);
  }, [nodeId]);

  // 모든 노드 (루트 + 하위 노드들)
  const allNodes = useMemo(() => {
    if (!sharedData) return [];
    return [sharedData.node, ...sharedData.descendants];
  }, [sharedData]);

  // 줌 컨트롤
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.3));
  const handleResetView = () => {
    setZoom(1);
    if (sharedData && canvasRef.current) {
      const centerX = canvasRef.current.clientWidth / 2;
      const centerY = canvasRef.current.clientHeight / 2;
      setPan({ x: centerX - sharedData.node.x, y: centerY - sharedData.node.y });
    }
  };

  // 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!sharedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">공유된 노드를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">
            공유 링크가 만료되었거나 잘못된 링크일 수 있습니다.
          </p>
          <Link href="/">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
              <Home className="h-4 w-4 mr-2" />
              홈으로 돌아가기
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-green-600" />
            <h1 className="text-xl font-bold text-gray-900">
              공유된 경험 맵
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(sharedData.createdAt).toLocaleDateString('ko-KR')}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 마인드맵 캔버스 */}
        <div className="flex-1 relative">
          {/* 줌 컨트롤 */}
          <div className="absolute top-4 right-4 z-10 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              title="확대"
            >
              <ZoomIn className="h-5 w-5 text-gray-700" />
            </button>
            <div className="h-px bg-gray-200" />
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              title="축소"
            >
              <ZoomOut className="h-5 w-5 text-gray-700" />
            </button>
            <div className="h-px bg-gray-200" />
            <button
              onClick={handleResetView}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              title="초기화"
            >
              <Maximize2 className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          {/* 캔버스 */}
          <div
            ref={canvasRef}
            className="w-full h-full bg-white overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              className="w-full h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
            >
              {/* 연결선 그리기 */}
              {allNodes.map(node => {
                if (!node.parentId) return null;
                const parent = allNodes.find(n => n.id === node.parentId);
                if (!parent) return null;

                return (
                  <line
                    key={`line-${node.id}`}
                    x1={parent.x}
                    y1={parent.y}
                    x2={node.x}
                    y2={node.y}
                    stroke="#22c55e"
                    strokeWidth={2.6}
                    opacity={0.6}
                  />
                );
              })}

              {/* 노드 그리기 */}
              {allNodes.map(node => {
                const isRoot = node.id === sharedData.node.id;
                return (
                  <g key={node.id}>
                    {/* 노드 박스 */}
                    <rect
                      x={node.x - 80}
                      y={node.y - 25}
                      width={160}
                      height={50}
                      rx={12}
                      fill={isRoot ? '#3b82f6' : 'white'}
                      stroke={isRoot ? '#2563eb' : '#22c55e'}
                      strokeWidth={isRoot ? 3 : 2}
                      className="drop-shadow-md"
                    />
                    {/* 노드 텍스트 */}
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isRoot ? 'white' : '#1f2937'}
                      fontSize={14}
                      fontWeight={isRoot ? 'bold' : 'semibold'}
                      className="select-none"
                    >
                      {node.label.length > 12 ? node.label.substring(0, 12) + '...' : node.label}
                    </text>
                    {/* 공유 배지 (루트 노드만) */}
                    {isRoot && (
                      <g transform={`translate(${node.x + 70}, ${node.y - 25})`}>
                        <circle cx="0" cy="0" r="10" fill="#22c55e" />
                        <text
                          x="0"
                          y="1"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={10}
                          fontWeight="bold"
                        >
                          ✓
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 사이드바 - 정보 & STAR 에셋 */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* 노드 정보 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600">
                      {sharedData.node.label.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{sharedData.node.label}</h2>
                    <p className="text-sm text-gray-500">공유된 경험</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">하위 노드</span>
                    <span className="font-semibold text-gray-900">{sharedData.descendants.length}개</span>
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
                    <FileText className="h-5 w-5 text-blue-600" />
                    STAR 작성 내용
                  </h3>
                  <div className="space-y-3">
                    {sharedData.starAssets.map(asset => (
                      <div
                        key={asset.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm">{asset.title}</h4>
                          <Eye className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                        {asset.company && (
                          <p className="text-xs text-blue-600 mb-2">{asset.company}</p>
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
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                <h3 className="font-bold text-gray-900 mb-2">나만의 경험 맵 만들기</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Episode와 함께 취업 준비를 시작해보세요
                </p>
                <Link href="/login">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl">
                    시작하기
                  </Button>
                </Link>
              </div>
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
              {/* Situation */}
              {selectedAsset.situation && (
                <div>
                  <h3 className="text-sm font-bold text-blue-600 mb-2">상황 (Situation)</h3>
                  <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 rounded-xl p-4">
                    {selectedAsset.situation}
                  </p>
                </div>
              )}

              {/* Task */}
              {selectedAsset.task && (
                <div>
                  <h3 className="text-sm font-bold text-purple-600 mb-2">과제 (Task)</h3>
                  <p className="text-sm text-gray-700 leading-relaxed bg-purple-50 rounded-xl p-4">
                    {selectedAsset.task}
                  </p>
                </div>
              )}

              {/* Action */}
              {selectedAsset.action && (
                <div>
                  <h3 className="text-sm font-bold text-green-600 mb-2">행동 (Action)</h3>
                  <p className="text-sm text-gray-700 leading-relaxed bg-green-50 rounded-xl p-4">
                    {selectedAsset.action}
                  </p>
                </div>
              )}

              {/* Result */}
              {selectedAsset.result && (
                <div>
                  <h3 className="text-sm font-bold text-orange-600 mb-2">결과 (Result)</h3>
                  <p className="text-sm text-gray-700 leading-relaxed bg-orange-50 rounded-xl p-4">
                    {selectedAsset.result}
                  </p>
                </div>
              )}

              {/* 최종 내용 */}
              {selectedAsset.content && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">최종 작성 내용</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
                    {selectedAsset.content}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

