'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import FloatingHeader from '@/components/FloatingHeader';
import {
  Company,
  Recruitment,
  Job,
  Question,
  GapTag,
  CompetencyType
} from '@/types';
import {
  getCompanies,
  getJobsByCompany,
  getJobsByCategory,
  getQuestionsByJobTitle,
  getCompetencyTypeById,
} from '@/lib/supabase/companyData';
import { gapTagStorage, userStorage } from '@/lib/storage';

type Step = 'company' | 'job' | 'questions' | 'result';

export default function GapDiagnosisStandalonePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('company');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Array<Question & { recruitment?: Recruitment }>>([]);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [analyzedTags, setAnalyzedTags] = useState<GapTag[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsByCategory, setJobsByCategory] = useState<Record<string, Job[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 로그인 확인 및 초기화
  useEffect(() => {
    const checkAuth = async () => {
      const user = await userStorage.load();
      if (!user) {
        router.push('/login');
        return;
      }

      // 기업 목록 로드
      loadCompanies();
    };

    checkAuth();
  }, [router]);

  // 기업 목록 로드
  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('기업 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 기업 선택
  const handleCompanySelect = async (company: Company) => {
    setSelectedCompany(company);
    setIsLoading(true);
    try {
      const jobsData = await getJobsByCompany(company.id);
      setJobs(jobsData);

      const grouped = await getJobsByCategory(company.id);
      setJobsByCategory(grouped);

      setStep('job');
    } catch (error) {
      console.error('직무 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 직무 선택
  const handleJobSelect = async (job: Job) => {
    setSelectedJob(job);
    setIsLoading(true);

    try {
      const allQuestions = await getQuestionsByJobTitle(selectedCompany!.id, job.job_title);
      setQuestions(allQuestions);
      setStep('questions');
    } catch (error) {
      console.error('문항 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 문항 응답
  const handleResponseToggle = (questionId: string, hasMaterial: boolean) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: hasMaterial,
    }));
  };

  // 분석하기
  const handleAnalyze = async () => {
    const missingCompetencies: Record<string, { count: number; questions: Array<{ content: string; year?: number; half?: string }> }> = {};

    const competencyMap = new Map<string, CompetencyType>();
    for (const q of questions) {
      if (responses[q.id] === false && q.competency_type_id) {
        if (!competencyMap.has(q.competency_type_id)) {
          const competency = await getCompetencyTypeById(q.competency_type_id);
          if (competency) {
            competencyMap.set(q.competency_type_id, competency);
          }
        }
      }
    }

    for (const q of questions) {
      if (responses[q.id] === false) {
        const competency = competencyMap.get(q.competency_type_id);
        if (competency) {
          if (!missingCompetencies[competency.id]) {
            missingCompetencies[competency.id] = { count: 0, questions: [] };
          }
          missingCompetencies[competency.id].count++;

          let year: number | undefined;
          let half: string | undefined;

          if (q.recruitment) {
            year = q.recruitment.year;
            half = q.recruitment.half;
          }

          missingCompetencies[competency.id].questions.push({
            content: q.content,
            year,
            half,
          });
        }
      }
    }

    const tags: GapTag[] = Object.entries(missingCompetencies).map(([competencyId, data]) => {
      const competency = competencyMap.get(competencyId)!;

      return {
        id: `gap_${Date.now()}_${competencyId}_${Math.random().toString(36).substr(2, 9)}`,
        label: competency.label,
        category: competency.label,
        source: `${selectedCompany!.name} ${selectedJob!.job_title} (부족 ${data.count}건)`,
        questions: data.questions,
        createdAt: Date.now(),
      };
    });

    setAnalyzedTags(tags);
    setStep('result');
  };

  // 경험 정리하러 가기
  const handleGoToMindMapCreation = async () => {
    // 태그 저장
    for (const tag of analyzedTags) {
      await gapTagStorage.add(tag);
    }

    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('gap-tags-updated'));

    // 프로젝트 타입 선택 페이지로 이동
    router.push('/project-type-selection');
  };

  // 다시 진단
  const handleRestart = () => {
    setStep('company');
    setSelectedCompany(null);
    setSelectedJob(null);
    setQuestions([]);
    setResponses({});
    setAnalyzedTags([]);
    setJobsByCategory({});
  };

  // 문항을 년도/반기별로 그룹화
  const questionsByYearHalf = questions.reduce((acc, q) => {
    if (q.recruitment) {
      const key = `${q.recruitment.year}년 ${q.recruitment.half}`;
      if (!acc[key]) {
        acc[key] = {
          questions: [],
          year: q.recruitment.year,
          half: q.recruitment.half,
        };
      }
      acc[key].questions.push(q);
    }
    return acc;
  }, {} as Record<string, { questions: Array<Question & { recruitment?: Recruitment }>, year: number, half: string }>);

  // 년도/반기 순으로 정렬
  const sortedYearHalfKeys = Object.keys(questionsByYearHalf).sort((a, b) => {
    const aData = questionsByYearHalf[a];
    const bData = questionsByYearHalf[b];
    if (aData.year !== bData.year) return bData.year - aData.year;
    return aData.half === '하반기' ? -1 : 1;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <FloatingHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          {/* 뒤로가기 버튼 */}
          {step !== 'company' && step !== 'result' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (step === 'job') setStep('company');
                if (step === 'questions') setStep('job');
              }}
              title="이전"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* 제목 영역 */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">기출문항 셀프진단</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              {step === 'company' && '기업을 선택해주세요'}
              {step === 'job' && `${selectedCompany?.name} - 직무를 선택해주세요`}
              {step === 'questions' && `${selectedCompany?.name} ${selectedJob?.job_title} - 소재 유무 체크`}
              {step === 'result' && '분석 결과'}
            </p>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {/* 1단계: 기업 선택 */}
          {step === 'company' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-lg text-gray-600 dark:text-gray-400">로딩 중...</p>
                </div>
              ) : (
                companies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => handleCompanySelect(company)}
                    className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-500 hover:shadow-lg transition-all text-left group bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center border border-gray-100 dark:border-gray-600 group-hover:border-blue-100 dark:group-hover:border-blue-500 transition-colors overflow-hidden flex-shrink-0">
                        {company.logo_url ? (
                          <Image
                            src={company.logo_url}
                            alt={company.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Building2 className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{company.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{company.industry}</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* 2단계: 직무 선택 */}
          {step === 'job' && selectedCompany && (
            <div className="space-y-8">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-lg text-gray-600 dark:text-gray-400">로딩 중...</p>
                </div>
              ) : (
                Object.entries(jobsByCategory).map(([category, categoryJobs]) => (
                  <div key={category} className="space-y-4">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 px-2">
                      {category}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryJobs.map(job => (
                        <button
                          key={job.id}
                          onClick={() => handleJobSelect(job)}
                          className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-900 dark:hover:border-gray-500 hover:shadow-lg transition-all text-left group bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{job.job_title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{job.department}</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-100 flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3단계: 문항 체크 */}
          {step === 'questions' && (
            <div className="space-y-8">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-lg text-gray-600">문항을 불러오는 중...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-gray-600 dark:text-gray-400">해당 직무의 문항이 없습니다.</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6">
                    <p className="text-lg text-blue-900 dark:text-blue-100">
                      <strong>{selectedCompany?.name} {selectedJob?.job_title}</strong> 직무의 최근 5년간 기출 문항입니다.
                      각 문항에 대해 작성할 소재가 있는지 체크해주세요.
                    </p>
                  </div>

                  {/* 년도/반기별로 그룹화된 문항 */}
                  {sortedYearHalfKeys.map((yearHalfKey) => {
                    const group = questionsByYearHalf[yearHalfKey];
                    return (
                      <div key={yearHalfKey} className="space-y-4">
                        {/* 년도/반기 헤더 */}
                        <div className="flex items-center gap-2 px-1">
                          <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent"></div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                            {yearHalfKey}
                          </h3>
                          <div className="h-px flex-1 bg-gradient-to-l from-blue-200 to-transparent"></div>
                        </div>

                        {/* 문항 리스트 */}
                        <div className="space-y-3">
                          {group.questions.map((q) => (
                            <div
                              key={q.id}
                              className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-white dark:bg-gray-800"
                            >
                              <div className="flex gap-6">
                                <div className="flex-1">
                                  <div className="flex items-start gap-3 mb-4">
                                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold flex-shrink-0">
                                      {q.question_no}
                                    </span>
                                    <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">{q.content}</p>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-10">
                                    최대 {q.max_chars.toLocaleString()}자
                                  </p>
                                </div>
                                <div className="flex gap-3 flex-shrink-0">
                                  <button
                                    onClick={() => handleResponseToggle(q.id, true)}
                                    className={`w-24 h-12 rounded-lg font-medium text-base transition-all ${
                                      responses[q.id] === true
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    있음
                                  </button>
                                  <button
                                    onClick={() => handleResponseToggle(q.id, false)}
                                    className={`w-24 h-12 rounded-lg font-medium text-base transition-all ${
                                      responses[q.id] === false
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    없음
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* 4단계: 결과 */}
          {step === 'result' && (
            <div className="space-y-8">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">분석 완료</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  총 {questions.length}개 문항 중 {Object.values(responses).filter(r => r === false).length}개 문항에서 소재가 부족합니다
                </p>
              </div>

              {analyzedTags.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">부족한 역량</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analyzedTags.map(tag => (
                      <div
                        key={tag.id}
                        className="p-6 rounded-xl bg-red-50 dark:bg-red-900/30 border-2 border-red-100 dark:border-red-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h5 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">{tag.label}</h5>
                            <p className="text-sm text-red-600 dark:text-red-400">{tag.source}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-600 dark:text-gray-400">모든 문항에 대한 소재가 충분합니다! 👏</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        <div className="mt-8 flex justify-end gap-4">
          {step === 'result' && (
            <Button
              variant="outline"
              onClick={handleRestart}
              className="px-6 py-3 text-base"
            >
              다시 진단
            </Button>
          )}

          {step === 'questions' && (
            <Button
              onClick={handleAnalyze}
              disabled={Object.keys(responses).length !== questions.length}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-base"
            >
              분석하기
            </Button>
          )}

          {step === 'result' && analyzedTags.length > 0 && (
            <Button
              onClick={handleGoToMindMapCreation}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-base"
            >
              경험 정리하러 가기
            </Button>
          )}

          {step === 'result' && analyzedTags.length === 0 && (
            <Button
              onClick={() => router.push('/mindmaps')}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-base"
            >
              마인드맵으로 이동
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}