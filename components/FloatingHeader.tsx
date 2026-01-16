'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { ThemeToggle } from '@/components/theme-toggle';

export default function FloatingHeader() {
  const router = useRouter();
  const { user, loading, signOut } = useUnifiedAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const isActive = (path: string) => {
    if (typeof window === 'undefined') return false;
    const pathname = window.location.pathname;
    if (path === '/mindmaps' || path === '/mindmap') {
      return pathname.startsWith('/mindmap');
    }
    if (path === '/gap-diagnosis-standalone') {
      return pathname === '/gap-diagnosis-standalone';
    }
    return pathname === path;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-5 py-4">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 로고 + 네비게이션 */}
          <div className="flex items-center gap-6">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                episode
              </span>
            </Link>

            {/* 네비게이션 링크 (로그인된 경우에만 표시) */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/mindmaps"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/mindmaps')
                      ? 'text-[#5B6EFF] bg-[#5B6EFF]/10'
                      : 'text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  마인드맵
                </Link>
                <Link
                  href="/archive"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/archive')
                      ? 'text-[#5B6EFF] bg-[#5B6EFF]/10'
                      : 'text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  아카이브
                </Link>
                <Link
                  href="/gap-diagnosis-standalone"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/gap-diagnosis-standalone')
                      ? 'text-[#5B6EFF] bg-[#5B6EFF]/10'
                      : 'text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  공백 진단하기
                </Link>
              </nav>
            )}
          </div>

          {/* 오른쪽: 테마 토글 + 로그인/가입 버튼 또는 사용자 정보 */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {loading ? (
              // 로딩 중일 때 스켈레톤
              <div className="w-24 h-9 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            ) : user ? (
              // 로그인된 상태
              <div 
                className="relative" 
                ref={userMenuRef}
                onMouseEnter={() => setIsUserMenuOpen(true)}
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-[#e5e5e5] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full h-9 px-4"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-[#5B6EFF] to-[#7B8FFF] rounded-full flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 10px rgba(91, 110, 255, 0.3)' }}>
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span>{user.name || user.email?.split('@')[0] || 'User'}님</span>
                </Button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-4 w-48 glass-card rounded-[16px] shadow-2xl overflow-hidden"
                    >
                      {/* 사용자 정보 */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                        <p className="text-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">{user.name || user.email?.split('@')[0] || 'User'}</p>
                        <p className="text-xs text-gray-500 dark:text-[#a0a0a0] mt-1">{user.email || ''}</p>
                      </div>

                      {/* 메뉴 항목 */}
                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-[#e5e5e5] hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50 flex items-center gap-2 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          로그아웃
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              // 로그인 안된 상태
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-sm font-medium text-gray-700 dark:text-[#e5e5e5] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full h-9 px-4"
                  >
                    로그인
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="text-sm font-semibold bg-gray-900 dark:bg-[#1e3a8a] hover:bg-gray-800 dark:hover:bg-[#1e40af] text-white rounded-full h-9 px-5 shadow-sm">
                    가입하기
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

