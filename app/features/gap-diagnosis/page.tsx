'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sparkles, FileSearch, Target, TrendingUp, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingHeader from '@/components/FloatingHeader';
import { userStorage } from '@/lib/storage';
import { useEffect, useState } from 'react';
import type { User } from '@/types';

export default function GapDiagnosisFeaturePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = userStorage.load();
    setUser(currentUser);
  }, []);

  const handleGetStarted = () => {
    if (!user) {
      router.push('/login?returnUrl=/gap-diagnosis');
    } else {
      router.push('/mindmaps');
    }
  };

  const features = [
    {
      icon: FileSearch,
      title: '기출 문항 기반',
      description: '실제 기업의 최근 5년간 자소서 문항을 기반으로 분석하여 정확한 약점을 파악합니다',
    },
    {
      icon: Target,
      title: '직무별 맞춤 분석',
      description: '기업과 직무를 선택하면 해당 직무에 필요한 역량을 중심으로 분석합니다',
    },
    {
      icon: TrendingUp,
      title: '부족한 역량 식별',
      description: '소재가 없는 문항을 분석하여 부족한 역량을 자동으로 추출하고 추천 인벤토리에 추가합니다',
    },
    {
      icon: Sparkles,
      title: '체계적인 진단',
      description: '단계별로 진행되는 진단 프로세스로 누락된 경험이나 역량을 놓치지 않습니다',
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full mb-6">
              <Sparkles className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold text-orange-600">공백 진단</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              기출 자소서 문항 기반
              <br />
              약점 분석
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              실제 기업의 기출 문항을 통해<br />
              부족한 경험과 역량을 정확히 파악하세요
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
              <div className="relative bg-gradient-to-br from-orange-50 to-red-50 rounded-[24px] p-8 border border-gray-200 shadow-2xl">
                {/* GIF placeholder - 프레임만 */}
                <div className="relative w-full aspect-video bg-white rounded-[16px] border-2 border-gray-300 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">공백 진단 GIF</p>
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
                정확한 약점 파악
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                실제 기업의 최근 5년간 기출 자소서 문항을 기반으로, 각 문항에 대해 작성할 소재가 있는지 체크하고 부족한 역량을 자동으로 분석합니다.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">기업별 맞춤 진단</p>
                    <p className="text-gray-600 text-sm">원하는 기업과 직무를 선택하면 해당 직무의 기출 문항으로 진단합니다</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">간단한 소재 체크</p>
                    <p className="text-gray-600 text-sm">각 문항에 대해 '있음' 또는 '없음'만 선택하면 자동으로 분석합니다</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">자동 역량 추출</p>
                    <p className="text-gray-600 text-sm">부족한 역량을 자동으로 식별하고 추천 인벤토리에 추가합니다</p>
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
              공백 진단의 특징
            </h2>
            <p className="text-lg text-gray-600">
              체계적인 분석으로 취업 준비의 약점을 정확히 파악하세요
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
                <div className="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-orange-600" />
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

