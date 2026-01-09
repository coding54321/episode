'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu, LogOut, Home, Map, ChevronRight, User as UserIcon, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { userStorage, mindMapProjectStorage } from '@/lib/storage';
import { User, MindMapNode, MindMapProject } from '@/types';

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
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userData = userStorage.load();
    setUser(userData);
  }, []);

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
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const projects = mindMapProjectStorage.load();
    const results: SearchResult[] = [];

    // 검색어를 소문자로 변환
    const query = searchQuery.toLowerCase();

    projects.forEach((project) => {
      // 프로젝트 이름으로 검색
      const projectMatches = project.name.toLowerCase().includes(query);

      project.nodes.forEach((node) => {
        // 노드 이름으로 검색
        const nodeLabel = typeof node.label === 'string' ? node.label : '';
        const nodeMatches = nodeLabel.toLowerCase().includes(query);

        // 프로젝트 또는 노드가 매칭되면 결과에 추가
        if (projectMatches || nodeMatches) {
          // 중앙 노드와 배지 노드는 제외
          if (node.id === 'center' || node.id.startsWith('badge_')) {
            return;
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
      });
    });

    // 결과를 프로젝트별, 경로 깊이별로 정렬
    results.sort((a, b) => {
      if (a.projectName !== b.projectName) {
        return a.projectName.localeCompare(b.projectName);
      }
      return a.nodePath.length - b.nodePath.length;
    });

    setSearchResults(results.slice(0, 10)); // 최대 10개만 표시
    setShowSearchResults(true);
  }, [searchQuery]);

  // 노드까지의 경로를 가져오는 함수
  const getNodePath = (node: MindMapNode, allNodes: MindMapNode[]): string[] => {
    const path: string[] = [];
    let currentNode: MindMapNode | undefined = node;

    while (currentNode) {
      const label = typeof currentNode.label === 'string' ? currentNode.label : '노드';
      // center와 배지 노드는 경로에서 제외
      if (currentNode.id !== 'center' && !currentNode.id.startsWith('badge_')) {
        path.unshift(label);
      }
      
      if (!currentNode.parentId) break;
      currentNode = allNodes.find((n) => n.id === currentNode!.parentId);
    }

    return path;
  };

  const handleLogout = () => {
    userStorage.clear();
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
            <mark key={index} className="bg-yellow-200 text-gray-900">
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
    <header className={`bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-[60] ${isHomePage ? '' : 'sticky top-0'}`}>
      <div className="flex items-center gap-6">
        {/* 로고 */}
        <Link href="/">
          <button className="flex items-center hover:opacity-80 transition-opacity">
            <Image
              src="/new_logo.png"
              alt="episode"
              width={70}
              height={24}
              className="h-6 w-auto"
              priority
            />
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
              className="h-9 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            
            {/* 검색 결과 드롭다운 */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.projectId}-${result.nodeId}-${index}`}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* 노드 이름 */}
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {highlightText(result.nodeLabel, searchQuery)}
                        </div>
                        
                        {/* 경로 */}
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
                <p className="text-sm text-gray-500 text-center">
                  검색 결과가 없습니다
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
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
            <Button variant="ghost" className="text-gray-700">
              로그인/회원가입
            </Button>
          </Link>
        ) : (
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 h-9 px-3 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}님</span>
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[80]">
                {/* 사용자 정보 */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                </div>
                {/* 메뉴 항목 */}
                <div className="py-1">
                  <Link
                    href="/mindmaps"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Map className="w-4 h-4" />
                    마인드맵 목록
                  </Link>
                  <Link
                    href="/archive"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Archive className="w-4 h-4" />
                    에피소드 아카이브
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
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
        <div className="fixed inset-0 bg-white z-50 md:hidden">
          <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <button
                onClick={() => {
                  setShowMobileSearch(false);
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                className="text-gray-600"
              >
                ← 뒤로
              </button>
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="경험 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                />
              </div>
            </div>

            {/* 검색 결과 */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery.trim() && searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.projectId}-${result.nodeId}-${index}`}
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full px-4 py-4 text-left active:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* 노드 이름 */}
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {highlightText(result.nodeLabel, searchQuery)}
                          </div>
                          
                          {/* 경로 */}
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
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
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">검색 결과가 없습니다</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
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

