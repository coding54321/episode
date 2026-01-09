// 사용자 정보
export interface User {
  id: string;
  name: string;
  email: string;
  provider: 'kakao' | 'google';
  createdAt: number;
}

// 배지 타입
export type BadgeType = 'intern' | 'academic' | 'club' | 'project' | 'parttime' | 'volunteer' | 'competition' | 'other';

export interface Badge {
  id: BadgeType;
  label: string;
  icon?: string;
}

// 노드 타입 정의
export type NodeType = 'center' | 'category' | 'experience' | 'episode' | 'detail';

// 마인드맵 노드
export interface MindMapNode {
  id: string;
  label: string;
  parentId: string | null;
  children: string[];
  x: number;
  y: number;
  level: number; // 0: 중심, 1: 대분류(배지), 2: 경험, 3: 에피소드, 4+: 상세 노드
  nodeType?: NodeType; // 노드 유형
  badgeType?: BadgeType; // level 1일 때 배지 타입
  customLabel?: string; // '기타' 배지일 때 사용자가 입력한 실제 라벨
  isShared?: boolean;
  sharedLink?: string;
  createdAt: number;
  updatedAt: number;
}

// STAR 에셋
export interface STARAsset {
  id: string;
  nodeId: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  content: string; // 최종 조립된 텍스트
  createdAt: number;
  updatedAt: number;
  company?: string;
  competency?: string;
  tags?: string[]; // 강점/역량 태그 (예: ["협업", "리더십", "책임감"])
}

// 공백 태그
export interface GapTag {
  id: string;
  label: string;
  category: string; // 역량 범주
  source: string; // 어떤 기업 문항에서 추출되었는지
  createdAt: number;
}

// 기업 정보
export interface Company {
  id: string;
  name: string;
  industry: string;
  logo_url?: string;
}

// 채용 공고
export interface Recruitment {
  id: string;
  company_id: string;
  year: number;
  half: '상반기' | '하반기';
  start_date: string;
  end_date: string;
}

// 직무
export interface Job {
  id: string;
  company_id: string; // 기업에 직접 연결
  job_title: string;
  department: string;
  category?: string; // 직무 카테고리 (개발, 기획, 마케팅 등)
}

// 자기소개서 문항
export interface Question {
  id: string;
  job_id: string;
  recruitment_id?: string; // 어떤 채용 공고의 문항인지 (년도/반기 구분)
  question_no: number;
  content: string;
  max_chars: number; // 글자수 제한
  competency_type_id: string; // 어떤 역량과 관련된 문항인지
}

// 역량 타입
export interface CompetencyType {
  id: string;
  label: string;
  description?: string;
}

// 공백 진단 응답
export interface GapAnalysisResponse {
  question_id: string;
  has_material: boolean; // 소재가 있는지 없는지
}

// STAR 진행 상황
export type STARPhase = 'situation' | 'task' | 'action' | 'result';

export interface STARProgress {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

// 챗봇 메시지
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  phase?: STARPhase;
}

// 탭 정보
export interface MindMapTab {
  id: string;
  label: string;
  nodeId: string | null; // null이면 메인 뷰
  isMain: boolean;
}

// 공백 진단 문항
export interface GapQuestion {
  id: string;
  company?: string;
  position?: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

// 마인드맵 프로젝트
export interface MindMapProject {
  id: string;
  name: string;
  description?: string;
  badges: BadgeType[];
  nodes: MindMapNode[];
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}

// 공유된 노드 데이터
export interface SharedNodeData {
  id: string; // 공유 ID (노드 ID와 동일)
  nodeId: string; // 원본 노드 ID
  projectId: string; // 프로젝트 ID
  node: MindMapNode; // 노드 정보
  descendants: MindMapNode[]; // 하위 노드들
  starAssets: STARAsset[]; // 관련 STAR 에셋
  includeSTAR: boolean; // STAR 에셋 포함 여부
  createdAt: number;
  createdBy?: string; // 공유한 사용자
}

// 에피소드 아카이브 아이템
export interface ArchiveItem {
  id: string;
  projectId: string;
  projectName: string;
  category: BadgeType; // 대분류 (인턴, 동아리 등)
  categoryLabel: string;
  experienceName: string; // 경험명
  episodeName: string; // 에피소드명
  star: STARAsset | null; // STAR 내용 (작성 전이면 null)
  tags: string[]; // 강점/역량 태그
  nodePath: string[]; // 노드 경로 (breadcrumb용)
  createdAt: number;
  updatedAt: number;
}

// 역량 키워드 목록
export const COMPETENCY_KEYWORDS = [
  '리더십',
  '팀워크',
  '협업',
  '커뮤니케이션',
  '문제해결',
  '창의성',
  '책임감',
  '성실성',
  '도전정신',
  '분석력',
  '기획력',
  '실행력',
  '꼼꼼함',
  '적응력',
  '학습능력',
  '시간관리',
  '갈등해결',
  '의사결정',
  '목표지향',
  '열정',
] as const;

