'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, FileText, Sparkles, ChevronRight, Network, Layers, Search, Tag, Share2, Layout, Grid3x3 } from 'lucide-react';
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
    // 각 기능의 실제 페이지로 이동
    switch (feature) {
      case 'mindmap':
        if (user) {
          router.push('/badge-selection');
        } else {
          router.push('/login');
        }
        break;
      case 'gap-diagnosis':
        if (user) {
          router.push('/mindmaps');
        } else {
          router.push('/login');
        }
        break;
      case 'archive':
        if (user) {
          router.push('/archive');
        } else {
          router.push('/login');
        }
        break;
    }
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#000000]">
      {/* 플로팅 헤더바 */}
      <FloatingHeader />

      {/* 히어로 섹션 - Runway & Webflow 스타일 */}
      <section className="px-5 pt-40 pb-32 md:pt-56 md:pb-48 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 md:space-y-8"
          >
            {/* 슬로건 - 작고 심플하게 */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xs md:text-sm text-gray-500 dark:text-[#808080] tracking-wider uppercase font-medium"
            >
              당신의 모든 경험을 잇다
            </motion.p>

            {/* 메인 헤드라인 - 매우 크고 임팩트있게 */}
            <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.1] px-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              episode
            </motion.h1>

            {/* 서브 헤드라인/설명 - 중간 크기 */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-[#b0b0b0] max-w-3xl mx-auto leading-relaxed font-normal px-4"
            >
              기출문항 셀프진단부터 경험 공유까지,<br className="hidden md:block" /> 취업 준비의 모든 과정을 한 곳에서
            </motion.p>
            
            {/* CTA 버튼들 - Primary + Secondary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="flex items-center justify-center gap-4 pt-4 flex-wrap"
            >
              {/* Primary CTA */}
              <Link href="/login">
                <motion.button
                  className="px-7 py-3.5 bg-gradient-to-r from-[#5B6EFF] to-[#7B8FFF] rounded-lg text-white font-semibold text-base transition-all duration-300"
                  whileHover={{
                    scale: 1.02,
                    boxShadow: '0 8px 24px rgba(91, 110, 255, 0.35)'
                  }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    boxShadow: '0 4px 16px rgba(91, 110, 255, 0.25)'
                  }}
                      >
                  무료로 시작하기
                </motion.button>
              </Link>

              {/* Secondary CTA */}
              <motion.button
                onClick={() => {
                  const featuresSection = document.getElementById('features-section');
                  featuresSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-7 py-3.5 bg-white dark:bg-[#1a1a1a] border-2 border-gray-200 dark:border-[#3a3a3a] rounded-lg text-gray-700 dark:text-[#e5e5e5] font-semibold text-base transition-all duration-300 cursor-pointer"
                whileHover={{
                  scale: 1.02,
                  borderColor: '#5B6EFF'
                }}
                whileTap={{ scale: 0.98 }}
              >
                둘러보기
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section id="features-section" className="px-5 py-24 border-t border-gray-100 dark:border-[#2a2a2a]">
        <div className="max-w-6xl mx-auto">
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
              {' '}정리,{' '}
              <span className="text-inherit font-bold">
                episode
              </span>
              {' '}와 함께
            </h2>
          </motion.div>

          {/* 마인드맵 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-32"
          >
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* 왼쪽: 텍스트 설명 */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#5B6EFF] to-[#7B8FFF] rounded-[16px] flex items-center justify-center shadow-lg"
                       style={{ boxShadow: '0 0 20px rgba(91, 110, 255, 0.3)' }}>
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#e5e5e5]">
                    마인드맵
                  </h3>
                </div>
                <p className="text-xl text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                  경험을 시각적으로 구조화하고 관리하세요. 노드로 연결하고 계층 구조로 체계적으로 정리할 수 있습니다.
                </p>
                <div className="space-y-3 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#5B6EFF]/20 dark:bg-[#5B6EFF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#5B6EFF] dark:bg-[#7B8FFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">배지별 경험 분류 및 시각적 구조화</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#5B6EFF]/20 dark:bg-[#5B6EFF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#5B6EFF] dark:bg-[#7B8FFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">드래그 앤 드롭으로 자유로운 배치</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#5B6EFF]/20 dark:bg-[#5B6EFF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#5B6EFF] dark:bg-[#7B8FFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">실시간 협업 및 공유 기능</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#5B6EFF]/20 dark:bg-[#5B6EFF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#5B6EFF] dark:bg-[#7B8FFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">다양한 레이아웃 옵션 (원형, 트리형)</p>
                  </div>
                </div>
                <div className="pt-4">
                  <motion.button
                    onClick={() => handleFeatureClick('mindmap')}
                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(91, 110, 255, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-[#5B6EFF] to-[#7B8FFF] text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg"
                    style={{ boxShadow: '0 0 20px rgba(91, 110, 255, 0.3)' }}
                  >
                    마인드맵 만들기
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
              {/* 오른쪽: 시각적 요소 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  {/* 글로우 효과 배경 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#5B6EFF]/30 to-[#7B8FFF]/30 rounded-3xl blur-3xl opacity-50" />
                  <div className="relative bg-gradient-to-br from-[#5B6EFF]/10 to-[#7B8FFF]/20 dark:from-[#5B6EFF]/20 dark:to-[#7B8FFF]/30 rounded-3xl p-8 border-2 border-[#5B6EFF]/30 dark:border-[#7B8FFF]/40 backdrop-blur-sm">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-3 flex justify-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#5B6EFF] to-[#7B8FFF] rounded-2xl flex items-center justify-center shadow-lg"
                             style={{ boxShadow: '0 0 30px rgba(91, 110, 255, 0.5)' }}>
                          <Network className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-md border border-[#5B6EFF]/20 dark:border-[#7B8FFF]/30">
                        <Layers className="w-8 h-8 text-[#5B6EFF] dark:text-[#7B8FFF]" />
                      </div>
                      <div className="w-16 h-16 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-md border border-[#5B6EFF]/20 dark:border-[#7B8FFF]/30">
                        <Layout className="w-8 h-8 text-[#5B6EFF] dark:text-[#7B8FFF]" />
                      </div>
                      <div className="w-16 h-16 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-md border border-[#5B6EFF]/20 dark:border-[#7B8FFF]/30">
                        <Share2 className="w-8 h-8 text-[#5B6EFF] dark:text-[#7B8FFF]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 기출문항 셀프진단 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-32"
          >
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16">
              {/* 오른쪽: 텍스트 설명 */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#4B5EEF] to-[#6B7EFF] rounded-[16px] flex items-center justify-center shadow-lg"
                       style={{ boxShadow: '0 0 20px rgba(75, 94, 239, 0.3)' }}>
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#e5e5e5]">
                    기출문항 셀프진단
                  </h3>
                </div>
                <p className="text-xl text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                  기출 자소서 문항 기반으로 약점을 분석하세요. 부족한 역량을 찾아 추천 인벤토리에 자동으로 추가합니다.
                </p>
                <div className="space-y-3 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#4B5EEF]/20 dark:bg-[#4B5EEF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#4B5EEF] dark:bg-[#6B7EFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">주요 기업별 자소서 문항 분석</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#4B5EEF]/20 dark:bg-[#4B5EEF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#4B5EEF] dark:bg-[#6B7EFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">답변 어려움 정도 평가 시스템</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#4B5EEF]/20 dark:bg-[#4B5EEF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#4B5EEF] dark:bg-[#6B7EFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">자동 역량 태그 추출 및 관리</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#4B5EEF]/20 dark:bg-[#4B5EEF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#4B5EEF] dark:bg-[#6B7EFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">추천 인벤토리로 바로 추가</p>
                  </div>
                </div>
                <div className="pt-4">
              <motion.button
                    onClick={() => handleFeatureClick('gap-diagnosis')}
                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(75, 94, 239, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-[#4B5EEF] to-[#6B7EFF] text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg"
                    style={{ boxShadow: '0 0 20px rgba(75, 94, 239, 0.3)' }}
                  >
                    기출문항 셀프진단 시작하기
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
              {/* 왼쪽: 시각적 요소 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  {/* 글로우 효과 배경 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4B5EEF]/30 to-[#6B7EFF]/30 rounded-3xl blur-3xl opacity-50" />
                  <div className="relative bg-gradient-to-br from-[#4B5EEF]/10 to-[#6B7EFF]/20 dark:from-[#4B5EEF]/20 dark:to-[#6B7EFF]/30 rounded-3xl p-8 border-2 border-[#4B5EEF]/30 dark:border-[#6B7EFF]/40 backdrop-blur-sm">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-md border border-[#4B5EEF]/20 dark:border-[#6B7EFF]/30">
                          <Search className="w-6 h-6 text-[#4B5EEF] dark:text-[#6B7EFF]" />
                        </div>
                        <div className="flex-1 h-12 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center px-4 shadow-md border border-[#4B5EEF]/20 dark:border-[#6B7EFF]/30">
                          <div className="w-full h-2 bg-[#4B5EEF]/20 dark:bg-[#4B5EEF]/30 rounded-full">
                            <div className="w-3/4 h-2 bg-gradient-to-r from-[#4B5EEF] to-[#6B7EFF] rounded-full" />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-16 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-md border border-[#4B5EEF]/20 dark:border-[#6B7EFF]/30">
                          <Tag className="w-6 h-6 text-[#4B5EEF] dark:text-[#6B7EFF]" />
                        </div>
                        <div className="h-16 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-md border border-[#4B5EEF]/20 dark:border-[#6B7EFF]/30">
                          <FileText className="w-6 h-6 text-[#4B5EEF] dark:text-[#6B7EFF]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 에피소드 보관함 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-32"
          >
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* 왼쪽: 텍스트 설명 */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#8B9FFF] to-[#ABAFFF] rounded-[16px] flex items-center justify-center shadow-lg"
                       style={{ boxShadow: '0 0 20px rgba(139, 159, 255, 0.3)' }}>
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#e5e5e5]">
                    에피소드 보관함
                  </h3>
                </div>
                <p className="text-xl text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                  모든 경험을 STAR 기법으로 체계적으로 정리하세요. 한눈에 보는 경험 목록과 강력한 검색 기능을 제공합니다.
                </p>
                <div className="space-y-3 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#8B9FFF]/20 dark:bg-[#8B9FFF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#8B9FFF] dark:bg-[#ABAFFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">STAR 구성 요소별 체계적 작성</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#8B9FFF]/20 dark:bg-[#8B9FFF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#8B9FFF] dark:bg-[#ABAFFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">프로젝트/카테고리별 필터링</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#8B9FFF]/20 dark:bg-[#8B9FFF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#8B9FFF] dark:bg-[#ABAFFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">태그 기반 검색 및 관리</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#8B9FFF]/20 dark:bg-[#8B9FFF]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#8B9FFF] dark:bg-[#ABAFFF]" />
                    </div>
                    <p className="text-gray-700 dark:text-[#d0d0d0]">한눈에 보는 경험 목록</p>
                  </div>
                </div>
                <div className="pt-4">
                  <motion.button
                    onClick={() => handleFeatureClick('archive')}
                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(139, 159, 255, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-[#8B9FFF] to-[#ABAFFF] text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg"
                    style={{ boxShadow: '0 0 20px rgba(139, 159, 255, 0.3)' }}
                  >
                    에피소드 보관함 보기
                    <ArrowRight className="w-5 h-5" />
              </motion.button>
                </div>
              </div>
              {/* 오른쪽: 시각적 요소 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  {/* 글로우 효과 배경 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8B9FFF]/30 to-[#ABAFFF]/30 rounded-3xl blur-3xl opacity-50" />
                  <div className="relative bg-gradient-to-br from-[#8B9FFF]/10 to-[#ABAFFF]/20 dark:from-[#8B9FFF]/20 dark:to-[#ABAFFF]/30 rounded-3xl p-8 border-2 border-[#8B9FFF]/30 dark:border-[#ABAFFF]/40 backdrop-blur-sm">
                    <div className="space-y-3">
                      <div className="h-12 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center px-4 shadow-md border border-[#8B9FFF]/20 dark:border-[#ABAFFF]/30">
                        <Grid3x3 className="w-5 h-5 text-[#8B9FFF] dark:text-[#ABAFFF] mr-3" />
                        <div className="flex-1 text-sm text-gray-500 dark:text-[#a0a0a0]">검색...</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 bg-white dark:bg-[#1A1A1A] rounded-xl p-3 shadow-md border border-[#8B9FFF]/20 dark:border-[#ABAFFF]/30">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#8B9FFF] to-[#ABAFFF] rounded-lg mb-2" />
                          <div className="h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded w-3/4 mb-1" />
                          <div className="h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded w-1/2" />
                        </div>
                        <div className="h-20 bg-white dark:bg-[#1A1A1A] rounded-xl p-3 shadow-md border border-[#8B9FFF]/20 dark:border-[#ABAFFF]/30">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#8B9FFF] to-[#ABAFFF] rounded-lg mb-2" />
                          <div className="h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded w-3/4 mb-1" />
                          <div className="h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
          </motion.div>
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
