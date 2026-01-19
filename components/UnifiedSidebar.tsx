'use client';

import { useState, useEffect } from 'react';
import { GapTag, MindMapNode, NodeType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, ChevronRight, ChevronLeft, Sparkles, FileText, Check, ChevronLeft as ChevronLeftIcon, Save, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gapTagStorage, assetStorage } from '@/lib/storage';
import { useDrag } from 'react-dnd';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { STARAsset, COMPETENCY_KEYWORDS } from '@/types';
import { 
  Recruitment,
  Question, 
  CompetencyType 
} from '@/types';
import {
  getQuestionsByJobTitleOnly,
  getCompetencyTypeById,
} from '@/lib/supabase/companyData';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { ChevronDown } from 'lucide-react';
import { GapDiagnosisResult } from '@/types';
import { saveGapDiagnosisResult, getGapDiagnosisResults, getGapDiagnosisResultById } from '@/lib/supabase/data';
import { supabase } from '@/lib/supabase/client';

interface UnifiedSidebarProps {
  selectedNodeId: string | null;
  selectedNodeLabel: string | null;
  selectedNodeType?: NodeType;
  selectedNodeLevel?: number;
  nodes?: MindMapNode[]; // 전체 노드 목록 (에피소드 필터링용)
  onSTARComplete: (content: { situation: string; task: string; action: string; result: string }) => void;
  onNodeAdd?: (parentId: string, label: string, nodeType: NodeType) => void;
  onNodeLabelUpdate?: (nodeId: string, newLabel: string) => void; // 노드 라벨 업데이트 콜백
  onClose: () => void;
  onTagDrop?: (tag: GapTag, targetNodeId: string) => void;
  defaultMainTab?: 'gap' | 'star';
  initialWidth?: number; // 초기 너비 (기본값: 384px = w-96)
  minWidth?: number; // 최소 너비 (기본값: 320px)
  topOffset?: number; // 상단 오프셋 (프로젝트 정보 헤더 높이 고려)
  projectType?: 'personal' | 'collaborative'; // 프로젝트 타입
}

type GapStep = 'list' | 'job' | 'questions' | 'result';

// 직군 목록
const JOB_GROUPS = [
  'IT/개발',
  '기획/마케팅',
  '디자인',
  '영업/고객상담',
  '인사/총무',
  '회계/재무',
  '기타',
];

// 직무 목록 (직군별)
const JOB_ROLES: Record<string, string[]> = {
  'IT/개발': ['백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자', '데이터 엔지니어', 'DevOps 엔지니어'],
  '기획/마케팅': ['서비스 기획자', '프로덕트 매니저', '마케팅 전문가', '브랜드 매니저'],
  '디자인': ['UI/UX 디자이너', '그래픽 디자이너', '브랜드 디자이너'],
  '영업/고객상담': ['영업 담당자', '고객 성공 매니저', 'CS 담당자'],
  '인사/총무': ['인사 담당자', '채용 담당자', '총무 담당자'],
  '회계/재무': ['회계 담당자', '재무 분석가', '세무 담당자'],
  '기타': ['기타'],
};

function GapTagCard({ tag, onRemove, onShowQuestions }: { tag: GapTag; onRemove: (id: string) => void; onShowQuestions?: (tag: GapTag) => void }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'gap-tag',
    item: { tag },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // "(부족 n건)" 텍스트 제거
  const displaySource = tag.source?.replace(/\s*\(부족\s*\d+건\)/g, '') || '';

  return (
    <div
      ref={drag as any}
      className="cursor-move"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
      <Card className="group relative p-5 rounded-[16px] bg-white border-2 border-gray-100 hover:border-blue-400 hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Badge className="mb-3 bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 font-semibold px-3 py-1">
              {tag.category}
              </Badge>
            {/* category와 label이 같으면 label은 표시하지 않음 */}
            {tag.category !== tag.label && (
              <h4 className="font-bold text-base text-gray-900 mb-2 leading-tight">{tag.label}</h4>
            )}
            <p className="text-sm text-gray-500">{displaySource}</p>
            {tag.questions && tag.questions.length > 0 && onShowQuestions && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowQuestions(tag);
                }}
                className="text-xs text-blue-600 mt-2 font-medium hover:underline"
              >
                클릭하여 질문 보기 ({tag.questions.length}개)
              </button>
            )}
          </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tag.id);
              }}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-full transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
            <X className="h-4 w-4 text-gray-400 hover:text-red-600" />
            </button>
          </div>
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-gray-400 font-medium">드래그하여 추가</span>
        </div>
      </Card>
      </motion.div>
    </div>
  );
}

export default function UnifiedSidebar({
  selectedNodeId,
  selectedNodeLabel,
  selectedNodeType,
  selectedNodeLevel,
  nodes = [],
  onSTARComplete,
  onNodeAdd,
  onNodeLabelUpdate,
  onClose,
  onTagDrop,
  defaultMainTab = 'gap',
  initialWidth = 384, // w-96 = 384px
  minWidth = 320,
  topOffset = 120,
  projectType = 'personal',
}: UnifiedSidebarProps) {
  // 메인 탭 상태 (기출문항 셀프진단 / STAR 정리하기)
  // 팀 마인드맵일 때는 기출문항 셀프진단 탭을 사용할 수 없으므로 'star'로 고정
  const [mainTab, setMainTab] = useState<'gap' | 'star'>(
    projectType === 'collaborative' ? 'star' : defaultMainTab
  );
  
  // 사이드바 너비 상태
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  

  // defaultMainTab이 변경되면 mainTab 업데이트 (팀 마인드맵이 아닐 때만)
  useEffect(() => {
    if (projectType !== 'collaborative') {
      setMainTab(defaultMainTab);
    } else {
      // 팀 마인드맵일 때는 항상 'star'로 유지
      setMainTab('star');
    }
  }, [defaultMainTab, projectType]);
  
  // selectedNodeId가 에피소드 노드이고 STAR 탭이 활성화되어 있으면 자동으로 편집 화면 표시
  useEffect(() => {
    if (mainTab === 'star' && selectedNodeId) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId);
      const isEpisodeNode = selectedNode && (selectedNode.nodeType === 'episode' || selectedNode.level === 3);
      
      if (isEpisodeNode && selectedNode) {
        // 에피소드 노드이면 자동으로 편집 화면 표시
        const loadStarData = async () => {
          setSelectedEpisodeNodeId(selectedNode.id);
          setStarEditorTitle(selectedNode.label);
          
          // 기존 STAR 데이터 로드
          const existingAsset = await assetStorage.getByNodeId(selectedNode.id);
          if (existingAsset) {
            setStarEditorSituation(existingAsset.situation || '');
            setStarEditorTask(existingAsset.task || '');
            setStarEditorAction(existingAsset.action || '');
            setStarEditorResult(existingAsset.result || '');
            setStarEditorTags(existingAsset.tags ? [...existingAsset.tags] : []);
          } else {
            setStarEditorSituation('');
            setStarEditorTask('');
            setStarEditorAction('');
            setStarEditorResult('');
            setStarEditorTags([]);
          }
        };
        
        loadStarData();
      }
    }
  }, [mainTab, selectedNodeId, nodes]);
  
  // 기출문항 셀프진단 상태
  const { user } = useUnifiedAuth();
  const [gapStep, setGapStep] = useState<GapStep>('list');
  const [selectedJobGroup, setSelectedJobGroup] = useState<string>('');
  const [selectedJobRole, setSelectedJobRole] = useState<string>('');
  const [isJobGroupOpen, setIsJobGroupOpen] = useState(false);
  const [isJobRoleOpen, setIsJobRoleOpen] = useState(false);
  const [questions, setQuestions] = useState<Array<Question & { recruitment?: Recruitment }>>([]);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [analyzedTags, setAnalyzedTags] = useState<GapTag[]>([]);
  const [isGapLoading, setIsGapLoading] = useState(false);
  const [hasInitializedJobSelection, setHasInitializedJobSelection] = useState(false);
  const [diagnosisResults, setDiagnosisResults] = useState<GapDiagnosisResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  
  // 추천 인벤토리 상태
  const [gapTags, setGapTags] = useState<GapTag[]>([]);
  const [selectedTagForQuestions, setSelectedTagForQuestions] = useState<GapTag | null>(null);

  // STAR 정리하기 상태
  const [selectedEpisodeNodeId, setSelectedEpisodeNodeId] = useState<string | null>(null);
  const [starEditorTitle, setStarEditorTitle] = useState('');
  const [starEditorSituation, setStarEditorSituation] = useState('');
  const [starEditorTask, setStarEditorTask] = useState('');
  const [starEditorAction, setStarEditorAction] = useState('');
  const [starEditorResult, setStarEditorResult] = useState('');
  const [starEditorTags, setStarEditorTags] = useState<string[]>([]);
  const [starEditorContent, setStarEditorContent] = useState('');
  const [isStarCopied, setIsStarCopied] = useState(false);

  // 에피소드 노드 필터링
  const episodeNodes = nodes.filter(node => node.nodeType === 'episode' || node.level === 3);

  // 노드 트리 경로 생성 함수
  const getNodePath = (node: MindMapNode): string => {
    const path: string[] = [];
    let currentNode: MindMapNode | undefined = node;
    
    // 부모 노드를 따라 올라가면서 경로 구성
    while (currentNode) {
      path.unshift(currentNode.label);
      
      if (!currentNode.parentId) break;
      currentNode = nodes.find(n => n.id === currentNode!.parentId);
    }
    
    return path.join(' > ');
  };

  // 공백 태그 로드
  useEffect(() => {
    const loadTags = async () => {
      const tags = await gapTagStorage.load();
      setGapTags(tags);
    };
    loadTags();

    const handleTagsUpdate = () => {
      loadTags();
    };
    window.addEventListener('gap-tags-updated', handleTagsUpdate);
    return () => window.removeEventListener('gap-tags-updated', handleTagsUpdate);
  }, []);

  // 이전 진단 결과 로드
  useEffect(() => {
    const loadDiagnosisResults = async () => {
      if (mainTab === 'gap' && user?.id) {
        setIsLoadingResults(true);
        try {
          const results = await getGapDiagnosisResults(user.id);
          setDiagnosisResults(results);
        } catch (error) {
          console.error('Failed to load diagnosis results:', error);
        } finally {
          setIsLoadingResults(false);
        }
      }
    };
    loadDiagnosisResults();
  }, [mainTab, user?.id]);

  // 직무 선택 단계로 이동할 때 사용자의 기본 직무 정보 설정
  useEffect(() => {
    if (mainTab === 'gap' && gapStep === 'job' && user && !hasInitializedJobSelection) {
      // 사용자의 온보딩에서 받은 직군/직무를 기본값으로 설정
      if (user.jobGroup) {
        setSelectedJobGroup(user.jobGroup);
      }
      if (user.jobRole && user.jobGroup) {
        setSelectedJobRole(user.jobRole);
      }
      setHasInitializedJobSelection(true);
    } else if (mainTab !== 'gap' || gapStep !== 'job') {
      // 다른 단계로 이동하면 초기화 플래그 리셋
      setHasInitializedJobSelection(false);
    }
  }, [mainTab, gapStep, user, hasInitializedJobSelection]);

  // 직군 선택
  const handleJobGroupSelect = (jobGroup: string) => {
    setSelectedJobGroup(jobGroup);
    setSelectedJobRole(''); // 직군 변경 시 직무 초기화
    setIsJobGroupOpen(false);
  };

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
        toast.error('직무 정보 저장에 실패했습니다.');
        return;
      }

      toast.success('직무가 변경되었습니다.');
      
      // 사용자 정보 새로고침을 위해 페이지 리로드
      // 변경된 직무 정보가 반영된 상태로 list 화면 표시
      window.location.reload();
    } catch (error) {
      console.error('Error updating user job info:', error);
      toast.error('직무 정보 저장 중 오류가 발생했습니다.');
    }
  };

  // 직무 선택 (진단 시작)
  const handleJobRoleSelect = async (jobRole: string) => {
    setSelectedJobRole(jobRole);
    setIsJobRoleOpen(false);
    setIsGapLoading(true);

    try {
      // 직무 중심으로 문항 조회
      const allQuestions = await getQuestionsByJobTitleOnly(jobRole);
      setQuestions(allQuestions);
      setGapStep('questions');
    } catch (error) {
      console.error('문항 로드 실패:', error);
    } finally {
      setIsGapLoading(false);
    }
  };

  const handleResponseToggle = (questionId: string, hasMaterial: boolean) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: hasMaterial,
    }));
  };

  const handleAnalyze = async () => {
    if (!user) return;

    setIsGapLoading(true);
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
    setGapStep('result');
    setIsGapLoading(false);
    
    // 태그 저장
    for (const tag of tags) {
      await gapTagStorage.add(tag);
    }
    
    // 추천 인벤토리 업데이트
    const allTags = await gapTagStorage.load();
    setGapTags(allTags);
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('gap-tags-updated'));
  };

  const handleRestart = () => {
    setGapStep('list');
    setSelectedJobGroup('');
    setSelectedJobRole('');
    setQuestions([]);
    setResponses({});
    setAnalyzedTags([]);
    setHasInitializedJobSelection(false);
    setSelectedResultId(null);
    // 진단 결과 목록 다시 로드
    if (user?.id) {
      getGapDiagnosisResults(user.id).then(setDiagnosisResults);
    }
  };

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

  const sortedYearHalfKeys = Object.keys(questionsByYearHalf).sort((a, b) => {
    const aData = questionsByYearHalf[a];
    const bData = questionsByYearHalf[b];
    if (aData.year !== bData.year) return bData.year - aData.year;
    return aData.half === '하반기' ? -1 : 1;
  });


  // 사이드바 너비 조절 핸들러
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(minWidth, Math.min(newWidth, window.innerWidth * 0.8));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minWidth]);

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute right-0 glass-card shadow-2xl z-[55] flex flex-col border-l border-gray-200"
      style={{ 
        top: topOffset || 120,
        height: `calc(100vh - ${topOffset || 120}px)`,
        width: `${sidebarWidth}px`,
        maxHeight: `calc(100vh - ${topOffset || 120}px)`,
      }}
    >
      {/* 리사이즈 핸들 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#5B6EFF] transition-colors z-10"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        style={{
          cursor: isResizing ? 'col-resize' : 'col-resize',
        }}
      />
      {/* 기출문항 셀프진단 탭 (개인 마인드맵에서만 표시) */}
      {mainTab === 'gap' && projectType !== 'collaborative' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* 헤더 */}
          <div className="px-6 pt-4 pb-2 flex-shrink-0 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">기출문항 셀프진단</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 rounded-full transition-colors flex-shrink-0"
                title="닫기"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <ScrollArea className="flex-1 px-6 py-4 min-h-0">
              {/* 이전 진단 결과 목록 */}
              {gapStep === 'list' && (
                <div className="space-y-6">
                  {isLoadingResults ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">로딩 중...</p>
                    </div>
                  ) : diagnosisResults.length > 0 ? (
                    <>
                      {/* 이전 진단 결과 카드 목록 */}
                      <div className="space-y-3">
                        {diagnosisResults.map((result) => (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#5B6EFF] hover:shadow-md transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedResultId(result.id);
                              setAnalyzedTags(result.tags);
                              setGapStep('result');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900 mb-1">
                                  {result.jobRole} 직무 진단 결과
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {new Date(result.createdAt).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  부족한 역량 {result.tags.length}개
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      {/* 다시 진단하기 버튼 */}
                      <Button
                        onClick={() => {
                          setSelectedJobGroup('');
                          setSelectedJobRole('');
                          setHasInitializedJobSelection(false);
                          setGapStep('job');
                        }}
                        className="w-full h-12 bg-[#5B6EFF] hover:bg-[#4B5EEF] text-white"
                      >
                        다시 진단하기
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* 이전 진단 결과가 없는 경우 */}
                      <div className="space-y-4">
                        {/* 사용자 직무 정보 표시 */}
                        {user?.jobGroup && user?.jobRole ? (
                          <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">
                              {user?.name || ''}님의 희망 직무는
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {user.jobRole} 직무예요
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-600">희망 직무 정보가 없습니다.</p>
                          </div>
                        )}
                        {/* 희망직무 변경하기 버튼 */}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedJobGroup('');
                            setSelectedJobRole('');
                            setHasInitializedJobSelection(false);
                            setGapStep('job');
                          }}
                          className="w-full h-12"
                        >
                          희망직무 변경하기
                        </Button>
                        {/* 진단 시작하기 버튼 */}
                        <Button
                          onClick={() => {
                            // 사용자의 기본 직무로 바로 진단 시작
                            if (user?.jobGroup && user?.jobRole) {
                              setSelectedJobGroup(user.jobGroup);
                              setSelectedJobRole(user.jobRole);
                              handleJobRoleSelect(user.jobRole);
                            } else {
                              setGapStep('job');
                            }
                          }}
                          className="w-full h-12 bg-[#5B6EFF] hover:bg-[#4B5EEF] text-white"
                        >
                          진단 시작하기
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 직무 선택 */}
              {gapStep === 'job' && (
                <div className="space-y-6">
                  {/* 사용자 직무 정보 표시 */}
                  {user?.jobGroup && user?.jobRole && (
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">
                        {user?.name || ''}님의 희망 직무는
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {user.jobRole} 직무예요
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
                          {(JOB_ROLES[selectedJobGroup] || []).map((role) => (
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
                        onClick={() => setGapStep('list')}
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

              {/* 문항 체크 */}
              {gapStep === 'questions' && (
                <div className="space-y-6">
                  <button
                    onClick={() => setGapStep('job')}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    뒤로가기
                  </button>
                  {isGapLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">문항을 불러오는 중...</p>
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">해당 직무의 문항이 없습니다.</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-[#5B6EFF]/10 rounded-xl p-4">
                        <p className="text-sm text-[#4B5EEF]">
                          <strong>{selectedJobRole}</strong> 직무의 최근 5개년 최빈출 문항입니다.
                          각 문항에 대해 작성할 소재가 있는지 체크해주세요.
                        </p>
                      </div>
                      
                      {sortedYearHalfKeys.map((yearHalfKey) => {
                        const group = questionsByYearHalf[yearHalfKey];
                        return (
                          <div key={yearHalfKey} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                              <div className="h-px flex-1 bg-gradient-to-r from-[#5B6EFF]/30 to-transparent"></div>
                              <h3 className="text-sm font-bold text-gray-900 px-3 py-1 bg-[#5B6EFF]/10 rounded-full">
                                {yearHalfKey}
                              </h3>
                              <div className="h-px flex-1 bg-gradient-to-l from-[#5B6EFF]/30 to-transparent"></div>
                            </div>
                            
                            <div className="space-y-2">
                              {group.questions.map((q) => (
                                <div
                                  key={q.id}
                                  className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white card-hover"
                                >
                                  <div className="flex gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-start gap-2 mb-3">
                                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-[#5B6EFF]/10 text-blue-600 rounded-full text-xs font-semibold flex-shrink-0">
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
                                            ? 'bg-[#5B6EFF] text-white'
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
                    </>
                  )}
                </div>
              )}

              {/* 결과 */}
              {gapStep === 'result' && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-[#5B6EFF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedResultId ? '이전 진단 결과' : '분석 완료'}
                    </h3>
                    {!selectedResultId && (
                      <p className="text-sm text-gray-600">
                        총 {questions.length}개 문항 중 {Object.values(responses).filter(r => r === false).length}개 문항에서 소재가 부족합니다
                      </p>
                    )}
                  </div>

                  {analyzedTags.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">부족한 역량</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {analyzedTags.map(tag => (
                          <motion.div
                            key={tag.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-red-50 border border-red-100 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h5 className="font-semibold text-red-900 mb-1">{tag.label}</h5>
                                <p className="text-xs text-red-600 mb-2">{tag.source}</p>
                                {tag.category && (
                                  <p className="text-xs text-gray-500">
                                    → {tag.category}에 대한 영역
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
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

              {/* 푸터 버튼 */}
              {gapStep !== 'list' && (
                <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
                  <div className="flex justify-end gap-3">
                    {gapStep === 'result' && (
                      <>
                        <Button variant="outline" onClick={() => setGapStep('list')}>
                          목록으로
                        </Button>
                        <Button variant="outline" onClick={handleRestart}>
                          다시 진단
                        </Button>
                      </>
                    )}

                    {gapStep === 'questions' && (
                      <Button
                        onClick={handleAnalyze}
                        disabled={Object.keys(responses).length !== questions.length}
                        className="bg-[#5B6EFF] hover:bg-[#4B5EEF]"
                      >
                        분석하기
                      </Button>
                    )}

                    {gapStep === 'result' && analyzedTags.length > 0 && (
                      <Button
                        onClick={async () => {
                          const allTags = await gapTagStorage.load();
                          setGapTags(allTags);
                        }}
                        className="bg-[#5B6EFF] hover:bg-[#4B5EEF]"
                      >
                        추가 경험 정리하기
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* STAR 정리하기 탭 */}
      {mainTab === 'star' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-6 pt-4 pb-2 flex-shrink-0 border-b border-gray-100">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">STAR 정리하기</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 rounded-full transition-colors flex-shrink-0"
              title="닫기"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {!selectedEpisodeNodeId ? (
            // 에피소드 노드 목록
            <ScrollArea className="flex-1 min-h-0 px-6 py-4">
              {episodeNodes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#5B6EFF]/10 to-[#5B6EFF]/20 rounded-[20px] flex items-center justify-center mx-auto mb-5">
                      <FileText className="w-10 h-10 text-blue-600" />
                    </div>
                    <p className="font-bold text-lg text-gray-900 mb-2">에피소드가 없습니다</p>
                    <p className="text-sm text-gray-500">마인드맵에 에피소드 노드를 추가해주세요</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {episodeNodes.map((node) => (
                    <Card
                      key={node.id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-200 card-hover"
                      onClick={async () => {
                        setSelectedEpisodeNodeId(node.id);
                        setStarEditorTitle(node.label);
                        
                        // 기존 STAR 데이터 로드
                        const existingAsset = await assetStorage.getByNodeId(node.id);
                        if (existingAsset) {
                          setStarEditorSituation(existingAsset.situation || '');
                          setStarEditorTask(existingAsset.task || '');
                          setStarEditorAction(existingAsset.action || '');
                          setStarEditorResult(existingAsset.result || '');
                          setStarEditorTags(existingAsset.tags ? [...existingAsset.tags] : []);
                        } else {
                          setStarEditorSituation('');
                          setStarEditorTask('');
                          setStarEditorAction('');
                          setStarEditorResult('');
                          setStarEditorTags([]);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1 truncate">{node.label}</h3>
                          <p className="text-xs text-gray-500 truncate">{getNodePath(node)}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          ) : (
            // STAR 에디터
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-6 pt-4 pb-2 flex-shrink-0 border-b border-gray-100">
                <button
                  onClick={() => {
                    setSelectedEpisodeNodeId(null);
                    setStarEditorTitle('');
                    setStarEditorSituation('');
                    setStarEditorTask('');
                    setStarEditorAction('');
                    setStarEditorResult('');
                    setStarEditorTags([]);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  목록으로 돌아가기
                </button>
              </div>
              
              <ScrollArea className="flex-1 px-6 py-4 min-h-0">
                <div className="space-y-6">
                  {/* 제목 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      제목 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={starEditorTitle}
                      onChange={(e) => setStarEditorTitle(e.target.value)}
                      placeholder="예: 웹 개발 프로젝트 경험"
                      className="w-full"
                    />
                  </div>

                  {/* STAR 구성 요소 */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Badge variant="outline" className="mr-2">S</Badge>
                        상황 (Situation)
                      </label>
                      <Textarea
                        value={starEditorSituation}
                        onChange={(e) => setStarEditorSituation(e.target.value)}
                        placeholder="어떤 상황이었나요?"
                        className="min-h-[100px] bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Badge variant="outline" className="mr-2">T</Badge>
                        과제 (Task)
                      </label>
                      <Textarea
                        value={starEditorTask}
                        onChange={(e) => setStarEditorTask(e.target.value)}
                        placeholder="어떤 과제나 목표가 있었나요?"
                        className="min-h-[100px] bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Badge variant="outline" className="mr-2">A</Badge>
                        행동 (Action)
                      </label>
                      <Textarea
                        value={starEditorAction}
                        onChange={(e) => setStarEditorAction(e.target.value)}
                        placeholder="구체적으로 어떤 행동을 취했나요?"
                        className="min-h-[100px] bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Badge variant="outline" className="mr-2">R</Badge>
                        결과 (Result)
                      </label>
                      <Textarea
                        value={starEditorResult}
                        onChange={(e) => setStarEditorResult(e.target.value)}
                        placeholder="결과는 어땠나요?"
                        className="min-h-[100px] bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                  </div>

                  {/* 역량 키워드 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      강점/역량 태그 선택
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMPETENCY_KEYWORDS.map((keyword) => (
                        <Badge
                          key={keyword}
                          variant={starEditorTags.includes(keyword) ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            starEditorTags.includes(keyword)
                              ? 'bg-[#5B6EFF] text-white hover:bg-[#4B5EEF]'
                              : 'hover:bg-gray-100 border-gray-200 text-gray-700'
                          }`}
                          onClick={() => {
                            setStarEditorTags(prev =>
                              prev.includes(keyword)
                                ? prev.filter(t => t !== keyword)
                                : [...prev, keyword]
                            );
                          }}
                        >
                          {keyword}
                          {starEditorTags.includes(keyword) && (
                            <X className="ml-1 h-3 w-3" />
                          )}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      이 경험에서 발휘한 강점이나 역량을 선택해주세요 (복수 선택 가능)
                    </p>
                  </div>
                </div>
              </ScrollArea>

              {/* 액션 버튼 */}
              <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const parts = [];
                      if (starEditorSituation) parts.push(`상황(Situation): ${starEditorSituation}`);
                      if (starEditorTask) parts.push(`과제(Task): ${starEditorTask}`);
                      if (starEditorAction) parts.push(`행동(Action): ${starEditorAction}`);
                      if (starEditorResult) parts.push(`결과(Result): ${starEditorResult}`);
                      const content = parts.join('\n\n');
                      
                      try {
                        await navigator.clipboard.writeText(content);
                        setIsStarCopied(true);
                        toast.success('클립보드에 복사되었습니다');
                        setTimeout(() => setIsStarCopied(false), 2000);
                      } catch (error) {
                        toast.error('복사에 실패했습니다');
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    복사
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!starEditorTitle.trim()) {
                        toast.error('제목을 입력해주세요');
                        return;
                      }

                      if (!selectedEpisodeNodeId) {
                        toast.error('노드 정보가 없습니다');
                        return;
                      }

                      const parts = [];
                      if (starEditorSituation) parts.push(`상황(Situation): ${starEditorSituation}`);
                      if (starEditorTask) parts.push(`과제(Task): ${starEditorTask}`);
                      if (starEditorAction) parts.push(`행동(Action): ${starEditorAction}`);
                      if (starEditorResult) parts.push(`결과(Result): ${starEditorResult}`);
                      const content = parts.join('\n\n');

                      if (!content.trim()) {
                        toast.error('내용을 입력해주세요');
                        return;
                      }

                      // 기존 asset 확인
                      const existingAsset = await assetStorage.getByNodeId(selectedEpisodeNodeId);

                      const asset: STARAsset = {
                        id: existingAsset?.id || `asset_${Date.now()}`,
                        nodeId: selectedEpisodeNodeId,
                        title: starEditorTitle.trim(),
                        situation: starEditorSituation,
                        task: starEditorTask,
                        action: starEditorAction,
                        result: starEditorResult,
                        content,
                        tags: starEditorTags,
                        createdAt: existingAsset?.createdAt || Date.now(),
                        updatedAt: Date.now(),
                      };

                      // 기존 asset이 있으면 업데이트, 없으면 추가
                      if (existingAsset) {
                        await assetStorage.update(existingAsset.id, asset);
                      } else {
                        await assetStorage.add(asset);
                      }

                      // 노드 라벨이 변경되었으면 마인드맵 노드도 업데이트
                      const selectedNode = nodes.find(n => n.id === selectedEpisodeNodeId);
                      if (onNodeLabelUpdate && selectedNode && starEditorTitle.trim() !== selectedNode.label) {
                        onNodeLabelUpdate(selectedEpisodeNodeId, starEditorTitle.trim());
                      }
                      
                      toast.success('저장되었습니다');
                    }}
                    className="bg-[#5B6EFF] hover:bg-[#4B5EEF] text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    저장하기
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* 질문 리스트 모달 */}
      {selectedTagForQuestions && selectedTagForQuestions.questions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]" onClick={() => setSelectedTagForQuestions(null)}>
          <div className="glass-card rounded-[24px] p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedTagForQuestions.label}</h3>
                <p className="text-sm text-gray-500">{selectedTagForQuestions.source}</p>
              </div>
              <button
                onClick={() => setSelectedTagForQuestions(null)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">답변하기 어려웠던 질문 ({selectedTagForQuestions.questions.length}개)</h4>
              </div>
              {selectedTagForQuestions.questions.map((question, index) => (
                <div key={index} className="p-4 rounded-[12px] bg-gray-50 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#5B6EFF]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 leading-relaxed mb-1">
                        {typeof question === 'string' ? question : question.content}
                      </p>
                      {typeof question === 'object' && question.year && question.half && (
                        <p className="text-xs text-gray-500 font-medium">
                          {question.year}년 {question.half}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
