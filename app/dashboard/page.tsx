'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STARAsset } from '@/types';
import { assetStorage, userStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Search, Trash2, Copy, Plus, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<STARAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<STARAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<STARAsset | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    // 로그인 확인
    const user = userStorage.load();
    if (!user) {
      router.push('/login');
      return;
    }

    // 에셋 로드
    const savedAssets = assetStorage.load();
    setAssets(savedAssets);
    setFilteredAssets(savedAssets);
  }, [router]);

  useEffect(() => {
    // 검색 필터링
    if (!searchQuery.trim()) {
      setFilteredAssets(assets);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = assets.filter(asset =>
      asset.title.toLowerCase().includes(query) ||
      asset.content.toLowerCase().includes(query) ||
      asset.company?.toLowerCase().includes(query) ||
      asset.competency?.toLowerCase().includes(query)
    );
    setFilteredAssets(filtered);
  }, [searchQuery, assets]);

  const handleDelete = (assetId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      assetStorage.delete(assetId);
      const updatedAssets = assets.filter(a => a.id !== assetId);
      setAssets(updatedAssets);
      setFilteredAssets(updatedAssets);
      toast.success('삭제되었습니다');
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('클립보드에 복사되었습니다');
    } catch (error) {
      toast.error('복사에 실패했습니다');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleLogout = () => {
    // 모든 데이터 초기화
    localStorage.clear();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="safe-area-top bg-white" />

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              내 자소서
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/mindmap">
              <Button variant="ghost" size="sm" className="px-3 h-9 text-gray-600">
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="px-3 h-9 text-gray-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 bg-white px-5 py-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-xs text-blue-600 mb-1">총 자소서</div>
            <div className="text-2xl font-bold text-blue-700">{assets.length}</div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-xs text-green-600 mb-1">이번 달</div>
            <div className="text-2xl font-bold text-green-700">
              {assets.filter(a => {
                const assetDate = new Date(a.createdAt);
                const now = new Date();
                return assetDate.getMonth() === now.getMonth() && assetDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="text-xs text-purple-600 mb-1">평균 글자</div>
            <div className="text-2xl font-bold text-purple-700">
              {assets.length > 0
                ? Math.round(assets.reduce((sum, a) => sum + a.content.length, 0) / assets.length)
                : 0}
            </div>
          </Card>
        </div>

        {/* 검색 바 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="자소서 검색..."
            className="pl-11 h-12 rounded-[12px] border-gray-200 bg-gray-50 focus:bg-white transition-colors"
          />
        </div>

        {/* 에셋 목록 */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-500 mb-6">
              {searchQuery ? '검색 결과가 없어요' : '아직 작성한 자소서가 없어요'}
            </p>
            <Link href="/mindmap">
              <Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-[12px] shadow-sm">
                첫 자소서 작성하기
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset, index) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card
                  className="p-4 hover:shadow-sm transition-all duration-200 cursor-pointer border border-gray-100 rounded-[12px]"
                  onClick={() => {
                    setSelectedAsset(asset);
                    setIsDetailOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold mb-1 line-clamp-1">{asset.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-1">{asset.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">{formatDate(asset.createdAt)}</span>
                        {asset.company && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full">
                            {asset.company}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleCopy(asset.content);
                        }}
                        className="h-8 w-8 p-0 hover:bg-gray-50"
                      >
                        <Copy className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleDelete(asset.id);
                        }}
                        className="h-8 w-8 p-0 hover:bg-red-50 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{selectedAsset?.title}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge>S</Badge>
                  <span className="text-sm font-medium">상황</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(selectedAsset.createdAt)}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedAsset.situation}</p>

              <div className="flex items-center gap-2">
                <Badge>T</Badge>
                <span className="text-sm font-medium">과제</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedAsset.task}</p>

              <div className="flex items-center gap-2">
                <Badge>A</Badge>
                <span className="text-sm font-medium">행동</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedAsset.action}</p>

              <div className="flex items-center gap-2">
                <Badge>R</Badge>
                <span className="text-sm font-medium">결과</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedAsset.result}</p>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">최종 텍스트</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedAsset.content}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleCopy(selectedAsset.content);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  복사하기
                </Button>
                <Button
                  variant="destructive"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleDelete(selectedAsset.id);
                    setIsDetailOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

