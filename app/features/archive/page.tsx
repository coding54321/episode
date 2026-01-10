'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Archive, Table, Edit, Filter, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingHeader from '@/components/FloatingHeader';
import { userStorage } from '@/lib/storage';
import { useEffect, useState } from 'react';
import type { User } from '@/types';

export default function ArchiveFeaturePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await userStorage.load();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const handleGetStarted = () => {
    if (!user) {
      router.push('/login?returnUrl=/archive');
    } else {
      router.push('/mindmaps');
    }
  };

  const features = [
    {
      icon: Table,
      title: '테이블 형식 관리',
      description: '모든 에피소드를 한눈에 볼 수 있는 테이블 형식으로 프로젝트, 대분류, 경험, 에피소드를 계층적으로 표시합니다',
    },
    {
      icon: Edit,
      title: '인라인 편집',
      description: '테이블에서 직접 STAR 내용을 편집하고 태그를 추가하여 즉시 반영할 수 있습니다',
    },
    {
      icon: Filter,
      title: '스마트 필터링',
      description: '대분류, 역량 태그, 검색어로 원하는 에피소드를 빠르게 찾을 수 있습니다',
    },
    {
      icon: Archive,
      title: '통합 관리',
      description: '여러 마인드맵의 에피소드를 한 곳에서 통합하여 관리하고 비교할 수 있습니다',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full mb-6">
              <Archive className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-600">에피소드 아카이브</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              STAR 기법으로
              <br />
              경험 정리
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              모든 경험을 테이블 형식으로 한눈에 보고<br />
              STAR 방식으로 체계적으로 정리하세요
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
              <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-[24px] p-8 border border-gray-200 shadow-2xl">
                {/* GIF placeholder - 프레임만 */}
                <div className="relative w-full aspect-video bg-white rounded-[16px] border-2 border-gray-300 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">에피소드 아카이브 GIF</p>
                    </div>
                  </div>
                  {/* 브라우저 프레임 효과 */}
                  <div className="absolute top-0 left-0 right-0 h-8 bg-gray-100 border-b border-gray-300 flex items-center gap-2 px-3">
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                모든 경험을 한 곳에서
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                여러 마인드맵에 분산된 에피소드들을 테이블 형식으로 통합하여 관리합니다. 프로젝트, 대분류, 경험, 에피소드의 계층 구조를 한눈에 파악하고, STAR 내용을 직접 편집할 수 있습니다.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">계층적 구조 표시</p>
                    <p className="text-gray-600 text-sm">프로젝트, 대분류, 경험을 병합하여 표시하여 중복을 제거하고 가독성을 높입니다</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">인라인 편집</p>
                    <p className="text-gray-600 text-sm">테이블에서 직접 STAR 필드와 태그를 편집하여 즉시 마인드맵에 반영됩니다</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">통합 관리</p>
                    <p className="text-gray-600 text-sm">여러 마인드맵의 에피소드를 한 곳에서 관리하여 전체 경험을 종합적으로 파악할 수 있습니다</p>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 주요 특징 */}
      <section className="px-5 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              에피소드 아카이브의 특징
            </h2>
            <p className="text-lg text-gray-600">
              체계적인 테이블 관리로 모든 경험을 효율적으로 정리하세요
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
                className="bg-white rounded-[20px] p-8 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
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
              className="bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-900 font-semibold h-14 px-8 rounded-[12px] shadow-lg flex items-center gap-3 mx-auto"
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

