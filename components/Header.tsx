'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu, LogOut, Home, Map, ChevronRight, User as UserIcon, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mindMapProjectStorage } from '@/lib/storage';
import { MindMapNode, MindMapProject } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { ThemeToggle } from '@/components/theme-toggle';

interface SearchResult {
  nodeId: string;
  nodeLabel: string;
  projectId: string;
  projectName: string;
  nodePath: string[]; // 노드까지의 경로
}

interface HeaderProps {
  showSearch?: boolean;
}

export default function Header({
  showSearch = true,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut: authSignOut } = useUnifiedAuth(); // 전역 상태에서 사용자 정보 가져오기
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showMenu || showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showSearchResults]);

  // 검색 기능
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      const projects = await mindMapProjectStorage.load();
      const results: SearchResult[] = [];

      // 검색어를 소문자로 변환
      const query = searchQuery.toLowerCase();

      for (const project of projects) {
        // 프로젝트 이름으로 검색
        const projectMatches = project.name.toLowerCase().includes(query);

        for (const node of project.nodes) {
          // 노드 이름으로 검색
          const nodeLabel = typeof node.label === 'string' ? node.label : '';
          const nodeMatches = nodeLabel.toLowerCase().includes(query);

          // 프로젝트 또는 노드가 매칭되면 결과에 추가
          if (projectMatches || nodeMatches) {
            // 중앙 노드와 배지 노드는 제외
            if ((node.nodeType === 'center' || node.level === 0) || (node.id.startsWith(`${project.id}_badge_`) || node.nodeType === 'category')) {
              continue;
            }

            // 노드까지의 경로 생성
            const path = getNodePath(node, project.nodes);

            results.push({
              nodeId: node.id,
              nodeLabel,
              projectId: project.id,
              projectName: project.name,
              nodePath: path,
            });
          }
        }
      }

      // 결과를 프로젝트별, 경로 깊이별로 정렬
      results.sort((a, b) => {
        if (a.projectName !== b.projectName) {
          return a.projectName.localeCompare(b.projectName);
        }
        return a.nodePath.length - b.nodePath.length;
      });

      setSearchResults(results.slice(0, 10)); // 최대 10개만 표시
      setShowSearchResults(true);
    };

    performSearch();
  }, [searchQuery]);

  // 노드까지의 경로를 가져오는 함수
  const getNodePath = (node: MindMapNode, allNodes: MindMapNode[]): string[] => {
    const path: string[] = [];
    let currentNode: MindMapNode | undefined = node;

    while (currentNode) {
      const label = typeof currentNode.label === 'string' ? currentNode.label : '노드';
      // center와 배지 노드는 경로에서 제외
      if ((currentNode.nodeType !== 'center' && currentNode.level !== 0) && currentNode.nodeType !== 'category') {
        path.unshift(label);
      }
      
      if (!currentNode.parentId) break;
      currentNode = allNodes.find((n) => n.id === currentNode!.parentId);
    }

    return path;
  };

  const handleLogout = async () => {
    // Supabase Auth 로그아웃
    await authSignOut();
    // 홈으로 리다이렉트
    router.push('/');
  };

  const handleSearchResultClick = (result: SearchResult) => {
    // 메인 마인드맵 뷰에서 해당 노드로 포커스 이동
    router.push(`/mindmap/${result.projectId}?nodeId=${result.nodeId}&focus=true`);
    setSearchQuery('');
    setShowSearchResults(false);
    setShowMobileSearch(false);
  };

  // 모바일 검색 열릴 때 포커스
  useEffect(() => {
    if (showMobileSearch && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [showMobileSearch]);

  // 검색어 하이라이트 함수
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-gray-100">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  const isActive = (path: string) => {
    if (path === '/mindmaps' || path === '/mindmap') {
      return pathname.startsWith('/mindmap');
    }
    return pathname === path;
  };

  const isHomePage = pathname === '/';

  return (
    <header className={`bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-[#2a2a2a] px-5 py-4 flex items-center justify-between z-[60] transition-colors ${isHomePage ? '' : 'sticky top-0'}`}>
      <div className="flex items-center gap-6">
        {/* 로고 */}
        <Link href="/">
          <button className="flex items-center hover:opacity-80 transition-opacity">
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              episode
            </span>
          </button>
        </Link>


        {/* 검색 (로그인된 경우, 데스크톱에서만 표시) */}
        {user && showSearch && (
          <div className="relative hidden md:block" ref={searchRef}>
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="경험 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim() && searchResults.length > 0) {
                  setShowSearchResults(true);
                }
              }}
              className="h-9 pl-10 pr-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm text-gray-900 dark:text-[#e5e5e5] placeholder-gray-500 dark:placeholder-[#606060] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-colors"
            />
            
            {/* 검색 결과 드롭다운 */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.projectId}-${result.nodeId}-${index}`}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50 transition-colors border-b border-gray-100 dark:border-[#2a2a2a] last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* 노드 이름 */}
                        <div className="font-medium text-sm text-gray-900 dark:text-[#e5e5e5] truncate">
                          {highlightText(result.nodeLabel, searchQuery)}
                        </div>
                        
                        {/* 경로 */}
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-[#a0a0a0]">
                          <span className="truncate">
                            {highlightText(result.projectName, searchQuery)}
                          </span>
                          {result.nodePath.length > 0 && (
                            <>
                              <ChevronRight className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {result.nodePath.join(' > ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 검색 결과 없음 */}
            {showSearchResults && searchQuery.trim() && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-lg shadow-lg p-4 z-50">
                <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center">
                  검색 결과가 없습니다
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* 테마 토글 버튼 */}
        <ThemeToggle />

        {/* 모바일 검색 버튼 */}
        {user && showSearch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileSearch(true)}
            className="h-9 w-9 p-0 md:hidden"
          >
            <Search className="w-5 h-5" />
          </Button>
        )}

        {/* 로그인 버튼 또는 사용자 메뉴 */}
        {!user ? (
          <Link href="/login">
            <Button variant="ghost" className="text-gray-700 dark:text-[#e5e5e5] hover:text-gray-900 dark:hover:text-white">
              로그인/회원가입
            </Button>
          </Link>
        ) : (
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 h-9 px-3 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-[#5B6EFF] to-[#7B8FFF] rounded-full flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 10px rgba(91, 110, 255, 0.3)' }}>
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-[#e5e5e5]">{user.name}님</span>
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 glass-card rounded-lg shadow-lg z-[80]">
                {/* 사용자 정보 */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a2a]">
                  <p className="text-sm font-medium text-gray-900 dark:text-[#e5e5e5]">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-[#a0a0a0] mt-1">{user.email}</p>
                </div>
                {/* 메뉴 항목 */}
                <div className="py-1">
                  <Link
                    href="/mindmaps"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-[#e5e5e5] hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50 flex items-center gap-2 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Map className="w-4 h-4" />
                    마인드맵 목록
                  </Link>
                  <Link
                    href="/archive"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-[#e5e5e5] hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50 flex items-center gap-2 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Archive className="w-4 h-4" />
                    에피소드 아카이브
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-[#e5e5e5] hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 모바일 검색 모달 */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-white dark:bg-[#0a0a0a] z-50 md:hidden">
          <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-[#2a2a2a]">
              <button
                onClick={() => {
                  setShowMobileSearch(false);
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                className="text-gray-600 dark:text-[#a0a0a0]"
              >
                ← 뒤로
              </button>
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 dark:text-[#606060] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="경험 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 pr-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm text-gray-900 dark:text-[#e5e5e5] placeholder-gray-500 dark:placeholder-[#606060] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full transition-colors"
                />
              </div>
            </div>

            {/* 검색 결과 */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery.trim() && searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.projectId}-${result.nodeId}-${index}`}
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full px-4 py-4 text-left active:bg-gray-50 dark:active:bg-[#2a2a2a] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* 노드 이름 */}
                          <div className="font-medium text-sm text-gray-900 dark:text-[#e5e5e5] truncate">
                            {highlightText(result.nodeLabel, searchQuery)}
                          </div>
                          
                          {/* 경로 */}
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-[#a0a0a0]">
                            <span className="truncate">
                              {highlightText(result.projectName, searchQuery)}
                            </span>
                            {result.nodePath.length > 0 && (
                              <>
                                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {result.nodePath.join(' > ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-[#606060] flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 dark:text-[#a0a0a0]">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-[#404040]" />
                    <p className="text-sm">검색 결과가 없습니다</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 dark:text-[#a0a0a0]">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-[#404040]" />
                    <p className="text-sm">프로젝트와 노드를 검색해보세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

