export interface MindMapNode {
  id: string;
  label: string;
  parentId: string | null;
  children: string[];
  x: number;
  y: number;
  level: number;
  isShared?: boolean;
  sharedLink?: string;
}

export interface GapTag {
  id: string;
  label: string;
  source: string; // 어떤 기업 문항에서 추출되었는지
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

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
}

export interface NodeTableEntry {
  id: string;
  nodeId: string;
  category: string; // 대분류 (인턴, 학업, 동아리 등)
  experience: string; // 경험 (구체적인 경험명)
  episode: string; // 에피소드 (세부 경험)
  situation: string;
  task: string;
  action: string;
  result: string;
  competencyTags: string[]; // 역량 태그들
  level: number; // 노드 레벨 (1: 대분류, 2: 경험, 3: 에피소드)
  path: string; // 전체 경로 (대분류 > 경험 > 에피소드)
  createdAt: number;
  updatedAt: number;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
}

export interface JobRole {
  id: string;
  name: string;
}

export interface Question {
  id: string;
  text: string;
  competency: string; // 핵심 역량 키워드
}