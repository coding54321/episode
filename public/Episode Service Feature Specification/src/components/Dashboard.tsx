import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Filter, Search, Copy, Trash2, Download, Check, Calendar, Briefcase, Tag, Table } from 'lucide-react';
import { User } from '../App';
import { STARAsset, NodeTableEntry } from '../types';
import { loadNodeTableEntries } from '../utils/nodeTableUtils';

interface DashboardProps {
  user: User;
  onNavigateToMindmap: () => void;
  onLogout: () => void;
}

export default function Dashboard({ user, onNavigateToMindmap, onLogout }: DashboardProps) {
  const [assets, setAssets] = useState<STARAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<STARAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'company' | 'competency'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [nodeEntries, setNodeEntries] = useState<NodeTableEntry[]>([]);

  useEffect(() => {
    loadAssets();
    loadNodeEntries();
  }, []);

  const loadNodeEntries = () => {
    try {
      const entries = loadNodeTableEntries();
      setNodeEntries(entries);
    } catch (error) {
      console.error('Failed to load node entries:', error);
      setNodeEntries([]);
    }
  };

  const loadAssets = () => {
    try {
      const savedAssets = localStorage.getItem('episode_assets');
      if (savedAssets) {
        const parsedAssets = JSON.parse(savedAssets);
        if (Array.isArray(parsedAssets)) {
          setAssets(parsedAssets.sort((a: STARAsset, b: STARAsset) => b.updatedAt - a.updatedAt));
        }
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
      setAssets([]);
    }
  };

  const handleDelete = (assetId: string) => {
    if (!confirm('정말 이 STAR 에셋을 삭제하시겠습니까?')) return;

    try {
      const updatedAssets = assets.filter(a => a.id !== assetId);
      setAssets(updatedAssets);
      localStorage.setItem('episode_assets', JSON.stringify(updatedAssets));
      
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null);
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCopy = (content: string, assetId: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(assetId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(assetId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateToMindmap}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl text-gray-900">STAR 에셋 대시보드</h1>
            <p className="text-sm text-gray-500">총 {assets.length}개의 경험</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>카드</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Table className="w-4 h-4" />
                <span>표</span>
              </div>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="경험 검색..."
              className="pl-9 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'cards' ? (
            // 카드 뷰
            filteredAssets.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">
                {searchQuery ? '검색 결과가 없습니다' : '아직 저장된 STAR 에셋이 없습니다'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? '다른 검색어로 시도해보세요' : '마인드맵에서 AI와 대화하여 첫 STAR 에셋을 만들어보세요'}
              </p>
              {!searchQuery && (
                <button
                  onClick={onNavigateToMindmap}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  마인드맵으로 이동
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`
                    bg-white rounded-xl p-5 border-2 transition-all cursor-pointer hover:shadow-md
                    ${selectedAsset?.id === asset.id ? 'border-blue-500 shadow-md' : 'border-gray-200'}
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-gray-900 flex-1 line-clamp-1">
                      {asset.title}
                    </h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatDate(asset.updatedAt)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {asset.content}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {asset.content.length}자
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(asset.content, asset.id);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="복사하기"
                      >
                        {copiedId === asset.id ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(asset.id);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="삭제하기"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
          ) : (
            // 테이블 뷰
            nodeEntries.length === 0 ? (
              <div className="text-center py-16">
                <Table className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl text-gray-900 mb-2">표시할 노드가 없습니다</h3>
                <p className="text-gray-600 mb-6">
                  마인드맵에서 노드를 추가하여 경험을 구조화해보세요
                </p>
                <button
                  onClick={onNavigateToMindmap}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  마인드맵으로 이동
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          대분류
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          경험
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          에피소드
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          S (상황)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          T (과제)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          A (행동)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          R (결과)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          역량태그
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nodeEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.experience}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.episode}
                          </td>
                          <td className="px-6 py-4 max-w-xs text-sm text-gray-500">
                            <div className="truncate" title={entry.situation}>
                              {entry.situation || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-xs text-sm text-gray-500">
                            <div className="truncate" title={entry.task}>
                              {entry.task || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-xs text-sm text-gray-500">
                            <div className="truncate" title={entry.action}>
                              {entry.action || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-xs text-sm text-gray-500">
                            <div className="truncate" title={entry.result}>
                              {entry.result || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {entry.competencyTags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.competencyTags.slice(0, 2).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {entry.competencyTags.length > 2 && (
                                  <span className="text-xs text-gray-400">
                                    +{entry.competencyTags.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>

        {/* Detail Panel */}
        {selectedAsset && (
          <div className="w-[480px] bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl text-gray-900 mb-2">{selectedAsset.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedAsset.updatedAt)}
                    </span>
                    <span>{selectedAsset.content.length}자</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Tags */}
              {(selectedAsset.company || selectedAsset.competency) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedAsset.company && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {selectedAsset.company}
                    </span>
                  )}
                  {selectedAsset.competency && (
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {selectedAsset.competency}
                    </span>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {selectedAsset.content}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleCopy(selectedAsset.content, selectedAsset.id)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  {copiedId === selectedAsset.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      복사하기
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(selectedAsset.id)}
                  className="px-6 py-3 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>

              {/* STAR Breakdown */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-sm text-gray-700 mb-4">STAR 구성 요소</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                      S
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Situation - 상황</p>
                      <p className="text-xs text-gray-500 mt-1">배경과 맥락을 설명합니다</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                      T
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Task - 과제</p>
                      <p className="text-xs text-gray-500 mt-1">목표와 역할을 명시합니다</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                      A
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Action - 행동</p>
                      <p className="text-xs text-gray-500 mt-1">구체적인 액션을 서술합니다</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                      R
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Result - 결과</p>
                      <p className="text-xs text-gray-500 mt-1">성과와 배운 점을 정리합니다</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
