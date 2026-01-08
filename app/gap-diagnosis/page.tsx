'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { userStorage, gapTagStorage } from '@/lib/storage';
import { GapQuestion, GapTag } from '@/types';
import { motion } from 'framer-motion';
import { ChevronLeft, Building2, Briefcase } from 'lucide-react';

const SAMPLE_COMPANIES = [
  { id: 'samsung', name: '삼성전자', description: 'IT/전자' },
  { id: 'lg', name: 'LG전자', description: 'IT/전자' },
  { id: 'naver', name: '네이버', description: 'IT/인터넷' },
  { id: 'kakao', name: '카카오', description: 'IT/인터넷' },
  { id: 'hyundai', name: '현대자동차', description: '자동차' },
  { id: 'sk', name: 'SK그룹', description: '에너지/화학' },
];

const SAMPLE_POSITIONS = [
  { id: 'developer', name: '개발자', description: 'SW개발' },
  { id: 'product', name: '기획자', description: '상품기획' },
  { id: 'design', name: '디자이너', description: 'UI/UX' },
  { id: 'marketing', name: '마케터', description: '마케팅' },
  { id: 'sales', name: '영업', description: '영업/고객' },
  { id: 'consulting', name: '컨설턴트', description: '컨설팅' },
];

const SAMPLE_QUESTIONS: GapQuestion[] = [
  {
    id: '1',
    company: '삼성전자',
    position: '개발자',
    question: '팀 내 갈등 상황을 해결해본 경험을 구체적으로 서술해주세요.',
    difficulty: null,
  },
  {
    id: '2',
    company: '네이버',
    position: '기획자',
    question: '새로운 서비스를 기획하고 성공적으로 런칭한 경험이 있다면 설명해주세요.',
    difficulty: null,
  },
  {
    id: '3',
    company: '카카오',
    position: '개발자',
    question: '기술적 한계를 극복하여 문제를 해결한 경험을 서술해주세요.',
    difficulty: null,
  },
  {
    id: '4',
    company: '현대자동차',
    position: '영업',
    question: '고객의 니즈를 파악하고 맞춤형 솔루션을 제공한 경험을 설명해주세요.',
    difficulty: null,
  },
  {
    id: '5',
    company: 'LG전자',
    position: '마케터',
    question: '창의적인 마케팅 전략으로 성과를 달성한 사례를 구체적으로 기술해주세요.',
    difficulty: null,
  },
];

export default function GapDiagnosisPage() {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'company' | 'position' | 'questions'>('company');
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [questionResponses, setQuestionResponses] = useState<Record<string, 'possible' | 'difficult'>>({});

  useEffect(() => {
    const user = userStorage.load();
    if (!user) {
      router.push('/login');
      return;
    }
  }, [router]);

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompany(companyId);
    setCurrentStep('position');
  };

  const handlePositionSelect = (positionId: string) => {
    setSelectedPosition(positionId);

    // 필터링된 질문들 로드 (실제로는 API 호출)
    const filteredQuestions = SAMPLE_QUESTIONS.filter(q =>
      q.company === SAMPLE_COMPANIES.find(c => c.id === selectedCompany)?.name &&
      q.position === SAMPLE_POSITIONS.find(p => p.id === positionId)?.name
    );

    if (filteredQuestions.length === 0) {
      // 샘플 질문 사용
      setQuestions(SAMPLE_QUESTIONS.slice(0, 3));
    } else {
      setQuestions(filteredQuestions);
    }

    setCurrentStep('questions');
  };

  const handleQuestionResponse = (questionId: string, response: 'possible' | 'difficult') => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  const handleComplete = () => {
    // 답변 어려운 질문들에서 역량 태그 추출
    const difficultQuestions = questions.filter(q => questionResponses[q.id] === 'difficult');

    const newTags: GapTag[] = difficultQuestions.map(q => ({
      id: `gap_${Date.now()}_${Math.random()}`,
      label: extractCompetencyFromQuestion(q.question),
      source: `${q.company} ${q.position}`,
      createdAt: Date.now(),
    }));

    newTags.forEach(tag => gapTagStorage.add(tag));
    router.push('/mindmap');
  };

  const extractCompetencyFromQuestion = (question: string): string => {
    if (question.includes('갈등')) return '갈등해결';
    if (question.includes('기획')) return '서비스기획';
    if (question.includes('기술')) return '기술적 문제해결';
    if (question.includes('고객')) return '고객 대응';
    if (question.includes('마케팅')) return '창의적 마케팅';
    return '문제해결';
  };

  const completedResponses = Object.keys(questionResponses).length;
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="safe-area-top bg-white" />
      <div className="flex-1 bg-white px-5 py-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              if (currentStep === 'position') {
                setCurrentStep('company');
              } else if (currentStep === 'questions') {
                setCurrentStep('position');
              } else {
                router.back();
              }
            }}
            className="flex items-center gap-2 text-gray-600"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {currentStep === 'questions' && (
            <div className="text-sm text-gray-500">
              {completedResponses}/{totalQuestions}
            </div>
          )}
        </div>

        <div className="max-w-md mx-auto">
          {currentStep === 'company' && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  어느 기업의 자소서를
                  <br />준비하고 계신가요?
                </h1>
                <p className="text-gray-600 text-base">
                  기업별 맞춤 문항으로 공백을 진단해드려요
                </p>
              </div>

              <div className="space-y-3">
                {SAMPLE_COMPANIES.map((company) => (
                  <Card
                    key={company.id}
                    className="p-4 hover:shadow-sm transition-all duration-200 cursor-pointer"
                    onClick={() => handleCompanySelect(company.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500">{company.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 'position' && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  어떤 직무로
                  <br />지원하시나요?
                </h1>
                <p className="text-gray-600 text-base">
                  직무별 핵심 역량을 확인해드려요
                </p>
              </div>

              <div className="space-y-3">
                {SAMPLE_POSITIONS.map((position) => (
                  <Card
                    key={position.id}
                    className="p-4 hover:shadow-sm transition-all duration-200 cursor-pointer"
                    onClick={() => handlePositionSelect(position.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{position.name}</h3>
                        <p className="text-sm text-gray-500">{position.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 'questions' && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  문항별로 답변 가능 여부를
                  <br />체크해주세요
                </h1>
                <p className="text-gray-600 text-base">
                  답변하기 어려운 문항을 바탕으로 공백을 찾아드려요
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {questions.map((question, index) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="p-5">
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {question.company}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {question.position}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {question.question}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant={questionResponses[question.id] === 'possible' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleQuestionResponse(question.id, 'possible')}
                          className="flex-1 h-9"
                        >
                          답변 가능
                        </Button>
                        <Button
                          variant={questionResponses[question.id] === 'difficult' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleQuestionResponse(question.id, 'difficult')}
                          className="flex-1 h-9"
                        >
                          답변 어려움
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={handleComplete}
                disabled={completedResponses < totalQuestions}
                className="w-full h-[56px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
              >
                진단 완료하기
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}