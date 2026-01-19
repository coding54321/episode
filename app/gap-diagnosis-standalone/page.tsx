'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronRight, ChevronLeft, ChevronDown, MoreVertical, Plus } from 'lucide-react';
import FloatingHeader from '@/components/FloatingHeader';
import {
  Recruitment,
  Question,
  GapTag,
  CompetencyType,
  GapDiagnosisResult,
} from '@/types';
import {
  getQuestionsByJobTitleOnly,
  getCompetencyTypeById,
} from '@/lib/supabase/companyData';
import { gapTagStorage, userStorage } from '@/lib/storage';
import {
  getGapDiagnosisResults,
  saveGapDiagnosisResult,
  getGapDiagnosisResultById,
  deleteGapDiagnosisResult,
} from '@/lib/supabase/data';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 직군 목록 (온보딩과 동일)
const JOB_GROUPS = [
  'IT/개발',
  '기획/마케팅',
  '디자인',
  '영업/고객상담',
  '인사/총무',
  '회계/재무',
  '기타',
];

// 직무 목록 (직군별, 예시 - 실제로는 DB에서 가져와야 함)
const JOB_ROLES: Record<string, string[]> = {
  'IT/개발': ['백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자', '데이터 엔지니어', 'DevOps 엔지니어'],
  '기획/마케팅': ['서비스 기획자', '프로덕트 매니저', '마케팅 전문가', '브랜드 매니저'],
  '디자인': ['UI/UX 디자이너', '그래픽 디자이너', '브랜드 디자이너'],
  '영업/고객상담': ['영업 담당자', '고객 성공 매니저', 'CS 담당자'],
  '인사/총무': ['인사 담당자', '채용 담당자', '총무 담당자'],
  '회계/재무': ['회계 담당자', '재무 분석가', '세무 담당자'],
  '기타': ['기타'],
};

type Step = 'list' | 'job' | 'questions' | 'result';

function GapDiagnosisStandaloneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useUnifiedAuth();
  const [step, setStep] = useState<Step>('list');
  const [selectedJobGroup, setSelectedJobGroup] = useState<string>('');
  const [selectedJobRole, setSelectedJobRole] = useState<string>('');
  const [hasInitializedJobSelection, setHasInitializedJobSelection] = useState(false);
  const [isJobGroupOpen, setIsJobGroupOpen] = useState(false);
  const [isJobRoleOpen, setIsJobRoleOpen] = useState(false);
  const [questions, setQuestions] = useState<Array<Question & { recruitment?: Recruitment }>>([]);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [analyzedTags, setAnalyzedTags] = useState<GapTag[]>([]);
  const [diagnosisResults, setDiagnosisResults] = useState<GapDiagnosisResult[]>([]);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // URL 파라미터로 결과 ID가 있으면 해당 결과 표시
  useEffect(() => {
    const resultId = searchParams.get('resultId');
    if (resultId && user) {
      loadResult(resultId);
    }
  }, [searchParams, user]);

  // 로그인 확인 및 진단 결과 목록 로드
  useEffect(() => {
    if (authLoading) return;

    const checkAuth = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      // 진단 결과 목록 로드
      await loadDiagnosisResults();
    };

    checkAuth();
  }, [user, authLoading, router]);

  // 직무 선택 단계로 이동할 때 사용자의 기본 직무 정보 설정
  useEffect(() => {
    if (step === 'job' && user && !hasInitializedJobSelection) {
      // 사용자의 온보딩에서 받은 직군/직무를 기본값으로 설정
      if (user.jobGroup) {
        setSelectedJobGroup(user.jobGroup);
      }
      if (user.jobRole && user.jobGroup) {
        // 직군이 설정된 후에 직무 설정
        setSelectedJobRole(user.jobRole);
      }
      setHasInitializedJobSelection(true);
    } else if (step !== 'job') {
      // 다른 단계로 이동하면 초기화 플래그 리셋
      setHasInitializedJobSelection(false);
    }
  }, [step, user, hasInitializedJobSelection]);

  // 진단 결과 목록 로드
  const loadDiagnosisResults = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const results = await getGapDiagnosisResults(user.id);
      setDiagnosisResults(results);
    } catch (error) {
      console.error('진단 결과 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 특정 진단 결과 로드
  const loadResult = async (resultId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await getGapDiagnosisResultById(resultId, user.id);
      if (result) {
        setAnalyzedTags(result.tags);
        setSelectedJobGroup(result.jobGroup);
        setSelectedJobRole(result.jobRole);
        setCurrentResultId(resultId);
        setStep('result');
      }
    } catch (error) {
      console.error('진단 결과 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 직군 선택
  const handleJobGroupSelect = (jobGroup: string) => {
    setSelectedJobGroup(jobGroup);
    setSelectedJobRole(''); // 직군 변경 시 직무 초기화
    setIsJobGroupOpen(false);
  };

  // 직무 선택
  // 직무 변경 (DB에 저장하고 list 화면으로 돌아감)
  const handleJobChange = async () => {
    if (!selectedJobGroup || !selectedJobRole || !user) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          job_group: selectedJobGroup,
          job_role: selectedJobRole,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id' as any, user.id as any);

      if (error) {
        console.error('Failed to update user job info:', error);
        alert('직무 정보 저장에 실패했습니다.');
        return;
      }

      // 사용자 정보 새로고침을 위해 페이지 리로드
      // 변경된 직무 정보가 반영된 상태로 list 화면 표시
      window.location.reload();
    } catch (error) {
      console.error('Error updating user job info:', error);
      alert('직무 정보 저장 중 오류가 발생했습니다.');
    }
  };

  // 직무 선택 (진단 시작)
  const handleJobRoleSelect = async (jobRole: string) => {
    setSelectedJobRole(jobRole);
    setIsJobRoleOpen(false);
    setIsLoading(true);

    try {
      // 직무 중심으로 문항 조회
      const allQuestions = await getQuestionsByJobTitleOnly(jobRole);
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
    if (!user) return;

    setIsLoading(true);
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

    const resultId = `diagnosis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tags: GapTag[] = Object.entries(missingCompetencies).map(([competencyId, data]) => {
      const competency = competencyMap.get(competencyId)!;

      return {
        id: `gap_${Date.now()}_${competencyId}_${Math.random().toString(36).substr(2, 9)}`,
        label: competency.label,
        category: competency.label,
        source: `${selectedJobRole} 직무 (부족 ${data.count}건)`,
        questions: data.questions,
        createdAt: Date.now(),
        job_group: selectedJobGroup,
        job_role: selectedJobRole,
        diagnosis_result_id: resultId,
      };
    });

    // 진단 결과 저장
    const diagnosisResult: GapDiagnosisResult = {
      id: resultId,
      userId: user.id,
      jobGroup: selectedJobGroup,
      jobRole: selectedJobRole,
      tags: tags,
      createdAt: Date.now(),
    };

    await saveGapDiagnosisResult(diagnosisResult);
    setAnalyzedTags(tags);
    setCurrentResultId(resultId);
    setStep('result');
    setIsLoading(false);

    // 목록 새로고침
    await loadDiagnosisResults();
  };

  // 진단 결과 삭제
  const handleDeleteResult = async (resultId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;
    if (!confirm('정말 이 진단 결과를 삭제하시겠습니까?')) return;

    try {
      await deleteGapDiagnosisResult(resultId, user.id);
      await loadDiagnosisResults();
    } catch (error) {
      console.error('진단 결과 삭제 실패:', error);
    }
  };

  // 날짜 포맷
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}시 ${minutes}분`;
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

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자의 기본 직군/직무 가져오기
  const userJobGroup = user?.jobGroup || '';
  const userJobRole = user?.jobRole || '';

  const availableJobRoles = selectedJobGroup ? JOB_ROLES[selectedJobGroup] || [] : [];

  return (
    <div className="min-h-screen bg-white">
      <FloatingHeader />

      <div className="max-w-7xl mx-auto p-6 pt-32">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          {step !== 'list' && step !== 'result' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (step === 'job') setStep('list');
                if (step === 'questions') setStep('job');
              }}
              title="이전"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">기출문항 셀프진단</h1>
            <p className="text-lg text-gray-600 mt-2">
              {step === 'list' && '서비스 기획 직무의 최근 5개년 최빈출 서류 기출 문항에 답변할 수 있는지 점검하며, 보충할 역량이나 에피소드를 발견해보세요'}
              {step === 'job' && '희망하는 직무를 선택하세요'}
              {step === 'questions' && `${selectedJobRole} 직무의 최근 5개년 최빈출 문항입니다`}
              {step === 'result' && `${user?.name || ''}님의 역량 빈틈을 발견했어요`}
            </p>
          </div>
        </div>

        {/* 1단계: 진단 결과 목록 */}
        {step === 'list' && (
          <div className="space-y-6">
            {/* 새로 진단하기 버튼 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-[#5B6EFF] hover:bg-blue-50/50 transition-all cursor-pointer"
              onClick={() => {
                // 직무 선택 단계로 이동 시 선택값 초기화 (기본값으로 다시 설정되도록)
                setSelectedJobGroup('');
                setSelectedJobRole('');
                setHasInitializedJobSelection(false);
                setStep('job');
              }}
            >
              <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-700">새로 진단하기</p>
            </motion.div>

            {/* 이전 진단 결과 목록 */}
            {diagnosisResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagnosisResults.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer relative group"
                    onClick={() => loadResult(result.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {result.jobRole} 직무 진단 결과
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(result.createdAt)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteResult(result.id, e)}
                            className="text-red-600"
                          >
                            삭제하기
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2단계: 직무 선택 */}
        {step === 'job' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
            <div className="space-y-6">
              {/* 사용자 직무 정보 표시 */}
              {userJobGroup && userJobRole && (
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">
                    {user?.name || ''}님의 희망 직무는
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {userJobRole} 직무예요
                  </p>
                </div>
              )}

              {/* 직군 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  직군 선택하기
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsJobGroupOpen(!isJobGroupOpen)}
                    className={`w-full h-12 px-4 rounded-lg border-2 flex items-center justify-between ${
                      selectedJobGroup
                        ? 'border-[#5B6EFF] bg-white text-gray-900'
                        : 'border-gray-300 bg-white text-gray-500'
                    }`}
                  >
                    <span>{selectedJobGroup || '직군을 선택하세요'}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${
                        isJobGroupOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isJobGroupOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {JOB_GROUPS.map((group) => (
                        <button
                          key={group}
                          type="button"
                          onClick={() => handleJobGroupSelect(group)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedJobGroup && (
                  <div className="h-0.5 bg-[#5B6EFF] mt-1" />
                )}
              </div>

              {/* 직무 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  직무 선택하기
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => selectedJobGroup && setIsJobRoleOpen(!isJobRoleOpen)}
                    disabled={!selectedJobGroup}
                    className={`w-full h-12 px-4 rounded-lg border-2 flex items-center justify-between ${
                      !selectedJobGroup
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : selectedJobRole
                        ? 'border-[#5B6EFF] bg-white text-gray-900'
                        : 'border-gray-300 bg-white text-gray-500'
                    }`}
                  >
                    <span>{selectedJobRole || '직무를 선택하세요'}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${
                        isJobRoleOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isJobRoleOpen && selectedJobGroup && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {availableJobRoles.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleJobRoleSelect(role)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedJobRole && (
                  <div className="h-0.5 bg-gray-300 mt-1" />
                )}
              </div>

              {/* 시작 버튼 */}
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('list');
                      // 취소 시 초기화하지 않고 유지 (다시 들어올 때 기본값 유지)
                    }}
                    className="flex-1 h-12"
                  >
                    취소하기
                  </Button>
                  <Button
                    onClick={handleJobChange}
                    disabled={!selectedJobGroup || !selectedJobRole}
                    className="flex-1 h-12 bg-gray-600 hover:bg-gray-700 text-white disabled:opacity-40"
                  >
                    직무 변경하기
                  </Button>
                </div>
                <Button
                  onClick={() => selectedJobRole && handleJobRoleSelect(selectedJobRole)}
                  disabled={!selectedJobGroup || !selectedJobRole}
                  className="w-full h-12 bg-[#5B6EFF] hover:bg-[#4A5EE8] text-white disabled:opacity-40"
                >
                  {selectedJobRole || '직무를 선택하세요'} 직무로 셀프진단 시작하기
                </Button>
              </div>
            </div>

            {/* 드롭다운 외부 클릭 시 닫기 */}
            {(isJobGroupOpen || isJobRoleOpen) && (
              <div
                className="fixed inset-0 z-0"
                onClick={() => {
                  setIsJobGroupOpen(false);
                  setIsJobRoleOpen(false);
                }}
              />
            )}
          </div>
        )}

        {/* 3단계: 문항 체크 */}
        {step === 'questions' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <ScrollArea className="max-h-[calc(100vh-300px)]">
              <div className="space-y-8">
                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-lg text-gray-600">해당 직무의 문항이 없습니다.</p>
                  </div>
                ) : (
                  <>
                    {/* 년도/반기별로 그룹화된 문항 */}
                    {sortedYearHalfKeys.map((yearHalfKey) => {
                      const group = questionsByYearHalf[yearHalfKey];
                      return (
                        <div key={yearHalfKey} className="space-y-4">
                          {/* 년도/반기 헤더 */}
                          <div className="flex items-center gap-2 px-1">
                            <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent"></div>
                            <h3 className="text-lg font-bold text-gray-900 px-4 py-2 bg-blue-50 rounded-full">
                              {yearHalfKey}
                            </h3>
                            <div className="h-px flex-1 bg-gradient-to-l from-blue-200 to-transparent"></div>
                          </div>

                          {/* 문항 리스트 */}
                          <div className="space-y-3">
                            {group.questions.map((q) => (
                              <div
                                key={q.id}
                                className="p-6 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-colors bg-white"
                              >
                                <div className="flex gap-6">
                                  <div className="flex-1">
                                    <div className="flex items-start gap-3 mb-4">
                                      <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-3 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold flex-shrink-0">
                                        {q.question_no}
                                      </span>
                                      <p className="text-base text-gray-900 leading-relaxed">{q.content}</p>
                                    </div>
                                    <p className="text-sm text-gray-500 ml-10">
                                      최대 {q.max_chars.toLocaleString()}자
                                    </p>
                                  </div>
                                  <div className="flex gap-3 flex-shrink-0">
                                    <button
                                      onClick={() => handleResponseToggle(q.id, true)}
                                      className={`w-24 h-12 rounded-lg font-medium text-base transition-all ${
                                        responses[q.id] === true
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      있음
                                    </button>
                                    <button
                                      onClick={() => handleResponseToggle(q.id, false)}
                                      className={`w-24 h-12 rounded-lg font-medium text-base transition-all ${
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
                  </>
                )}
              </div>
            </ScrollArea>

            {/* 분석하기 버튼 */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={Object.keys(responses).length !== questions.length || questions.length === 0}
                className="bg-[#5B6EFF] hover:bg-[#4A5EE8] px-8 py-3 text-base disabled:opacity-40"
              >
                분석하기
              </Button>
            </div>
          </div>
        )}

        {/* 4단계: 결과 (역량별 카드 그리드) */}
        {step === 'result' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedJobRole} 직무 셀프 진단 결과
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                {user?.name || ''}님의 역량 빈틈을 발견했어요
              </p>

              {analyzedTags.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analyzedTags.map((tag) => (
                    <motion.div
                      key={tag.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-xl border-2 border-pink-200 bg-white hover:shadow-md transition-all"
                    >
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        {tag.label}에 대한 내용 필요
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        → {tag.category}에 대한 영역
                      </p>
                      <p className="text-xs text-gray-500">
                        {tag.source}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-600">모든 문항에 대한 소재가 충분합니다! 👏</p>
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <Button
                variant="outline"
                onClick={() => setStep('list')}
                className="w-full h-12"
              >
                돌아가기
              </Button>
              {analyzedTags.length > 0 && (
                <>
                  <Button
                    onClick={async () => {
                      // 기존 마인드맵에 적용
                      for (const tag of analyzedTags) {
                        await gapTagStorage.add(tag);
                      }
                      window.dispatchEvent(new CustomEvent('gap-tags-updated'));
                      router.push('/mindmaps');
                    }}
                    className="w-full h-12 bg-[#5B6EFF] hover:bg-[#4A5EE8] text-white"
                  >
                    기존 마인드맵에 적용하기
                  </Button>
                  <Button
                    onClick={async () => {
                      // 새로운 마인드맵으로 시작
                      for (const tag of analyzedTags) {
                        await gapTagStorage.add(tag);
                      }
                      window.dispatchEvent(new CustomEvent('gap-tags-updated'));
                      router.push('/project-type-selection');
                    }}
                    className="w-full h-12 bg-[#5B6EFF] hover:bg-[#4A5EE8] text-white"
                  >
                    새로운 마인드맵으로 시작하기
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GapDiagnosisStandalonePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <GapDiagnosisStandaloneContent />
    </Suspense>
  );
}
