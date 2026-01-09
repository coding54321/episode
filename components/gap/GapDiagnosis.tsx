'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import { 
  Company, 
  Job, 
  Question, 
  GapTag,
  CompetencyType 
} from '@/types';
import {
  mockCompanies,
  mockJobs,
  mockRecruitments,
  mockCompetencyTypes,
  getCompanyById,
  getJobsByCompany,
  getJobsByCategory,
  getQuestionsByJobTitle,
  getCompetencyTypeById,
} from '@/lib/mockData';
import { gapTagStorage } from '@/lib/storage';

interface GapDiagnosisProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void; // 공백 진단 완료 후 콜백
  resultButtonText?: string; // 결과 단계 버튼 텍스트 (기본값: 'AI 어시스턴트에 추가')
  onResultButtonClick?: () => void; // 결과 단계 버튼 클릭 핸들러
}

type Step = 'company' | 'job' | 'questions' | 'result';

export default function GapDiagnosis({ 
  isOpen, 
  onClose, 
  onComplete,
  resultButtonText = 'AI 어시스턴트에 추가',
  onResultButtonClick
}: GapDiagnosisProps) {
  const [step, setStep] = useState<Step>('company');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [analyzedTags, setAnalyzedTags] = useState<GapTag[]>([]);

  // 초기화
  useEffect(() => {
    if (isOpen) {
      setStep('company');
      setSelectedCompany(null);
      setSelectedJob(null);
      setQuestions([]);
      setResponses({});
      setAnalyzedTags([]);
    }
  }, [isOpen]);

  // 기업 선택
  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setStep('job');
  };

  // 직무 선택
  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    
    // 해당 직무의 최근 5년간 문항 수집
    const allQuestions = getQuestionsByJobTitle(selectedCompany!.id, job.job_title);
    
    setQuestions(allQuestions);
    setStep('questions');
  };

  // 문항 응답
  const handleResponseToggle = (questionId: string, hasMaterial: boolean) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: hasMaterial,
    }));
  };

  // 분석하기
  const handleAnalyze = () => {
    // 소재가 없는 문항들의 역량 타입 추출
    const missingCompetencies: Record<string, { count: number; questions: Array<{ content: string; year?: number; half?: string }> }> = {};

    questions.forEach(q => {
      if (responses[q.id] === false) { // 소재 없음
        const competency = getCompetencyTypeById(q.competency_type_id);
        if (competency) {
          if (!missingCompetencies[competency.id]) {
            missingCompetencies[competency.id] = { count: 0, questions: [] };
          }
          missingCompetencies[competency.id].count++;
          
          // 년도/반기 정보 가져오기
          let year: number | undefined;
          let half: string | undefined;
          if (q.recruitment_id) {
            const recruitment = mockRecruitments.find(r => r.id === q.recruitment_id);
            if (recruitment) {
              year = recruitment.year;
              half = recruitment.half;
            }
          }
          
          missingCompetencies[competency.id].questions.push({
            content: q.content,
            year,
            half,
          });
        }
      }
    });

    // GapTag 생성
    const tags: GapTag[] = Object.entries(missingCompetencies).map(([competencyId, data]) => {
      const competency = getCompetencyTypeById(competencyId)!;
      return {
        id: `gap_${Date.now()}_${competencyId}`,
        label: competency.label,
        category: competency.label,
        source: `${selectedCompany!.name} ${selectedJob!.job_title} (부족 ${data.count}건)`,
        questions: data.questions, // 답변하기 어려웠던 질문 리스트 저장 (년도/반기 정보 포함)
        createdAt: Date.now(),
      };
    });

    setAnalyzedTags(tags);
    setStep('result');
  };

  // AI 어시스턴트에 추가 또는 결과 버튼 클릭
  const handleAddToAssistant = () => {
    // 태그 저장
    analyzedTags.forEach(tag => {
      gapTagStorage.add(tag);
    });
    
    // 커스텀 이벤트 발생 (AI 어시스턴트에 알림)
    window.dispatchEvent(new CustomEvent('gap-tags-updated'));
    
    // 커스텀 핸들러가 있으면 그것을 사용
    if (onResultButtonClick) {
      onResultButtonClick();
      return;
    }

    // 기본 동작 (AI 어시스턴트에 추가)
    onClose();
    
    // 완료 콜백 호출
    if (onComplete) {
      onComplete();
    }
  };

  // 다시 진단
  const handleRestart = () => {
    setStep('company');
    setSelectedCompany(null);
    setSelectedJob(null);
    setQuestions([]);
    setResponses({});
    setAnalyzedTags([]);
  };

  // 직무별 카테고리 그룹화
  const jobsByCategory = selectedCompany ? getJobsByCategory(selectedCompany.id) : {};

  // 문항을 년도/반기별로 그룹화
  const questionsByYearHalf = questions.reduce((acc, q) => {
    if (q.recruitment_id) {
      const recruitment = mockRecruitments.find(r => r.id === q.recruitment_id);
      if (recruitment) {
        const key = `${recruitment.year}년 ${recruitment.half}`;
        if (!acc[key]) {
          acc[key] = {
            questions: [],
            year: recruitment.year,
            half: recruitment.half,
          };
        }
        acc[key].questions.push(q);
      }
    }
    return acc;
  }, {} as Record<string, { questions: Question[], year: number, half: string }>);

  // 년도/반기 순으로 정렬
  const sortedYearHalfKeys = Object.keys(questionsByYearHalf).sort((a, b) => {
    const aData = questionsByYearHalf[a];
    const bData = questionsByYearHalf[b];
    if (aData.year !== bData.year) return bData.year - aData.year; // 최신년도 우선
    return aData.half === '하반기' ? -1 : 1; // 하반기 우선
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 flex flex-col" showCloseButton={false}>
        <DialogTitle className="sr-only">공백 진단</DialogTitle>
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
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
              <h2 className="text-xl font-bold text-gray-900">공백 진단</h2>
              <p className="text-sm text-gray-500 mt-1">
                {step === 'company' && '기업을 선택해주세요'}
                {step === 'job' && `${selectedCompany?.name} - 직무를 선택해주세요`}
                {step === 'questions' && `${selectedCompany?.name} ${selectedJob?.job_title} - 소재 유무 체크`}
                {step === 'result' && '분석 결과'}
              </p>
            </div>
            
            {/* 닫기 버튼 */}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
              {/* 1단계: 기업 선택 */}
              {step === 'company' && (
                <div className="grid grid-cols-2 gap-3">
                  {mockCompanies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => handleCompanySelect(company)}
                      className="p-4 rounded-xl border border-gray-200 hover:border-blue-600 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-100 group-hover:border-blue-100 transition-colors overflow-hidden flex-shrink-0">
                          {company.logo_url ? (
                            <Image
                              src={company.logo_url}
                              alt={company.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-contain p-1.5"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                          <p className="text-sm text-gray-500 truncate">{company.industry}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 2단계: 직무 선택 */}
              {step === 'job' && selectedCompany && (
                <div className="space-y-6">
                  {Object.entries(jobsByCategory).map(([category, jobs]) => (
                    <div key={category} className="space-y-3">
                      <div className="text-sm font-bold text-gray-900 px-1">
                        {category}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {jobs.map(job => (
                          <button
                            key={job.id}
                            onClick={() => handleJobSelect(job)}
                            className="p-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all text-left group"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">{job.job_title}</h3>
                                <p className="text-sm text-gray-500">{job.department}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3단계: 문항 체크 */}
              {step === 'questions' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-900">
                      <strong>{selectedCompany?.name} {selectedJob?.job_title}</strong> 직무의 최근 5년간 기출 문항입니다.
                      각 문항에 대해 작성할 소재가 있는지 체크해주세요.
                    </p>
                  </div>
                  
                  {/* 년도/반기별로 그룹화된 문항 */}
                  {sortedYearHalfKeys.map((yearHalfKey) => {
                    const group = questionsByYearHalf[yearHalfKey];
                    return (
                      <div key={yearHalfKey} className="space-y-3">
                        {/* 년도/반기 헤더 */}
                        <div className="flex items-center gap-2 px-1">
                          <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent"></div>
                          <h3 className="text-sm font-bold text-gray-900 px-3 py-1 bg-blue-50 rounded-full">
                            {yearHalfKey}
                          </h3>
                          <div className="h-px flex-1 bg-gradient-to-l from-blue-200 to-transparent"></div>
                        </div>
                        
                        {/* 문항 리스트 */}
                        <div className="space-y-2">
                          {group.questions.map((q) => (
                            <div
                              key={q.id}
                              className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white"
                            >
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <div className="flex items-start gap-2 mb-3">
                                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold flex-shrink-0">
                                      {q.question_no}
                                    </span>
                                    <p className="text-sm text-gray-900 leading-relaxed">{q.content}</p>
                                  </div>
                                  <p className="text-xs text-gray-500 ml-8">
                                    최대 {q.max_chars.toLocaleString()}자
                                  </p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleResponseToggle(q.id, true)}
                                    className={`w-20 h-10 rounded-lg font-medium text-sm transition-all ${
                                      responses[q.id] === true
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    있음
                                  </button>
                                  <button
                                    onClick={() => handleResponseToggle(q.id, false)}
                                    className={`w-20 h-10 rounded-lg font-medium text-sm transition-all ${
                                      responses[q.id] === false
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                </div>
              )}

              {/* 4단계: 결과 */}
              {step === 'result' && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">분석 완료</h3>
                    <p className="text-sm text-gray-600">
                      총 {questions.length}개 문항 중 {Object.values(responses).filter(r => r === false).length}개 문항에서 소재가 부족합니다
                    </p>
                  </div>

                  {analyzedTags.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">부족한 역량</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {analyzedTags.map(tag => (
                          <div
                            key={tag.id}
                            className="p-4 rounded-xl bg-red-50 border border-red-100"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-semibold text-red-900 mb-1">{tag.label}</h5>
                                <p className="text-xs text-red-600">{tag.source}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">모든 문항에 대한 소재가 충분합니다! 👏</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex justify-end gap-3">
            {step === 'result' && (
              <Button variant="outline" onClick={handleRestart}>
                다시 진단
              </Button>
            )}

            {step === 'questions' && (
              <Button
                onClick={handleAnalyze}
                disabled={Object.keys(responses).length !== questions.length}
                className="bg-blue-600 hover:bg-blue-700"
              >
                분석하기
              </Button>
            )}

            {step === 'result' && analyzedTags.length > 0 && (
              <Button
                onClick={handleAddToAssistant}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {resultButtonText}
              </Button>
            )}
            
            {step === 'result' && analyzedTags.length === 0 && (
              <Button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700"
              >
                완료
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
