'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, MessageSquare, FileText, FolderKanban, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingHeader from '@/components/FloatingHeader';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 플로팅 헤더바 */}
      <FloatingHeader />

      {/* 히어로 섹션 */}
      <section className="px-5 pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* 텍스트 + 로고 이미지 */}
            <div className="mb-8 flex flex-col items-center">
              {/* 캐치프레이즈 - 노드 연결 애니메이션 */}
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 tracking-tight flex items-center flex-wrap justify-center">
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
                    className="relative inline-block px-6 py-3 bg-white border-2 border-blue-300 rounded-xl shadow-sm"
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
                      stroke="#93C5FD"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.8, ease: "easeInOut" }}
                    />
                  </motion.svg>

                  {/* 두 번째 노드 박스 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.6 }}
                    className="relative inline-block px-6 py-3 bg-white border-2 border-blue-300 rounded-xl shadow-sm"
                  >
                    잇다
                  </motion.div>
                </div>
              </div>
              
              {/* 로고 이미지 */}
              <Image
                src="/new_logo.png"
                alt="Episode Logo"
                width={700}
                height={700}
                className="object-contain"
                priority
              />
            </div>
            
            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
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
                    className="absolute -left-16 top-1/2 w-12 h-0.5 bg-blue-300"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 2.3 }}
                  />
                  
                  {/* 연결선 효과 (오른쪽) */}
                  <motion.div
                    className="absolute -right-16 top-1/2 w-12 h-0.5 bg-blue-300"
                    initial={{ scaleX: 0, originX: 1 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 2.3 }}
                  />
                  
                  {/* 노드 스타일 버튼 */}
                  <motion.div
                    className="relative px-8 py-4 bg-white border-2 border-blue-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group-hover:border-blue-500"
                    whileHover={{ y: -2 }}
                  >
                    {/* 배경 애니메이션 */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    {/* 버튼 텍스트 */}
                    <div className="relative flex items-center gap-2 text-lg font-bold text-blue-600 group-hover:text-blue-700">
                      <motion.span
                        animate={{ 
                          textShadow: [
                            "0 0 0px rgba(59, 130, 246, 0)",
                            "0 0 8px rgba(59, 130, 246, 0.3)",
                            "0 0 0px rgba(59, 130, 246, 0)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        무료로 시작하기
                      </motion.span>
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
      <section className="px-5 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Episode로 할 수 있는 것들
            </h2>
            <p className="text-lg text-gray-600">
              취업 준비를 더 쉽고 체계적으로
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Brain,
                title: '마인드맵',
                description: '경험을 시각적으로 구조화하고 관리하세요',
                color: 'bg-blue-50',
                iconColor: 'text-blue-600',
              },
              {
                icon: MessageSquare,
                title: 'AI 챗봇',
                description: 'STAR 방식으로 대화하며 자기소개서를 작성하세요',
                color: 'bg-purple-50',
                iconColor: 'text-purple-600',
              },
              {
                icon: FileText,
                title: 'STAR 에디터',
                description: '완성된 자기소개서를 편집하고 저장하세요',
                color: 'bg-green-50',
                iconColor: 'text-green-600',
              },
              {
                icon: FolderKanban,
                title: '프로젝트 관리',
                description: '여러 마인드맵을 프로젝트로 관리하세요',
                color: 'bg-orange-50',
                iconColor: 'text-orange-600',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white rounded-[16px] p-6 hover:shadow-md transition-all duration-200 border border-gray-100"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-[12px] flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 주요 특징 */}
      <section className="px-5 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">AI 기반</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                  STAR 방식으로
                  <br />
                  자기소개서 작성
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  AI 챗봇과 대화하며 상황, 과제, 행동, 결과를 체계적으로 정리하고
                  완성도 높은 자기소개서를 작성할 수 있습니다.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gray-50 rounded-[20px] p-8 h-64 flex items-center justify-center"
            >
              <div className="text-center">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">마인드맵 미리보기</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="px-5 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              지금 바로 시작하세요
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              무료로 경험을 구조화하고 자기소개서를 작성해보세요
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium rounded-[12px] shadow-sm hover:shadow-md transition-all duration-200"
              >
                무료로 시작하기
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="px-5 py-12 border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-500">© 2024 Episode. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
