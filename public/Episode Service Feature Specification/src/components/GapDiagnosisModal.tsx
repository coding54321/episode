import { useState } from 'react';
import { X, Building2, Briefcase, CheckCircle2, Circle } from 'lucide-react';
import { Company, JobRole, Question, GapTag } from '../types';

interface GapDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (gapTags: GapTag[]) => void;
}

// Mock data
const COMPANIES: Company[] = [
  { id: 'toss', name: '토스' },
  { id: 'naver', name: '네이버' },
  { id: 'kakao', name: '카카오' },
  { id: 'coupang', name: '쿠팡' },
  { id: 'baemin', name: '배달의민족' },
];

const JOB_ROLES: JobRole[] = [
  { id: 'backend', name: 'Backend Developer' },
  { id: 'frontend', name: 'Frontend Developer' },
  { id: 'ux', name: 'UX Designer' },
  { id: 'pm', name: 'Product Manager' },
  { id: 'data', name: 'Data Analyst' },
];

const MOCK_QUESTIONS: Record<string, Question[]> = {
  backend: [
    { id: '1', text: '팀 내에서 기술적 의견 충돌이 있었던 경험을 설명해주세요', competency: '갈등 해결' },
    { id: '2', text: '대용량 트래픽을 처리하기 위해 시스템을 개선한 경험이 있나요?', competency: '성능 최적화' },
    { id: '3', text: '데이터 분석을 통해 비즈니스 인사이트를 도출한 사례를 공유해주세요', competency: '데이터 분석' },
    { id: '4', text: '비개발 직군과 협업하며 문제를 해결한 경험을 설명해주세요', competency: '협업' },
  ],
  frontend: [
    { id: '1', text: '사용자 경험을 개선하기 위해 UI/UX를 리팩토링한 경험이 있나요?', competency: 'UX 개선' },
    { id: '2', text: '성능 최적화를 통해 로딩 속도를 개선한 사례를 설명해주세요', competency: '성능 최적화' },
    { id: '3', text: '디자이너와 협업하며 어려움을 겪었던 경험과 해결 방법은?', competency: '협업' },
    { id: '4', text: '접근성(Accessibility)을 고려하여 개발한 경험이 있나요?', competency: '접근성' },
  ],
  ux: [
    { id: '1', text: '사용자 리서치를 바탕으로 디자인을 개선한 경험을 설명해주세요', competency: '사용자 리서치' },
    { id: '2', text: '데이터 기반으로 디자인 의사결정을 내린 사례를 공유해주세요', competency: '데이터 분석' },
    { id: '3', text: '다양한 이해관계자와 협업하며 디자인을 조율한 경험은?', competency: '협업' },
    { id: '4', text: '제한된 리소스 내에서 창의적인 솔루션을 제시한 경험이 있나요?', competency: '문제 해결' },
  ],
  pm: [
    { id: '1', text: '우선순위를 정하고 로드맵을 수립한 경험을 설명해주세요', competency: '우선순위 설정' },
    { id: '2', text: '이해관계자 간 의견 충돌을 조율한 경험이 있나요?', competency: '갈등 조율' },
    { id: '3', text: '데이터를 분석하여 제품 방향성을 결정한 사례를 공유해주세요', competency: '데이터 분석' },
    { id: '4', text: '실패한 프로젝트에서 배운 점은 무엇인가요?', competency: '실패 학습' },
  ],
  data: [
    { id: '1', text: '복잡한 데이터를 시각화하여 인사이트를 전달한 경험을 설명해주세요', competency: '데이터 시각화' },
    { id: '2', text: '비즈니스 문제를 데이터 분석으로 해결한 사례를 공유해주세요', competency: '문제 해결' },
    { id: '3', text: 'A/B 테스트를 설계하고 분석한 경험이 있나요?', competency: 'A/B 테스트' },
    { id: '4', text: '비전문가에게 기술적 내용을 설명한 경험을 설명해주세요', competency: '커뮤니케이션' },
  ],
};

export default function GapDiagnosisModal({ isOpen, onClose, onComplete }: GapDiagnosisModalProps) {
  const [step, setStep] = useState<'company' | 'role' | 'questions'>('company');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setStep('role');
  };

  const handleRoleSelect = (role: JobRole) => {
    setSelectedRole(role);
    setStep('questions');
  };

  const handleAnswerToggle = (questionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleComplete = () => {
    if (!selectedRole) return;

    const questions = MOCK_QUESTIONS[selectedRole.id] || [];
    const gapTags: GapTag[] = questions
      .filter(q => answers[q.id] === false) // "답변 어려움" 선택한 항목들
      .map(q => ({
        id: `gap_${q.id}_${Date.now()}`,
        label: q.competency,
        source: `${selectedCompany?.name} ${selectedRole.name}`,
      }));

    onComplete(gapTags);
    
    // Reset
    setStep('company');
    setSelectedCompany(null);
    setSelectedRole(null);
    setAnswers({});
    onClose();
  };

  const questions = selectedRole ? MOCK_QUESTIONS[selectedRole.id] || [] : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">공백 진단하기</h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 'company' && '지원할 기업을 선택해주세요'}
              {step === 'role' && '지원할 직무를 선택해주세요'}
              {step === 'questions' && '각 문항에 답변 가능 여부를 선택해주세요'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'company' && (
            <div className="grid grid-cols-2 gap-3">
              {COMPANIES.map(company => (
                <button
                  key={company.id}
                  onClick={() => handleCompanySelect(company)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all text-left"
                >
                  <Building2 className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="text-gray-900">{company.name}</p>
                </button>
              ))}
            </div>
          )}

          {step === 'role' && (
            <div className="space-y-3">
              {JOB_ROLES.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all text-left flex items-center gap-3"
                >
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{role.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'questions' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>{selectedCompany?.name} {selectedRole?.name}</strong> 최근 기출 문항입니다.
                  <br />
                  답변하기 어려운 문항을 선택하면, 해당 역량을 채울 수 있는 경험을 추천해드려요.
                </p>
              </div>

              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="border-2 border-gray-200 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-gray-900 flex-1">{question.text}</p>
                  </div>
                  
                  <div className="flex gap-2 ml-9">
                    <button
                      onClick={() => handleAnswerToggle(question.id)}
                      className={`
                        flex-1 py-2 px-4 rounded-lg border-2 transition-all text-sm
                        ${answers[question.id] === true
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }
                      `}
                    >
                      {answers[question.id] === true ? (
                        <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      ) : (
                        <Circle className="w-4 h-4 inline mr-1" />
                      )}
                      답변 가능
                    </button>
                    <button
                      onClick={() => setAnswers(prev => ({ ...prev, [question.id]: false }))}
                      className={`
                        flex-1 py-2 px-4 rounded-lg border-2 transition-all text-sm
                        ${answers[question.id] === false
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }
                      `}
                    >
                      {answers[question.id] === false ? (
                        <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      ) : (
                        <Circle className="w-4 h-4 inline mr-1" />
                      )}
                      답변 어려움
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'questions' && (
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleComplete}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              진단 완료하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
