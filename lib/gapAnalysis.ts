import { GapTag, GapQuestion } from '@/types';

// 가상의 기업 문항들 (실제로는 DB나 API에서 가져올 데이터)
export const MOCK_QUESTIONS: GapQuestion[] = [
  {
    id: 'q1',
    company: '네이버',
    position: '프론트엔드 개발자',
    question: '팀워크를 발휘한 경험에 대해 구체적으로 설명해주세요.',
    difficulty: 'medium'
  },
  {
    id: 'q2',
    company: '카카오',
    position: 'UX디자이너',
    question: '사용자 중심의 디자인을 위해 어떤 노력을 했는지 사례를 들어 설명해주세요.',
    difficulty: 'hard'
  },
  {
    id: 'q3',
    company: '토스',
    position: '백엔드 개발자',
    question: '기술적 문제를 해결하며 성과를 낸 경험이 있다면 설명해주세요.',
    difficulty: 'hard'
  },
  {
    id: 'q4',
    company: '쿠팡',
    position: '데이터 분석가',
    question: '데이터를 활용하여 인사이트를 도출한 경험을 설명해주세요.',
    difficulty: 'medium'
  },
  {
    id: 'q5',
    company: '배달의민족',
    position: '프로덕트 매니저',
    question: '리더십을 발휘하여 프로젝트를 성공적으로 이끈 경험이 있나요?',
    difficulty: 'hard'
  },
  {
    id: 'q6',
    company: '라인',
    position: 'QA엔지니어',
    question: '창의적 사고로 문제를 해결한 경험을 구체적으로 설명해주세요.',
    difficulty: 'medium'
  },
  {
    id: 'q7',
    company: '삼성전자',
    position: '하드웨어 엔지니어',
    question: '도전정신을 발휘한 경험과 그 결과를 설명해주세요.',
    difficulty: 'easy'
  },
  {
    id: 'q8',
    company: 'LG전자',
    position: '소프트웨어 개발자',
    question: '커뮤니케이션 능력이 중요했던 프로젝트 경험을 공유해주세요.',
    difficulty: 'easy'
  },
  {
    id: 'q9',
    company: '현대자동차',
    position: '자율주행 개발자',
    question: '혁신적인 아이디어로 성과를 만든 경험이 있다면 설명해주세요.',
    difficulty: 'hard'
  },
  {
    id: 'q10',
    company: 'SK하이닉스',
    position: '반도체 엔지니어',
    question: '책임감을 가지고 업무를 완수한 경험을 구체적으로 설명해주세요.',
    difficulty: 'easy'
  }
];

// 핵심 역량 키워드 매핑
const COMPETENCY_KEYWORDS: Record<string, string[]> = {
  '팀워크': ['협업', '소통', '조율', '합의', '역할분담', '상호작용'],
  '사용자 중심': ['UX', '사용성', '고객', '니즈', '피드백', '개선'],
  '기술적 문제해결': ['디버깅', '최적화', '아키텍처', '성능', '기술스택'],
  '데이터 분석': ['통계', '인사이트', '지표', '모델링', '시각화'],
  '리더십': ['의사결정', '동기부여', '방향제시', '갈등해결', '성과관리'],
  '창의적 사고': ['아이디어', '혁신', '창조', '독창성', '발상'],
  '도전정신': ['새로운 시도', '위험 감수', '극복', '돌파구', '혁신'],
  '커뮤니케이션': ['설득', '발표', '협상', '소통', '전달'],
  '혁신': ['새로운 방식', '개선', '변화', '혁신적', '창조'],
  '책임감': ['완주', '신뢰', '약속이행', '품질', '성실']
};

// 사용자 경험에서 부족한 역량 찾기
export function analyzeGaps(userExperiences: string[]): GapTag[] {
  const foundCompetencies = new Set<string>();

  // 사용자 경험에서 언급된 역량들 찾기
  userExperiences.forEach(experience => {
    const lowerExp = experience.toLowerCase();
    Object.entries(COMPETENCY_KEYWORDS).forEach(([competency, keywords]) => {
      keywords.forEach(keyword => {
        if (lowerExp.includes(keyword.toLowerCase())) {
          foundCompetencies.add(competency);
        }
      });
    });
  });

  // 전체 역량에서 부족한 것들 찾기
  const allCompetencies = Object.keys(COMPETENCY_KEYWORDS);
  const missingCompetencies = allCompetencies.filter(comp => !foundCompetencies.has(comp));

  // 랜덤하게 3-5개의 Gap 태그 생성 (실제로는 더 정교한 분석 필요)
  const selectedGaps = missingCompetencies
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(5, Math.max(3, missingCompetencies.length)));

  return selectedGaps.map(competency => {
    const relatedQuestion = MOCK_QUESTIONS.find(q =>
      q.question.includes(competency) ||
      COMPETENCY_KEYWORDS[competency].some(keyword =>
        q.question.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    return {
      id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: competency,
      category: competency,
      source: relatedQuestion ? `${relatedQuestion.company} ${relatedQuestion.position}` : '역량 분석',
      createdAt: Date.now()
    };
  });
}

// 특정 역량에 대한 질문 추천
export function getRecommendedQuestions(competency: string): GapQuestion[] {
  return MOCK_QUESTIONS.filter(q => {
    const keywords = COMPETENCY_KEYWORDS[competency] || [];
    return q.question.includes(competency) ||
           keywords.some(keyword => q.question.toLowerCase().includes(keyword.toLowerCase()));
  });
}

// 난이도별 질문 필터링
export function filterQuestionsByDifficulty(
  questions: GapQuestion[],
  difficulty: 'easy' | 'medium' | 'hard' | null
): GapQuestion[] {
  if (!difficulty) return questions;
  return questions.filter(q => q.difficulty === difficulty);
}

// 회사별 질문 필터링
export function filterQuestionsByCompany(
  questions: GapQuestion[],
  company: string
): GapQuestion[] {
  if (!company) return questions;
  return questions.filter(q =>
    q.company?.toLowerCase().includes(company.toLowerCase())
  );
}