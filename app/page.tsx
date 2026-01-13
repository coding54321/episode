'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingHeader from '@/components/FloatingHeader';
import { userStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@/types';

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // OAuth 코드가 있으면 콜백 페이지로 리다이렉트
    const code = searchParams?.get('code');
    if (code) {
      const next = searchParams?.get('state') || '/mindmaps';
      router.replace(`/auth/callback?code=${code}&next=${encodeURIComponent(next)}`);
      return;
    }

    const loadUser = async () => {
      const currentUser = await userStorage.load();
      setUser(currentUser);
    };
    loadUser();
  }, [searchParams, router]);

  const handleFeatureClick = (feature: string) => {
    // 기능 설명 페이지로 이동 (FloatingHeader의 기능 드롭다운과 동일)
    switch (feature) {
      case 'mindmap':
        router.push('/features/mindmap');
        break;
      case 'gap-diagnosis':
        router.push('/features/gap-diagnosis');
        break;
      case 'archive':
        router.push('/features/archive');
        break;
    }
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* 플로팅 헤더바 */}
      <FloatingHeader />

      {/* 히어로 섹션 */}
      <section className="px-5 pt-32 pb-24 md:pt-40 md:pb-32 relative">
        {/* 큰 반투명 episode 로고 배경 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-[200px] md:text-[300px] font-bold text-[#1a1a1a] dark:text-[#1a1a1a] opacity-30 dark:opacity-20 select-none">
            episode
          </h1>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* 텍스트 + 로고 이미지 */}
            <div className="mb-8 flex flex-col items-center">
              {/* 캐치프레이즈 - 노드 연결 애니메이션 */}
              <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-6 tracking-tight flex items-center flex-wrap justify-center">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mr-4"
                >
                  당신의 모든
                </motion.span>
                
                <div className="flex items-center">
                  {/* 첫 번째 노드 박스 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="relative inline-block px-6 py-3 bg-gray-100 dark:bg-[#2a2a2a] border-2 border-gray-300 dark:border-[#3a3a3a] rounded-xl text-gray-900 dark:text-[#e5e5e5]"
                  >
                    경험을
                  </motion.div>

                  {/* 연결선 */}
                  <motion.svg
                    width="80"
                    height="4"
                    className="inline-block"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.8, ease: "easeInOut" }}
                  >
                    <motion.line
                      x1="0"
                      y1="2"
                      x2="80"
                      y2="2"
                      stroke="#60A5FA"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="dark:stroke-[#60A5FA]"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.8, ease: "easeInOut" }}
                    />
                    {/* 연결선 양쪽 원 */}
                    <motion.circle
                      cx="0"
                      cy="2"
                      r="4"
                      fill="#60A5FA"
                      className="dark:fill-[#60A5FA]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 1.1 }}
                    />
                    <motion.circle
                      cx="80"
                      cy="2"
                      r="4"
                      fill="#60A5FA"
                      className="dark:fill-[#60A5FA]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 1.1 }}
                    />
                  </motion.svg>

                  {/* 두 번째 노드 박스 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.6 }}
                    className="relative inline-block px-6 py-3 bg-gray-100 dark:bg-[#2a2a2a] border-2 border-gray-300 dark:border-[#3a3a3a] rounded-xl text-gray-900 dark:text-[#e5e5e5]"
                  >
                    잇다
                  </motion.div>
                </div>
              </div>
            </div>
            
            <p className="text-lg md:text-xl text-gray-600 dark:text-[#a0a0a0] mb-12 max-w-2xl mx-auto leading-relaxed">
              공백 진단부터 경험 공유까지, 취업 준비의 모든 과정을 한 곳에서
            </p>
            
            {/* 노드 스타일 버튼 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 2.0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/login">
                <div className="relative inline-block group">
                  {/* 연결선 효과 (왼쪽) */}
                  <motion.div
                    className="absolute -left-16 top-1/2 w-12 h-0.5 bg-blue-400 dark:bg-[#60A5FA]"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 2.3 }}
                  />
                  
                  {/* 연결선 효과 (오른쪽) */}
                  <motion.div
                    className="absolute -right-16 top-1/2 w-12 h-0.5 bg-blue-400 dark:bg-[#60A5FA]"
                    initial={{ scaleX: 0, originX: 1 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 2.3 }}
                  />
                  
                  {/* 노드 스타일 버튼 - 레퍼런스 스타일 */}
                  <motion.div
                    className="relative px-8 py-4 bg-[#1e3a8a] dark:bg-[#1e3a8a] border-2 border-[#60A5FA] dark:border-[#60A5FA] rounded-xl transition-all duration-300 cursor-pointer"
                    whileHover={{ y: -2 }}
                  >
                    {/* 버튼 텍스트 */}
                    <div className="relative flex items-center gap-2 text-lg font-bold text-white">
                      <span>무료로 시작하기</span>
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="px-5 py-24 border-t border-gray-100 dark:border-[#2a2a2a]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-[#e5e5e5] tracking-tight flex items-center justify-center gap-3 flex-wrap">
              취업준비{' '}
              <span className="inline-block px-4 py-2 bg-gray-100 dark:bg-[#2a2a2a] border-2 border-gray-300 dark:border-[#3a3a3a] rounded-xl text-inherit">
                소스
              </span>
              {' '}정리,
              <Image
                src="/new_logo.png"
                alt="Episode"
                width={120}
                height={40}
                className="object-contain h-10"
                priority
              />
              와 함께
            </h2>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                icon: Brain,
                title: '마인드맵',
                description: '경험을 시각적으로 구조화하고 관리하세요',
                color: 'bg-blue-50',
                iconColor: 'text-blue-600',
                key: 'mindmap',
              },
              {
                icon: Sparkles,
                title: '공백 진단',
                description: '기출 자소서 문항 기반 약점 분석',
                color: 'bg-orange-50',
                iconColor: 'text-orange-600',
                key: 'gap-diagnosis',
              },
              {
                icon: FileText,
                title: '에피소드 아카이브',
                description: 'STAR 기법으로 경험 정리',
                color: 'bg-green-50',
                iconColor: 'text-green-600',
                key: 'archive',
              },
            ].map((feature, index) => (
              <motion.button
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => handleFeatureClick(feature.key)}
                className="w-full flex items-start gap-6 p-8 rounded-[20px] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all duration-200 group text-left"
              >
                <div className={`w-16 h-16 ${feature.color} dark:bg-[#2a2a2a] rounded-[16px] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <feature.icon className={`w-8 h-8 ${feature.iconColor} dark:text-[#60A5FA]`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-[#e5e5e5]">{feature.title}</h3>
                  <p className="text-lg text-gray-600 dark:text-[#a0a0a0] leading-relaxed">{feature.description}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 dark:text-[#606060] group-hover:text-gray-900 dark:group-hover:text-[#e5e5e5] flex-shrink-0 transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="px-5 py-16 border-t border-gray-100 dark:border-[#2a2a2a]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-400 dark:text-[#606060]">© 2025 Episode</p>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
