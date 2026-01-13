'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Brain, Network, Zap, Share2, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingHeader from '@/components/FloatingHeader';
import { userStorage } from '@/lib/storage';
import { useEffect, useState } from 'react';
import type { User } from '@/types';

export default function MindMapFeaturePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await userStorage.load();
      setUser(currentUser);
    };
    checkUser();
  }, []);

  const handleGetStarted = () => {
    if (!user) {
      router.push('/login?returnUrl=/badge-selection');
    } else {
      router.push('/mindmaps');
    }
  };

  const features = [
    {
      icon: Network,
      title: '시각적 구조화',
      description: '경험을 노드와 연결선으로 시각화하여 한눈에 파악할 수 있습니다',
    },
    {
      icon: Zap,
      title: '직관적인 편집',
      description: '드래그 앤 드롭으로 노드 위치를 자유롭게 조정하고, 더블클릭으로 즉시 수정할 수 있습니다',
    },
    {
      icon: Brain,
      title: 'AI 어시스턴트 연동',
      description: '노드를 선택하면 AI가 STAR 방식으로 경험을 구조화하는 것을 도와줍니다',
    },
    {
      icon: Share2,
      title: '경험 공유',
      description: '특정 노드를 공유 링크로 만들어 다른 사람과 경험을 나눌 수 있습니다',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <FloatingHeader />

      {/* 히어로 섹션 */}
      <section className="px-5 pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-6">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">마인드맵</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-6 tracking-tight">
              경험을 시각적으로
              <br />
              구조화하세요
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-[#a0a0a0] max-w-3xl mx-auto leading-relaxed">
              복잡한 경험들을 노드와 연결선으로 표현하여<br />
              한눈에 파악하고 체계적으로 관리할 수 있습니다
            </p>
          </motion.div>
        </div>
      </section>

      {/* 메인 기능 설명 */}
      <section className="px-5 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
            {/* GIF 프레임 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-purple-50 dark:to-purple-900/20 rounded-[24px] p-8 border border-gray-200 dark:border-[#2a2a2a] shadow-2xl">
                {/* GIF placeholder - 프레임만 */}
                <div className="relative w-full aspect-video bg-white dark:bg-[#1a1a1a] rounded-[16px] border-2 border-gray-300 dark:border-[#2a2a2a] overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Brain className="w-16 h-16 text-gray-400 dark:text-[#606060] mx-auto mb-4" />
                      <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">마인드맵 GIF</p>
                    </div>
                  </div>
                  {/* 브라우저 프레임 효과 */}
                  <div className="absolute top-0 left-0 right-0 h-8 bg-gray-100 dark:bg-[#2a2a2a] border-b border-gray-300 dark:border-[#3a3a3a] flex items-center gap-2 px-3">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 설명 텍스트 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-4">
                모든 경험을 한 곳에서
              </h2>
              <p className="text-lg text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                인턴, 동아리, 프로젝트 등 다양한 경험을 대분류로 나누고, 각 경험에서 발생한 에피소드를 계층적으로 구조화합니다.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-[#e5e5e5] mb-1">직관적인 노드 편집</p>
                    <p className="text-gray-600 dark:text-[#a0a0a0] text-sm">더블클릭으로 즉시 수정하고, 드래그로 자유롭게 배치하세요</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-[#e5e5e5] mb-1">무한 확장 가능</p>
                    <p className="text-gray-600 dark:text-[#a0a0a0] text-sm">원하는 만큼 하위 노드를 추가하여 세부 경험을 기록하세요</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-[#e5e5e5] mb-1">AI와 함께 구조화</p>
                    <p className="text-gray-600 dark:text-[#a0a0a0] text-sm">노드를 선택하면 AI 어시스턴트가 STAR 방식으로 경험을 정리해줍니다</p>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 주요 특징 */}
      <section className="px-5 py-20 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-4">
              마인드맵의 강점
            </h2>
            <p className="text-lg text-gray-600 dark:text-[#a0a0a0]">
              복잡한 경험을 체계적으로 관리하는 다양한 방법
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white dark:bg-[#1a1a1a] rounded-[20px] p-8 border border-gray-200 dark:border-[#2a2a2a] hover:shadow-lg transition-shadow card-hover"
              >
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-[12px] flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-[#a0a0a0] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="px-5 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-white dark:bg-[#1e3a8a] hover:bg-gray-50 dark:hover:bg-[#1e40af] text-gray-900 dark:text-white border-2 border-gray-900 dark:border-[#60A5FA] font-semibold h-14 px-8 rounded-[12px] shadow-lg flex items-center gap-3 mx-auto"
            >
              <Image
                src="/new_logo.png"
                alt="Episode Logo"
                width={80}
                height={30}
                className="h-6 w-auto object-contain"
              />
              <span>지금 시작하기</span>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

