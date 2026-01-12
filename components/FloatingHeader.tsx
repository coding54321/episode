'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Brain, MessageSquare, FileText, Sparkles, ChevronDown, User, Map, LogOut, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';

export default function FloatingHeader() {
  const router = useRouter();
  const { user, loading, signOut } = useUnifiedAuth();
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
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
      <div className="bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-gray-200/50 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 로고 + 네비게이션 */}
          <div className="flex items-center gap-8">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/new_logo.png"
                alt="Episode Logo"
                width={90}
                height={30}
                className="object-contain"
                priority
              />
            </Link>

            {/* 네비게이션 */}
            <nav className="hidden md:flex items-center gap-8">
              {/* 기능 드롭다운 */}
              <div 
                className="relative"
                onMouseEnter={() => setIsFeaturesOpen(true)}
                onMouseLeave={() => setIsFeaturesOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                  기능
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFeaturesOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isFeaturesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[280px] bg-white rounded-[20px] shadow-2xl border border-gray-200/50 p-3"
                    >
                      <div className="flex flex-col gap-1">
                        <Link href="/features/mindmap" className="p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Brain className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                                마인드맵
                              </h3>
                              <p className="text-xs text-gray-600 leading-snug truncate">
                                경험을 시각적으로 구조화
                              </p>
                            </div>
                          </div>
                        </Link>

                        <Link href="/features/gap-diagnosis" className="p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Sparkles className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-gray-900 group-hover:text-orange-600 transition-colors">
                                공백 진단
                              </h3>
                              <p className="text-xs text-gray-600 leading-snug truncate">
                                기출 자소서 문항 기반 약점 분석
                              </p>
                            </div>
                          </div>
                        </Link>

                        <Link href="/features/archive" className="p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Archive className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-gray-900 group-hover:text-green-600 transition-colors">
                                에피소드 아카이브
                              </h3>
                              <p className="text-xs text-gray-600 leading-snug truncate">
                                STAR 기법으로 경험 정리
                              </p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>
          </div>

          {/* 오른쪽: 로그인/가입 버튼 또는 사용자 정보 */}
          <div className="flex items-center gap-3">
            {loading ? (
              // 로딩 중일 때 스켈레톤
              <div className="w-24 h-9 bg-gray-200 rounded-full animate-pulse" />
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
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full h-9 px-4"
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
                      className="absolute right-0 mt-4 w-48 bg-white rounded-[16px] shadow-2xl border border-gray-200/50 overflow-hidden"
                    >
                      {/* 사용자 정보 */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user.name || user.email?.split('@')[0] || 'User'}</p>
                        <p className="text-xs text-gray-500 mt-1">{user.email || ''}</p>
                      </div>

                      {/* 메뉴 항목 */}
                      <div className="py-1">
                        <Link
                          href="/mindmaps"
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Map className="w-4 h-4" />
                          마인드맵 목록
                        </Link>
                        <Link
                          href="/archive"
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                          에피소드 아카이브
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
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
                    className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full h-9 px-4"
                  >
                    로그인
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-full h-9 px-5 shadow-sm">
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

