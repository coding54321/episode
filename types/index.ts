// OAuth 제공자 타입
export type OAuthProvider = 'kakao' | 'google';
export type AuthProvider = OAuthProvider | 'email';

// 사용자 정보
export interface User {
  id: string;
  name: string;
  email: string;
  provider: AuthProvider;
  createdAt: number;
  updatedAt?: number;
  avatar?: string;
  isVerified?: boolean;
  jobGroup?: string | null; // 직군
  jobRole?: string | null; // 직무
  onboardingCompleted?: boolean; // 온보딩 완료 여부
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
  isManuallyPositioned?: boolean; // 수동으로 위치를 조정했는지 여부
  color?: string; // 브랜치별 색상 ('violet', 'blue', 'mint' 등)
  startDate?: number | null; // 경험 시작일 (timestamp)
  endDate?: number | null; // 경험 종료일 (timestamp)
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
  tags?: readonly string[]; // 강점/역량 태그 (예: ["협업", "리더십", "책임감"])
  characterCount?: number; // 글자수
  isCompleted?: boolean; // STAR 작성 완료 여부
}

// 공백 태그
export interface GapTag {
  id: string;
  label: string;
  category: string; // 역량 범주
  source: string; // 어떤 직무 문항에서 추출되었는지 (직무 중심)
  questions?: Array<{
    content: string; // 질문 내용
    year?: number; // 년도
    half?: string; // 반기 (상반기/하반기)
  }>; // 답변하기 어려웠던 질문 리스트 (년도/반기 정보 포함)
  createdAt: number;
  company_id?: string; // 관련 기업 ID (선택사항)
  job_id?: string; // 관련 직무 ID (선택사항)
  question_id?: string; // 관련 문항 ID
  job_group?: string; // 직군
  job_role?: string; // 직무
  diagnosis_result_id?: string; // 진단 결과 ID
}

// 기출문항 셀프진단 결과
export interface GapDiagnosisResult {
  id: string;
  userId: string;
  jobGroup: string; // 직군
  jobRole: string; // 직무
  tags: GapTag[]; // 역량 빈틈 태그들
  createdAt: number; // 진단 시점
  updatedAt?: number;
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

// 챗봇 메시지 역할 타입
export type ChatMessageRole = 'user' | 'assistant' | 'system';

// 챗봇 메시지
export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  phase?: STARPhase;
  metadata?: Record<string, unknown>;
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

// 레이아웃 타입
export type LayoutType = 'radial' | 'hierarchical' | 'tree' | 'force-directed' | 'branch';

// 레이아웃 설정
export interface LayoutConfig {
  autoLayout?: boolean;
  spacing?: {
    horizontal?: number;
    vertical?: number;
    radial?: number;
  };
  preserveManualPositions?: boolean;
}

// 색상 테마 타입
export type ColorTheme = 'default' | 'pastel' | 'vivid' | 'monochrome';

// 마인드맵 설정
export interface MindMapSettings {
  colorTheme: ColorTheme;
  showGrid?: boolean;
}

// 포스트잇
export interface PostIt {
  id: string;
  projectId: string;
  title: string;
  content: string;
  x: number; // 캔버스 상의 x 좌표
  y: number; // 캔버스 상의 y 좌표
  width?: number; // 포스트잇 너비 (기본값: 200)
  height?: number; // 포스트잇 높이 (기본값: 150)
  color?: string; // 포스트잇 색상 (기본값: 노란색 계열)
  zIndex?: number; // z-index (노드보다 위에 표시)
  createdAt: number;
  updatedAt: number;
  sourceTagId?: string; // 역량 카드에서 생성된 경우 태그 ID
}

// 마인드맵 프로젝트
export interface MindMapProject {
  id: string;
  name: string;
  description?: string;
  badges: BadgeType[];
  nodes: MindMapNode[];
  postIts?: PostIt[]; // 포스트잇 목록
  nodeCount?: number; // 노드 개수 (목록 조회 시 사용, 상세 조회 시에는 nodes.length 사용)
  layoutType?: LayoutType; // 레이아웃 타입
  layoutConfig?: LayoutConfig; // 레이아웃 설정
  settings?: MindMapSettings; // 마인드맵 설정 (색상 테마, 연결선 스타일 등)
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
  isFavorite?: boolean;
  projectType?: 'personal' | 'collaborative'; // 프로젝트 타입 (개인/공동)
  isShared?: boolean; // 공유된 마인드맵인지 여부 (팀 마인드맵에서만 사용)
  sharedBy?: string; // 공유한 사용자 ID
  sharedByUser?: { id: string; name: string; email?: string }; // 공유한 사용자 정보
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
  createdBy?: string; // 공유한 사용자 ID
  createdByUser?: { id: string; name: string; email?: string }; // 공유한 사용자 정보
}

// 에피소드 보관함 아이템
export interface ArchiveItem {
  id: string;
  projectId: string;
  projectName: string;
  category: BadgeType; // 대분류 (인턴, 동아리 등)
  categoryLabel: string;
  experienceName: string; // 경험명
  episodeName: string; // 에피소드명
  experienceStartDate?: number | null; // 경험 시작일 (timestamp)
  experienceEndDate?: number | null; // 경험 종료일 (timestamp)
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

