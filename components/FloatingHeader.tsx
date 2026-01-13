'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, Map, LogOut, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl"
    >
      <div className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl rounded-full shadow-lg border border-gray-200/50 dark:border-[#2a2a2a]/50 px-6 py-3 glow-subtle">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 로고 */}
          <div className="flex items-center gap-8">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                episode
              </span>
            </Link>

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
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
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
                        <Link
                          href="/mindmaps"
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-[#e5e5e5] hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50 flex items-center gap-2 transition-colors"
                        >
                          <Map className="w-4 h-4" />
                          마인드맵 목록
                        </Link>
                        <Link
                          href="/archive"
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-[#e5e5e5] hover:bg-gray-50/50 dark:hover:bg-[#2a2a2a]/50 flex items-center gap-2 transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                          에피소드 아카이브
                        </Link>
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
    </motion.header>
  );
}

