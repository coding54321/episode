'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { supabase } from '@/lib/supabase/client';
import { ChevronDown } from 'lucide-react';

// 직군 목록 (예시)
const JOB_GROUPS = [
  'IT/개발',
  '기획/마케팅',
  '디자인',
  '영업/고객상담',
  '인사/총무',
  '회계/재무',
  '기타',
];

// 직무 목록 (직군별, 예시)
const JOB_ROLES: Record<string, string[]> = {
  'IT/개발': ['백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자', '데이터 엔지니어', 'DevOps 엔지니어'],
  '기획/마케팅': ['서비스 기획자', '프로덕트 매니저', '마케팅 전문가', '브랜드 매니저'],
  '디자인': ['UI/UX 디자이너', '그래픽 디자이너', '브랜드 디자이너'],
  '영업/고객상담': ['영업 담당자', '고객 성공 매니저', 'CS 담당자'],
  '인사/총무': ['인사 담당자', '채용 담당자', '총무 담당자'],
  '회계/재무': ['회계 담당자', '재무 분석가', '세무 담당자'],
  '기타': ['기타'],
};

export default function OnboardingJobSelectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth();
  const [selectedJobGroup, setSelectedJobGroup] = useState<string>('');
  const [selectedJobRole, setSelectedJobRole] = useState<string>('');
  const [isJobGroupOpen, setIsJobGroupOpen] = useState(false);
  const [isJobRoleOpen, setIsJobRoleOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleJobGroupSelect = (jobGroup: string) => {
    setSelectedJobGroup(jobGroup);
    setSelectedJobRole(''); // 직군 변경 시 직무 초기화
    setIsJobGroupOpen(false);
  };

  const handleJobRoleSelect = (jobRole: string) => {
    setSelectedJobRole(jobRole);
    setIsJobRoleOpen(false);
  };

  const handleNext = async () => {
    if (!selectedJobGroup || !selectedJobRole) {
      alert('직군과 직무를 모두 선택해주세요.');
      return;
    }

    if (!user) return;

    // 사용자 정보 업데이트
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          job_group: selectedJobGroup,
          job_role: selectedJobRole,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id' as any, user.id as any)
        .select();

      if (error) {
        console.error('Failed to update user job info:', {
          error,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          userId: user.id,
          jobGroup: selectedJobGroup,
          jobRole: selectedJobRole,
        });
        
        // 컬럼이 존재하지 않는 경우를 위한 안내
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          alert('데이터베이스 스키마가 업데이트되지 않았습니다. 관리자에게 문의해주세요.\n\n필요한 컬럼: job_group, job_role');
        } else {
          alert(`직무 정보 저장에 실패했습니다: ${error.message || '알 수 없는 오류'}`);
        }
        return;
      }

      console.log('User job info updated successfully:', data);
      router.push('/onboarding/experience-start');
    } catch (error) {
      console.error('Error updating user job info:', error);
      alert(`직무 정보 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const availableJobRoles = selectedJobGroup ? JOB_ROLES[selectedJobGroup] || [] : [];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 진행 표시기 */}
      <div className="flex justify-center items-center pt-12 pb-8">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full ${
                step === 2 ? 'bg-[#5B6EFF]' : step < 2 ? 'bg-[#5B6EFF]' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            우선 희망하는
            <br />
            직무를 선택하세요!
          </h1>

          {/* 직군 선택 */}
          <div className="mb-6">
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
          <div className="mb-8">
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

          <Button
            onClick={handleNext}
            disabled={!selectedJobGroup || !selectedJobRole}
            className="w-full h-[56px] bg-[#5B6EFF] hover:bg-[#4A5EE8] text-white font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            에피소드 시작하기
          </Button>
        </motion.div>
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
  );
}
