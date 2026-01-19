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
  const isMindMapProjectPage = /^\/mindmap\/[^/]+$/.test(pathname); // 개별 마인드맵 페이지인지 확인

  return (
    <header className={`bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-[60] transition-colors ${isHomePage ? '' : 'sticky top-0'}`}>
      <div className="flex items-center gap-6">
        {/* 로고 */}
        <Link href="/">
          <button className="flex items-center hover:opacity-80 transition-opacity">
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              episode
            </span>
          </button>
        </Link>

        {/* 네비게이션 링크 (로그인된 경우에만 표시) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/mindmaps"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/mindmaps')
                  ? 'text-[#5B6EFF] bg-[#5B6EFF]/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              마인드맵
            </Link>
            <Link
              href="/archive"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/archive')
                  ? 'text-[#5B6EFF] bg-[#5B6EFF]/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              에피소드 보관함
            </Link>
            <Link
              href="/gap-diagnosis-standalone"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/gap-diagnosis-standalone')
                  ? 'text-[#5B6EFF] bg-[#5B6EFF]/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              기출문항 셀프진단
            </Link>
          </nav>
        )}

      </div>

      <div className="flex items-center gap-3">
        {/* 로그인 버튼 또는 사용자 메뉴 */}
        {!user ? (
          <Link href="/login">
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
              로그인/회원가입
            </Button>
          </Link>
        ) : (
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 h-9 px-3 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-[#5B6EFF] to-[#7B8FFF] rounded-full flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 10px rgba(91, 110, 255, 0.3)' }}>
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}님</span>
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 glass-card rounded-lg shadow-lg z-[80]">
                {/* 사용자 정보 */}
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                </div>
                {/* 메뉴 항목 */}
                <div className="py-1">
                  <Link
                    href="/mindmaps"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50/50 flex items-center gap-2 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Map className="w-4 h-4" />
                    마인드맵 목록
                  </Link>
                  <Link
                    href="/archive"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50/50 flex items-center gap-2 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Archive className="w-4 h-4" />
                    에피소드 보관함
                  </Link>
                  <Link
                    href="/gap-diagnosis-standalone"
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50/50 flex items-center gap-2 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Search className="w-4 h-4" />
                    기출문항 셀프진단
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50/50 flex items-center gap-2 transition-colors"
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

      {/* (전역 검색바 및 모바일 검색은 제거됨) */}
    </header>
  );
}

