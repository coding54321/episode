'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, STARPhase, STARProgress, GapTag, MindMapNode, NodeType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, ChevronRight, ChevronLeft, Sparkles, FileText, Check, Building2, ChevronLeft as ChevronLeftIcon, Save, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gapTagStorage, assetStorage } from '@/lib/storage';
import { useDrag } from 'react-dnd';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { STARAsset, COMPETENCY_KEYWORDS } from '@/types';
import { 
  Company, 
  Recruitment,
  Job, 
  Question, 
  CompetencyType 
} from '@/types';
import {
  getCompanies,
  getJobsByCompany,
  getJobsByCategory,
  getQuestionsByJobTitle,
  getCompetencyTypeById,
} from '@/lib/supabase/companyData';

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
  defaultMainTab?: 'gap' | 'assistant' | 'star';
  defaultGapTab?: 'analysis' | 'inventory';
  initialWidth?: number; // 초기 너비 (기본값: 384px = w-96)
  minWidth?: number; // 최소 너비 (기본값: 320px)
}

type GapStep = 'company' | 'job' | 'questions' | 'result';

const STAR_QUESTIONS: Record<STARPhase, string[]> = {
  situation: [
    '어떤 상황이었나요?',
    '언제, 어디서 일어난 일인가요?',
    '당시의 배경이나 환경은 어땠나요?',
  ],
  task: [
    '당신에게 주어진 과제나 목표는 무엇이었나요?',
    '어떤 역할을 맡았나요?',
    '해결해야 할 문제는 무엇이었나요?',
  ],
  action: [
    '구체적으로 어떤 행동을 취했나요?',
    '어떤 과정을 거쳤나요?',
    '어떤 방법을 사용했나요?',
  ],
  result: [
    '결과는 어땠나요?',
    '어떤 성과를 얻었나요?',
    '배운 점이나 개선된 점은 무엇인가요?',
  ],
};

function GapTagCard({ tag, onRemove, onShowQuestions }: { tag: GapTag; onRemove: (id: string) => void; onShowQuestions?: (tag: GapTag) => void }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'gap-tag',
    item: { tag },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as any}
      className="cursor-move"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      >
      <Card className="p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#2a2a2a] border border-gray-200 dark:border-[#2a2a2a]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                {tag.label}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-[#a0a0a0] mb-2">{tag.source}</p>
            {tag.questions && tag.questions.length > 0 && onShowQuestions && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowQuestions(tag);
                }}
                className="text-xs text-[#5B6EFF] dark:text-[#7B8FFF] hover:text-[#4B5EEF] dark:hover:text-[#8B9FFF] font-medium"
              >
                관련 질문 {tag.questions.length}개 보기
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tag.id);
              }}
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full transition-colors"
            >
              <X className="h-3 w-3 text-gray-500 dark:text-[#a0a0a0]" />
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2a2a]">
          <span className="text-xs text-gray-500 dark:text-[#a0a0a0]">드래그하여 추가</span>
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
  defaultMainTab = 'assistant',
  defaultGapTab = 'analysis',
  initialWidth = 384, // w-96 = 384px
  minWidth = 320,
}: UnifiedSidebarProps) {
  // 메인 탭 상태 (공백진단하기 / 어시스턴트 / STAR 정리하기)
  const [mainTab, setMainTab] = useState<'gap' | 'assistant' | 'star'>(defaultMainTab);
  
  // 사이드바 너비 상태
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  
  // 공백진단 서브탭 상태 (부족 역량확인 / 추천 인벤토리)
  const [gapSubTab, setGapSubTab] = useState<'analysis' | 'inventory'>(defaultGapTab);

  // defaultMainTab이 변경되면 mainTab 업데이트
  useEffect(() => {
    setMainTab(defaultMainTab);
  }, [defaultMainTab]);

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
  
  // 어시스턴트 탭 상태 (대화)
  const [assistantTab, setAssistantTab] = useState<'chat'>('chat');
  
  // 공백진단 상태
  const [gapStep, setGapStep] = useState<GapStep>('company');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Array<Question & { recruitment?: Recruitment }>>([]);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [analyzedTags, setAnalyzedTags] = useState<GapTag[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsByCategory, setJobsByCategory] = useState<Record<string, Job[]>>({});
  const [isGapLoading, setIsGapLoading] = useState(false);
  
  // 추천 인벤토리 상태
  const [gapTags, setGapTags] = useState<GapTag[]>([]);
  const [selectedTagForQuestions, setSelectedTagForQuestions] = useState<GapTag | null>(null);
  
  // 어시스턴트 상태
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [starProgress, setStarProgress] = useState<STARProgress>({
    situation: false,
    task: false,
    action: false,
    result: false,
  });
  const [starData, setStarData] = useState<Record<STARPhase, string>>({
    situation: '',
    task: '',
    action: '',
    result: '',
  });
  const [currentPhase, setCurrentPhase] = useState<STARPhase | null>(null);
  const [conversationState, setConversationState] = useState<'category' | 'experience' | 'episode' | 'star'>('category');
  const [pendingNodeLabel, setPendingNodeLabel] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // 기업 목록 로드
  useEffect(() => {
    if (mainTab === 'gap' && gapSubTab === 'analysis' && gapStep === 'company') {
      loadCompanies();
    }
  }, [mainTab, gapSubTab, gapStep]);

  const loadCompanies = async () => {
    setIsGapLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('기업 목록 로드 실패:', error);
    } finally {
      setIsGapLoading(false);
    }
  };

  const handleCompanySelect = async (company: Company) => {
    setSelectedCompany(company);
    setIsGapLoading(true);
    try {
      const jobsData = await getJobsByCompany(company.id);
      setJobs(jobsData);
      const grouped = await getJobsByCategory(company.id);
      setJobsByCategory(grouped);
      setGapStep('job');
    } catch (error) {
      console.error('직무 목록 로드 실패:', error);
    } finally {
      setIsGapLoading(false);
    }
  };

  const handleJobSelect = async (job: Job) => {
    setSelectedJob(job);
    setIsGapLoading(true);
    try {
      const allQuestions = await getQuestionsByJobTitle(selectedCompany!.id, job.job_title);
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
      
      const firstQuestion = questions.find(q => 
        responses[q.id] === false && 
        q.competency_type_id === competencyId &&
        data.questions.some(dq => dq.content === q.content)
      );
      
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
    setGapStep('result');
    
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
    setGapStep('company');
    setSelectedCompany(null);
    setSelectedJob(null);
    setQuestions([]);
    setResponses({});
    setAnalyzedTags([]);
    setJobsByCategory({});
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

  // 노드 선택 시 대화 시작
  useEffect(() => {
    if (mainTab === 'assistant' && selectedNodeId && selectedNodeLabel && selectedNodeType !== undefined) {
      let initialMessage = '';
      let state: 'category' | 'experience' | 'episode' | 'star' = 'category';

      switch (selectedNodeType) {
        case 'category':
          initialMessage = `"${selectedNodeLabel}" 카테고리에 어떤 경험이 있으신가요? 구체적인 경험을 말씀해주세요.`;
          state = 'category';
          break;
        case 'experience':
          initialMessage = `"${selectedNodeLabel}" 경험에서 어떤 에피소드가 있었나요? 기억에 남는 에피소드를 말씀해주세요.`;
          state = 'experience';
          break;
        case 'episode':
          initialMessage = `"${selectedNodeLabel}" 에피소드에 대해 STAR 방식으로 정리해볼까요? 먼저 어떤 상황(Situation)이었는지 말씀해주세요.`;
          state = 'episode';
          setCurrentPhase('situation');
          break;
        default:
          initialMessage = `"${selectedNodeLabel}"에 대해 이야기해볼까요?`;
          state = 'category';
      }

      setMessages([
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: initialMessage,
          timestamp: Date.now(),
        },
      ]);
      setConversationState(state);
      setStarProgress({ situation: false, task: false, action: false, result: false });
      setStarData({ situation: '', task: '', action: '', result: '' });
    }
  }, [mainTab, selectedNodeId, selectedNodeLabel, selectedNodeType]);

  // 다음 질문 생성
  const getNextQuestion = (phase: STARPhase): string => {
    const questions = STAR_QUESTIONS[phase];
    const answeredCount = messages.filter(m => m.phase === phase && m.role === 'user').length;
    return questions[Math.min(answeredCount, questions.length - 1)];
  };

  // AI 응답 생성 (시뮬레이션)
  const generateAIResponse = async (userMessage: string, state: 'category' | 'experience' | 'episode' | 'star', phase: STARPhase | null): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

    const keywords = userMessage.toLowerCase();
    let response = '';

    if (state === 'category') {
      setPendingNodeLabel(userMessage.trim());
      response = `"${userMessage.trim()}" 경험이군요! 이 경험에서 어떤 에피소드가 있었나요?`;
      return response;
    }

    if (state === 'experience') {
      setPendingNodeLabel(userMessage.trim());
      response = `"${userMessage.trim()}" 에피소드네요! 그럼 이제 STAR 방식으로 정리해볼까요? 먼저 어떤 상황(Situation)이었는지 말씀해주세요.`;
      return response;
    }

    if (state === 'episode' || state === 'star') {
      if (!phase) {
        return '어떤 경험에 대해 이야기하고 싶으신가요?';
      }

      if (phase === 'situation') {
        response = '상황을 잘 이해했습니다.';
      } else if (phase === 'task') {
        response = '과제와 당신의 역할을 잘 이해했습니다.';
      } else if (phase === 'action') {
        response = '실행 과정과 행동을 잘 이해했습니다.';
      } else {
        response = '완벽합니다! STAR 초안을 생성할 수 있습니다.';
      }

      return response;
    }

    return '어떤 경험에 대해 이야기하고 싶으신가요?';
  };

  // 어시스턴트 메시지 처리
  const handleSend = async () => {
    if (!input.trim() || !selectedNodeId || isTyping) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      phase: currentPhase || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    // 대화 상태에 따른 처리
    if (conversationState === 'category') {
      const experienceLabel = userInput.trim();
      
      if (onNodeAdd && selectedNodeId) {
        onNodeAdd(selectedNodeId, experienceLabel, 'experience');
      }

      const aiResponse = await generateAIResponse(userInput, conversationState, null);
      
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      setConversationState('experience');
      
    } else if (conversationState === 'experience') {
      const episodeLabel = userInput.trim();
      
      if (onNodeAdd && selectedNodeId) {
        onNodeAdd(selectedNodeId, episodeLabel, 'episode');
      }

      const aiResponse = await generateAIResponse(userInput, conversationState, null);
      
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      setConversationState('star');
      setCurrentPhase('situation');
      
    } else if ((conversationState === 'episode' || conversationState === 'star') && currentPhase) {
      const updatedStarData: Record<STARPhase, string> = {
        ...starData,
        [currentPhase]: (starData[currentPhase] ? starData[currentPhase] + ' ' : '') + userInput,
      };

      setStarData(updatedStarData);

      const aiResponse = await generateAIResponse(userInput, conversationState, currentPhase);
      
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        phase: currentPhase,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);

      const phaseOrder: STARPhase[] = ['situation', 'task', 'action', 'result'];
      const currentIndex = phaseOrder.indexOf(currentPhase);
      
      if (currentIndex < phaseOrder.length - 1) {
        const nextPhase = phaseOrder[currentIndex + 1];
        setCurrentPhase(nextPhase);
        
        setTimeout(() => {
          const nextQuestion: ChatMessage = {
            id: `msg_${Date.now() + 2}`,
            role: 'assistant',
            content: getNextQuestion(nextPhase),
            timestamp: Date.now(),
            phase: nextPhase,
          };
          setMessages(prev => [...prev, nextQuestion]);
        }, 500);
      } else {
        setStarProgress(prev => ({ ...prev, [currentPhase]: true }));
        setCurrentPhase(null);
        
        setTimeout(() => {
          const completeMessage: ChatMessage = {
            id: `msg_${Date.now() + 3}`,
            role: 'assistant',
            content: '🎉 모든 정보를 수집했습니다! STAR 초안을 생성할 수 있습니다.',
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, completeMessage]);
          onSTARComplete(updatedStarData);
        }, 500);
      }

      setStarProgress(prev => ({ ...prev, [currentPhase]: true }));
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
      className="absolute right-0 glass-card shadow-2xl z-[55] flex flex-col border-l border-gray-200 dark:border-[#2a2a2a]"
      style={{ 
        top: 0,
        bottom: 0,
        width: `${sidebarWidth}px`,
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
      {/* 공백진단하기 탭 */}
      {mainTab === 'gap' && (
        <Tabs value={gapSubTab} onValueChange={(value) => setGapSubTab(value as 'analysis' | 'inventory')} className="flex-1 flex flex-col overflow-hidden">
          {/* 서브탭 헤더 */}
          <div className="px-6 pt-4 pb-2 flex-shrink-0 border-b border-gray-100 dark:border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-[#e5e5e5]">공백 진단하기</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 dark:hover:bg-[#2a2a2a]/50 rounded-full transition-colors flex-shrink-0"
                title="닫기"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-[#a0a0a0]" />
              </button>
            </div>
            <TabsList className="w-full bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-[12px] h-auto">
              <TabsTrigger value="analysis" className="flex-1 h-10 rounded-[8px] data-[state=active]:bg-white dark:data-[state=active]:bg-[#2a2a2a] data-[state=active]:shadow-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">
                부족 역량확인
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex-1 h-10 rounded-[8px] data-[state=active]:bg-white dark:data-[state=active]:bg-[#2a2a2a] data-[state=active]:shadow-sm font-semibold text-gray-900 dark:text-[#e5e5e5]">
                추천 인벤토리
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 부족 역량확인 탭 */}
          <TabsContent value="analysis" className="flex-1 m-0 overflow-hidden flex flex-col min-h-0">
            <ScrollArea className="flex-1 px-6 py-4 min-h-0">
              {/* 기업 선택 */}
              {gapStep === 'company' && (
                <div className="grid grid-cols-1 gap-3">
                  {isGapLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-[#a0a0a0]">로딩 중...</p>
                    </div>
                  ) : (
                    companies.map(company => (
                      <button
                        key={company.id}
                        onClick={() => handleCompanySelect(company)}
                        className="p-4 rounded-xl border border-gray-200 dark:border-[#2a2a2a] hover:border-[#5B6EFF] dark:hover:border-[#7B8FFF] hover:shadow-sm transition-all text-left group bg-white dark:bg-[#1a1a1a] card-hover"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white dark:bg-[#2a2a2a] rounded-lg flex items-center justify-center border border-gray-100 dark:border-[#3a3a3a] group-hover:border-blue-100 dark:group-hover:border-[#7B8FFF] transition-colors overflow-hidden flex-shrink-0">
                            {company.logo_url ? (
                              <Image
                                src={company.logo_url}
                                alt={company.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-contain p-1.5"
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-gray-600 dark:text-[#a0a0a0] group-hover:text-blue-600 dark:group-hover:text-[#7B8FFF]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-[#e5e5e5] truncate">{company.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-[#a0a0a0] truncate">{company.industry}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-[#606060] group-hover:text-blue-600 dark:group-hover:text-[#7B8FFF] flex-shrink-0" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* 직무 선택 */}
              {gapStep === 'job' && selectedCompany && (
                <div className="space-y-6">
                  <button
                    onClick={() => setGapStep('company')}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] mb-4"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    뒤로가기
                  </button>
                  {isGapLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-[#a0a0a0]">로딩 중...</p>
                    </div>
                  ) : (
                    Object.entries(jobsByCategory).map(([category, categoryJobs]) => (
                      <div key={category} className="space-y-3">
                        <div className="text-sm font-bold text-gray-900 dark:text-[#e5e5e5] px-1">
                          {category}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {categoryJobs.map(job => (
                            <button
                              key={job.id}
                              onClick={() => handleJobSelect(job)}
                              className="p-4 rounded-xl border border-gray-200 dark:border-[#2a2a2a] hover:border-gray-900 dark:hover:border-[#7B8FFF] hover:shadow-sm transition-all text-left group bg-white dark:bg-[#1a1a1a] card-hover"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-[#e5e5e5] mb-1">{job.job_title}</h3>
                                  <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">{job.department}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-[#606060] group-hover:text-gray-900 dark:group-hover:text-[#e5e5e5] flex-shrink-0" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 문항 체크 */}
              {gapStep === 'questions' && (
                <div className="space-y-6">
                  <button
                    onClick={() => setGapStep('job')}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] mb-4"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    뒤로가기
                  </button>
                  {isGapLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-[#a0a0a0]">문항을 불러오는 중...</p>
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-[#a0a0a0]">해당 직무의 문항이 없습니다.</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-[#5B6EFF]/10 dark:bg-blue-900/30 rounded-xl p-4">
                        <p className="text-sm text-[#4B5EEF] dark:text-[#e5e5e5]">
                          <strong>{selectedCompany?.name} {selectedJob?.job_title}</strong> 직무의 최근 5년간 기출 문항입니다.
                          각 문항에 대해 작성할 소재가 있는지 체크해주세요.
                        </p>
                      </div>
                      
                      {sortedYearHalfKeys.map((yearHalfKey) => {
                        const group = questionsByYearHalf[yearHalfKey];
                        return (
                          <div key={yearHalfKey} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                              <div className="h-px flex-1 bg-gradient-to-r from-[#5B6EFF]/30 to-transparent"></div>
                              <h3 className="text-sm font-bold text-gray-900 dark:text-[#e5e5e5] px-3 py-1 bg-[#5B6EFF]/10 dark:bg-blue-900/30 rounded-full">
                                {yearHalfKey}
                              </h3>
                              <div className="h-px flex-1 bg-gradient-to-l from-[#5B6EFF]/30 to-transparent"></div>
                            </div>
                            
                            <div className="space-y-2">
                              {group.questions.map((q) => (
                                <div
                                  key={q.id}
                                  className="p-4 rounded-xl border border-gray-200 dark:border-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#3a3a3a] transition-colors bg-white dark:bg-[#1a1a1a] card-hover"
                                >
                                  <div className="flex gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-start gap-2 mb-3">
                                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-[#5B6EFF]/10 dark:bg-blue-900/30 text-blue-600 dark:text-[#7B8FFF] rounded-full text-xs font-semibold flex-shrink-0">
                                          {q.question_no}
                                        </span>
                                        <p className="text-sm text-gray-900 dark:text-[#e5e5e5] leading-relaxed">{q.content}</p>
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-[#a0a0a0] ml-8">
                                        최대 {q.max_chars.toLocaleString()}자
                                      </p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                      <button
                                        onClick={() => handleResponseToggle(q.id, true)}
                                        className={`w-20 h-10 rounded-lg font-medium text-sm transition-all ${
                                          responses[q.id] === true
                                            ? 'bg-[#5B6EFF] text-white'
                                            : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-[#e5e5e5] hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
                                        }`}
                                      >
                                        있음
                                      </button>
                                      <button
                                        onClick={() => handleResponseToggle(q.id, false)}
                                        className={`w-20 h-10 rounded-lg font-medium text-sm transition-all ${
                                          responses[q.id] === false
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-[#e5e5e5] hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-2">분석 완료</h3>
                    <p className="text-sm text-gray-600 dark:text-[#a0a0a0]">
                      총 {questions.length}개 문항 중 {Object.values(responses).filter(r => r === false).length}개 문항에서 소재가 부족합니다
                    </p>
                  </div>

                  {analyzedTags.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-[#e5e5e5]">부족한 역량</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {analyzedTags.map(tag => (
                          <div
                            key={tag.id}
                            className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-semibold text-red-900 dark:text-red-300 mb-1">{tag.label}</h5>
                                <p className="text-xs text-red-600 dark:text-red-400">{tag.source}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-[#a0a0a0]">모든 문항에 대한 소재가 충분합니다! 👏</p>
                    </div>
                  )}
                </div>
              )}

              {/* 푸터 버튼 */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-[#2a2a2a] flex-shrink-0 bg-white dark:bg-[#0a0a0a]">
                <div className="flex justify-end gap-3">
                  {gapStep === 'result' && (
                    <Button variant="outline" onClick={handleRestart}>
                      다시 진단
                    </Button>
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
                        setGapSubTab('inventory');
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
            </ScrollArea>
          </TabsContent>

          {/* 추천 인벤토리 탭 */}
          <TabsContent value="inventory" className="flex-1 m-0 overflow-hidden flex flex-col min-h-0">
            {gapTags.length === 0 ? (
              <div className="flex-1 flex items-center justify-center px-6 py-12 min-h-0">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#5B6EFF]/10 to-[#5B6EFF]/20 rounded-[20px] flex items-center justify-center mx-auto mb-5">
                    <Sparkles className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="font-bold text-lg text-gray-900 dark:text-[#e5e5e5] mb-2">추천 인벤토리가 비어있습니다</p>
                  <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-6">공백 진단을 통해 추천을 받아보세요</p>
                  <Button
                    onClick={() => setGapSubTab('analysis')}
                    className="bg-gradient-to-br from-[#5B6EFF]/100 to-[#6B7EFF] hover:from-[#4B5EEF] hover:to-[#5B6EFF] h-12 px-6 rounded-[12px] font-semibold shadow-sm"
                  >
                    공백 진단하기
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mx-6 mt-4 p-5 rounded-[16px] bg-gradient-to-br from-[#5B6EFF]/10 to-[#5B6EFF]/20/30 dark:from-[#5B6EFF]/30 dark:to-[#5B6EFF]/20 border border-[#5B6EFF]/20 dark:border-[#5B6EFF]/30 flex-shrink-0">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-[#2a2a2a] rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Sparkles className="h-5 w-5 text-blue-600 dark:text-[#7B8FFF]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-[#e5e5e5] mb-1.5">
                        태그를 드래그하여 추가하세요
                      </p>
                      <p className="text-xs text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                        태그를 마인드맵의 노드로 드래그하면<br />관련 경험을 추가할 수 있습니다
                      </p>
                    </div>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 px-6 py-5 min-h-0">
                  <div className="space-y-4">
                    {gapTags.map((tag) => (
                      <GapTagCard
                        key={tag.id}
                        tag={tag}
                        onRemove={(id) => {
                          gapTagStorage.remove(id);
                          setGapTags(prev => prev.filter(t => t.id !== id));
                        }}
                        onShowQuestions={(tag) => setSelectedTagForQuestions(tag)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* STAR 정리하기 탭 */}
      {mainTab === 'star' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-6 pt-4 pb-2 flex-shrink-0 border-b border-gray-100 dark:border-[#2a2a2a]">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-[#e5e5e5]">STAR 정리하기</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 dark:hover:bg-[#2a2a2a]/50 rounded-full transition-colors flex-shrink-0"
              title="닫기"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-[#a0a0a0]" />
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
                    <p className="font-bold text-lg text-gray-900 dark:text-[#e5e5e5] mb-2">에피소드가 없습니다</p>
                    <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">마인드맵에 에피소드 노드를 추가해주세요</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {episodeNodes.map((node) => (
                    <Card
                      key={node.id}
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] card-hover"
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
                          <h3 className="font-semibold text-gray-900 dark:text-[#e5e5e5] mb-1 truncate">{node.label}</h3>
                          <p className="text-xs text-gray-500 dark:text-[#a0a0a0] truncate">{getNodePath(node)}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-[#606060] flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          ) : (
            // STAR 에디터
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-6 pt-4 pb-2 flex-shrink-0 border-b border-gray-100 dark:border-[#2a2a2a]">
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
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-[#e5e5e5] mb-3"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  목록으로 돌아가기
                </button>
              </div>
              
              <ScrollArea className="flex-1 px-6 py-4 min-h-0">
                <div className="space-y-6">
                  {/* 제목 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e5] mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e5] mb-2">
                        <Badge variant="outline" className="mr-2">S</Badge>
                        상황 (Situation)
                      </label>
                      <Textarea
                        value={starEditorSituation}
                        onChange={(e) => setStarEditorSituation(e.target.value)}
                        placeholder="어떤 상황이었나요?"
                        className="min-h-[100px] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] text-gray-900 dark:text-[#e5e5e5]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e5] mb-2">
                        <Badge variant="outline" className="mr-2">T</Badge>
                        과제 (Task)
                      </label>
                      <Textarea
                        value={starEditorTask}
                        onChange={(e) => setStarEditorTask(e.target.value)}
                        placeholder="어떤 과제나 목표가 있었나요?"
                        className="min-h-[100px] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] text-gray-900 dark:text-[#e5e5e5]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e5] mb-2">
                        <Badge variant="outline" className="mr-2">A</Badge>
                        행동 (Action)
                      </label>
                      <Textarea
                        value={starEditorAction}
                        onChange={(e) => setStarEditorAction(e.target.value)}
                        placeholder="구체적으로 어떤 행동을 취했나요?"
                        className="min-h-[100px] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] text-gray-900 dark:text-[#e5e5e5]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e5] mb-2">
                        <Badge variant="outline" className="mr-2">R</Badge>
                        결과 (Result)
                      </label>
                      <Textarea
                        value={starEditorResult}
                        onChange={(e) => setStarEditorResult(e.target.value)}
                        placeholder="결과는 어땠나요?"
                        className="min-h-[100px] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2a2a2a] text-gray-900 dark:text-[#e5e5e5]"
                      />
                    </div>
                  </div>

                  {/* 역량 키워드 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e5] mb-3">
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
                              : 'hover:bg-gray-100 dark:hover:bg-[#2a2a2a] border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-[#e5e5e5]'
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
                    <p className="text-xs text-gray-500 dark:text-[#a0a0a0] mt-2">
                      이 경험에서 발휘한 강점이나 역량을 선택해주세요 (복수 선택 가능)
                    </p>
                  </div>
                </div>
              </ScrollArea>

              {/* 액션 버튼 */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-[#2a2a2a] flex-shrink-0 bg-white dark:bg-[#0a0a0a]">
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

      {/* 어시스턴트 탭 */}
      {mainTab === 'assistant' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-6 pt-4 pb-2 flex-shrink-0 border-b border-gray-100 dark:border-[#2a2a2a]">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-[#e5e5e5]">어시스턴트</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 dark:hover:bg-[#2a2a2a]/50 rounded-full transition-colors flex-shrink-0"
              title="닫기"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-[#a0a0a0]" />
            </button>
          </div>

          {!selectedNodeId && (
            <div className="mx-6 mt-4 p-5 rounded-[16px] bg-gradient-to-br from-[#5B6EFF]/10 to-[#5B6EFF]/20/30 dark:from-[#5B6EFF]/30 dark:to-[#5B6EFF]/20 border border-[#5B6EFF]/20 dark:border-[#5B6EFF]/30 flex-shrink-0">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white dark:bg-[#2a2a2a] rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-[#7B8FFF]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-[#e5e5e5] mb-1.5">노드를 선택해보세요</p>
                  <p className="text-xs text-gray-600 dark:text-[#a0a0a0] leading-relaxed">
                    마인드맵에서 경험 노드를 선택하면<br />AI가 STAR 기법으로 경험을 구조화합니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 min-h-0 px-6 py-6" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-[20px] px-5 py-3.5 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-[#5B6EFF]/100 to-[#6B7EFF] text-white shadow-sm'
                        : 'bg-gray-50 dark:bg-[#1a1a1a] text-gray-900 dark:text-[#e5e5e5]'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-[#1a1a1a] rounded-[20px] px-5 py-4">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-[#606060] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 dark:bg-[#606060] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 dark:bg-[#606060] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="px-6 py-5 border-t border-gray-100 dark:border-[#2a2a2a] flex-shrink-0 bg-white dark:bg-[#0a0a0a]">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="메시지를 입력하세요..."
                disabled={!selectedNodeId || isTyping}
                className="flex-1 h-12 rounded-[12px] border-gray-200 dark:border-[#2a2a2a] focus:border-[#5B6EFF] dark:focus:border-[#7B8FFF] focus:ring-2 focus:ring-[#5B6EFF]/20 dark:focus:ring-[#5B6EFF]/30 bg-gray-50 dark:bg-[#1a1a1a] focus:bg-white dark:focus:bg-[#2a2a2a] transition-colors text-gray-900 dark:text-[#e5e5e5]"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || !selectedNodeId || isTyping}
                className="h-12 w-12 p-0 bg-gradient-to-br from-[#5B6EFF]/100 to-[#6B7EFF] hover:from-[#4B5EEF] hover:to-[#5B6EFF] rounded-[12px] shadow-sm disabled:opacity-50"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 질문 리스트 모달 */}
      {selectedTagForQuestions && selectedTagForQuestions.questions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]" onClick={() => setSelectedTagForQuestions(null)}>
          <div className="glass-card rounded-[24px] p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e5e5e5] mb-2">{selectedTagForQuestions.label}</h3>
                <p className="text-sm text-gray-500 dark:text-[#a0a0a0]">{selectedTagForQuestions.source}</p>
              </div>
              <button
                onClick={() => setSelectedTagForQuestions(null)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 dark:hover:bg-[#2a2a2a]/50 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-[#a0a0a0]" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600 dark:text-[#7B8FFF]" />
                <h4 className="font-semibold text-gray-900 dark:text-[#e5e5e5]">답변하기 어려웠던 질문 ({selectedTagForQuestions.questions.length}개)</h4>
              </div>
              {selectedTagForQuestions.questions.map((question, index) => (
                <div key={index} className="p-4 rounded-[12px] bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a]">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#5B6EFF]/20 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600 dark:text-[#7B8FFF]">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-[#e5e5e5] leading-relaxed mb-1">
                        {typeof question === 'string' ? question : question.content}
                      </p>
                      {typeof question === 'object' && question.year && question.half && (
                        <p className="text-xs text-gray-500 dark:text-[#a0a0a0] font-medium">
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
