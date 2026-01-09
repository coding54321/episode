'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, STARPhase, STARProgress, GapTag, MindMapNode, NodeType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gapTagStorage } from '@/lib/storage';
import { useDrag } from 'react-dnd';

interface AIChatbotProps {
  selectedNodeId: string | null;
  selectedNodeLabel: string | null;
  selectedNodeType?: NodeType; // 선택된 노드의 타입
  selectedNodeLevel?: number; // 선택된 노드의 레벨
  onSTARComplete: (content: { situation: string; task: string; action: string; result: string }) => void;
  onNodeAdd?: (parentId: string, label: string, nodeType: NodeType) => void; // 노드 추가 콜백
  onClose: () => void;
  onOpenGapDiagnosis?: () => void;
  defaultTab?: 'chat' | 'inventory'; // 기본 탭 설정
}

const STAR_QUESTIONS: Record<STARPhase, string[]> = {
  situation: [
    '어떤 상황이었나요?',
    '당시 배경은 어떠했나요?',
    '문제가 발생한 맥락을 설명해주세요',
  ],
  task: [
    '어떤 과제나 목표가 있었나요?',
    '당신의 역할은 무엇이었나요?',
    '해결해야 할 문제는 무엇이었나요?',
  ],
  action: [
    '구체적으로 어떤 행동을 취했나요?',
    '어떤 방법을 사용했나요?',
    '어떤 단계로 진행했나요?',
  ],
  result: [
    '결과는 어땠나요?',
    '어떤 성과가 있었나요?',
    '얻은 교훈이나 배운 점이 있나요?',
  ],
};

// 드래그 가능한 태그 카드 컴포넌트 (토스 스타일)
function GapTagCard({ tag, onRemove }: { tag: GapTag; onRemove: (id: string) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'GAP_TAG',
    item: tag,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [tag]);

  return (
    <div 
      ref={drag as any}
      className={`group relative p-5 rounded-[16px] bg-white border-2 border-gray-100 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-move ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Badge className="mb-3 bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 font-semibold px-3 py-1">
            {tag.category}
          </Badge>
          <h4 className="font-bold text-base text-gray-900 mb-2 leading-tight">{tag.label}</h4>
          <p className="text-sm text-gray-500">{tag.source}</p>
        </div>
        <button
          onClick={() => onRemove(tag.id)}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-full transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
        >
          <X className="h-4 w-4 text-gray-400 hover:text-red-600" />
        </button>
      </div>
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-gray-400 font-medium">드래그하여 추가</span>
      </div>
    </div>
  );
}

export default function AIChatbot({ 
  selectedNodeId, 
  selectedNodeLabel, 
  selectedNodeType,
  selectedNodeLevel,
  onSTARComplete, 
  onNodeAdd,
  onClose, 
  onOpenGapDiagnosis, 
  defaultTab = 'chat' 
}: AIChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
  const [gapTags, setGapTags] = useState<GapTag[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'inventory'>(defaultTab);
  const [conversationState, setConversationState] = useState<'category' | 'experience' | 'episode' | 'star'>('category');
  const [pendingNodeLabel, setPendingNodeLabel] = useState<string>(''); // 생성할 노드 라벨
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 공백 태그 로드
  useEffect(() => {
    const tags = gapTagStorage.load();
    setGapTags(tags);

    // 공백 진단에서 태그가 추가될 때 업데이트
    const handleGapTagsUpdate = () => {
      const updatedTags = gapTagStorage.load();
      setGapTags(updatedTags);
      // 태그가 추가되면 인벤토리 탭으로 전환
      if (updatedTags.length > tags.length) {
        setActiveTab('inventory');
      }
    };

    window.addEventListener('gap-tags-updated', handleGapTagsUpdate);
    return () => window.removeEventListener('gap-tags-updated', handleGapTagsUpdate);
  }, []);

  // defaultTab이 변경되면 activeTab 업데이트
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 노드 선택 시 대화 시작
  useEffect(() => {
    if (selectedNodeId && selectedNodeLabel && selectedNodeType !== undefined) {
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
  }, [selectedNodeId, selectedNodeLabel, selectedNodeType]);

  // 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 다음 질문 생성
  const getNextQuestion = (phase: STARPhase): string => {
    const questions = STAR_QUESTIONS[phase];
    const answeredCount = messages.filter(m => m.phase === phase && m.role === 'user').length;
    return questions[Math.min(answeredCount, questions.length - 1)];
  };

  // AI 응답 생성 (시뮬레이션)
  const generateAIResponse = async (userMessage: string, state: 'category' | 'experience' | 'episode' | 'star', phase: STARPhase | null): Promise<string> => {
    // 실제로는 AI API를 호출하지만, 여기서는 키워드 기반 응답 생성
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

    const keywords = userMessage.toLowerCase();
    let response = '';

    // 대분류 -> 경험 단계
    if (state === 'category') {
      setPendingNodeLabel(userMessage.trim());
      response = `"${userMessage.trim()}" 경험이군요! 이 경험에서 어떤 에피소드가 있었나요?`;
      return response;
    }

    // 경험 -> 에피소드 단계
    if (state === 'experience') {
      setPendingNodeLabel(userMessage.trim());
      response = `"${userMessage.trim()}" 에피소드네요! 그럼 이제 STAR 방식으로 정리해볼까요? 먼저 어떤 상황(Situation)이었는지 말씀해주세요.`;
      return response;
    }

    // 에피소드 -> STAR 단계
    if (state === 'episode' || state === 'star') {
      if (!phase) {
        return '어떤 경험에 대해 이야기하고 싶으신가요?';
      }

      if (phase === 'situation') {
        if (keywords.includes('프로젝트') || keywords.includes('팀')) {
          response = '프로젝트 상황이군요. 어떤 과제나 목표가 있었나요?';
        } else {
          response = '이해했습니다. 어떤 과제나 목표가 있었나요?';
        }
      } else if (phase === 'task') {
        if (keywords.includes('개발') || keywords.includes('기능')) {
          response = '개발 과제였군요. 구체적으로 어떤 행동을 취하셨나요?';
        } else {
          response = '알겠습니다. 구체적으로 어떤 행동을 취하셨나요?';
        }
      } else if (phase === 'action') {
        if (keywords.includes('협업') || keywords.includes('소통')) {
          response = '협업을 통해 진행하셨군요. 결과는 어땠나요?';
        } else {
          response = '좋습니다. 결과는 어땠나요?';
        }
      } else {
        response = '완벽합니다! STAR 초안을 생성할 수 있습니다.';
      }

      return response;
    }

    return '어떤 경험에 대해 이야기하고 싶으신가요?';
  };

  // 메시지 전송
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
      phase: currentPhase || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    // 대화 상태에 따른 처리
    if (conversationState === 'category') {
      // 대분류 -> 경험 노드 생성
      const experienceLabel = userInput.trim();
      
      // 노드 생성 콜백 호출
      if (onNodeAdd && selectedNodeId) {
        onNodeAdd(selectedNodeId, experienceLabel, 'experience');
      }

      // AI 응답 생성
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
      // 경험 -> 에피소드 노드 생성
      const episodeLabel = userInput.trim();
      
      // 노드 생성 콜백 호출 (마지막으로 생성된 경험 노드의 ID를 부모로 사용)
      if (onNodeAdd && selectedNodeId) {
        onNodeAdd(selectedNodeId, episodeLabel, 'episode');
      }

      // AI 응답 생성
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
      // 에피소드 -> STAR 단계
      // STAR 데이터 저장
      setStarData(prev => ({
        ...prev,
        [currentPhase]: prev[currentPhase] + (prev[currentPhase] ? ' ' : '') + userInput,
      }));

      // AI 응답 생성
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

      // 다음 단계로 진행
      const phaseOrder: STARPhase[] = ['situation', 'task', 'action', 'result'];
      const currentIndex = phaseOrder.indexOf(currentPhase);
      
      if (currentIndex < phaseOrder.length - 1) {
        const nextPhase = phaseOrder[currentIndex + 1];
        setCurrentPhase(nextPhase);
        
        // 다음 질문 추가
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
        // 모든 단계 완료
        setStarProgress(prev => ({ ...prev, [currentPhase]: true }));
        setCurrentPhase(null);
        
        // STAR 완성 알림
        setTimeout(() => {
          const completeMessage: ChatMessage = {
            id: `msg_${Date.now() + 3}`,
            role: 'assistant',
            content: '🎉 모든 정보를 수집했습니다! STAR 초안을 생성할 수 있습니다.',
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, completeMessage]);
          onSTARComplete(starData);
        }, 500);
      }

      // 진행 상황 업데이트
      setStarProgress(prev => ({ ...prev, [currentPhase]: true }));
    }
  };

  const progressPercentage = Object.values(starProgress).filter(Boolean).length * 25;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute right-0 w-96 bg-white shadow-2xl z-[55] flex flex-col border-l border-gray-200"
      style={{ 
        top: 0,
        bottom: 0,
      }}
    >
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'inventory')} className="flex-1 flex flex-col overflow-hidden">
            {/* 탭과 닫기 버튼 */}
            <div className="flex items-center gap-3 px-6 pt-4 pb-2 flex-shrink-0">
              <TabsList className="flex-1 bg-gray-100 p-1 rounded-[12px] h-auto">
                <TabsTrigger value="chat" className="flex-1 h-10 rounded-[8px] data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">대화</TabsTrigger>
                <TabsTrigger value="inventory" className="flex-1 h-10 rounded-[8px] data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">추천 인벤토리</TabsTrigger>
              </TabsList>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                title="닫기 (ESC)"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">

              {/* 노드 선택 가이드 (토스 스타일) */}
              {!selectedNodeId && (
                <div className="mx-6 mt-4 p-5 rounded-[16px] bg-gradient-to-br from-blue-50 to-blue-100/30 border border-blue-100 flex-shrink-0">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 mb-1.5">노드를 선택해보세요</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        마인드맵에서 경험 노드를 선택하면<br />AI가 STAR 기법으로 경험을 구조화합니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 메시지 영역 (토스 스타일) */}
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
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-900'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-[20px] px-5 py-4">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* 입력 영역 (토스 스타일) */}
              <div className="px-6 py-5 border-t border-gray-100 flex-shrink-0 bg-white">
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
                    className="flex-1 h-12 rounded-[12px] border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-colors"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || !selectedNodeId || isTyping}
                    className="h-12 w-12 p-0 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-[12px] shadow-sm disabled:opacity-50"
                    size="icon"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="flex-1 m-0 overflow-hidden flex flex-col">
                {gapTags.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center px-6 py-12">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-[20px] flex items-center justify-center mx-auto mb-5">
                      <Sparkles className="w-10 h-10 text-blue-600" />
                    </div>
                    <p className="font-bold text-lg text-gray-900 mb-2">추천 인벤토리가 비어있습니다</p>
                    <p className="text-sm text-gray-500 mb-6">공백 진단을 통해 추천을 받아보세요</p>
                    {onOpenGapDiagnosis && (
                      <Button
                        onClick={onOpenGapDiagnosis}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 h-12 px-6 rounded-[12px] font-semibold shadow-sm"
                      >
                        공백 진단하기
                      </Button>
                    )}
                  </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    {/* 가이드 메시지 (토스 스타일) */}
                    <div className="mx-6 mt-4 p-5 rounded-[16px] bg-gradient-to-br from-blue-50 to-blue-100/30 border border-blue-100 flex-shrink-0">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Sparkles className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 mb-1.5">
                            태그를 드래그하여 추가하세요
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            태그를 마인드맵의 노드로 드래그하면<br />관련 경험을 추가할 수 있습니다
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 태그 카드 목록 */}
                    <div className="flex-1 px-6 py-5 overflow-y-auto">
                      <div className="space-y-4">
                        {gapTags.map((tag) => (
                          <GapTagCard
                            key={tag.id}
                            tag={tag}
                            onRemove={(id) => {
                              gapTagStorage.remove(id);
                              setGapTags(prev => prev.filter(t => t.id !== id));
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </TabsContent>
            </Tabs>
    </motion.div>
  );
}

