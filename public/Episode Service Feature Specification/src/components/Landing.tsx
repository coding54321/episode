import { Sparkles, Map, Brain, Users, FileText } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-600">AI 기반 경험 정리 서비스</span>
          </div>
          <h1 className="text-5xl mb-6 text-gray-900">
            당신의 모든 경험이<br />
            <span className="text-blue-600">완벽한 자소서</span>가 되는 순간
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            흩어진 경험들을 마인드맵으로 정리하고,<br />
            AI와 함께 STAR 방식 자기소개서를 완성하세요
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-lg"
          >
            무료로 시작하기
          </button>
        </div>

        {/* Demo Image Placeholder */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12 mb-24">
          <div className="bg-white rounded-xl shadow-2xl p-8 min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <Map className="w-24 h-24 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">마인드맵 캔버스 데모</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Map className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="mb-2 text-gray-900">지능형 마인드맵</h3>
            <p className="text-sm text-gray-600">
              경험을 시각적으로 정리하고 연결점을 찾아보세요
            </p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="mb-2 text-gray-900">AI 경험 복원</h3>
            <p className="text-sm text-gray-600">
              잊었던 디테일을 AI와의 대화로 되살려보세요
            </p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="mb-2 text-gray-900">STAR 자동 생성</h3>
            <p className="text-sm text-gray-600">
              대화 내용을 바탕으로 STAR 초안을 자동 작성
            </p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="mb-2 text-gray-900">실시간 협업</h3>
            <p className="text-sm text-gray-600">
              친구나 멘토와 함께 자소서를 다듬어보세요
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="text-center mb-12">
          <h2 className="text-3xl mb-16 text-gray-900">이렇게 사용해요</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg">
                1
              </div>
              <h3 className="mb-2 text-gray-900">경험 뱃지 선택</h3>
              <p className="text-sm text-gray-600">
                인턴, 프로젝트, 동아리 등<br />
                나의 경험 카테고리를 선택
              </p>
            </div>

            <div>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg">
                2
              </div>
              <h3 className="mb-2 text-gray-900">AI와 경험 탐색</h3>
              <p className="text-sm text-gray-600">
                기업 문항 기반 공백 진단으로<br />
                필요한 역량을 채워나가기
              </p>
            </div>

            <div>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg">
                3
              </div>
              <h3 className="mb-2 text-gray-900">STAR 초안 완성</h3>
              <p className="text-sm text-gray-600">
                AI가 대화 내용을 분석해<br />
                완성도 높은 자소서 생성
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-24 bg-blue-50 rounded-2xl p-12">
          <h2 className="text-3xl mb-4 text-gray-900">지금 바로 시작해보세요</h2>
          <p className="text-gray-600 mb-8">
            회원가입 없이 간편한 소셜 로그인으로 3초 만에 시작
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-lg"
          >
            무료로 시작하기
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>© 2026 episode. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
