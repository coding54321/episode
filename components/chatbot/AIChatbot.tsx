'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, STARPhase, STARProgress } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gapTagStorage, GapTag } from '@/lib/storage';
import { useDrag } from 'react-dnd';

interface AIChatbotProps {
  selectedNodeId: string | null;
  selectedNodeLabel: string | null;
  onSTARComplete: (content: { situation: string; task: string; action: string; result: string }) => void;
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

// 드래그 가능한 태그 카드 컴포넌트
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
      ref={drag}
      className={`p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-md">
              {tag.category}
            </span>
          </div>
          <p className="font-semibold text-sm text-gray-900 mb-1">{tag.label}</p>
          <p className="text-xs text-gray-500">{tag.source}</p>
        </div>
        <button
          onClick={() => onRemove(tag.id)}
          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4 text-gray-400 hover:text-red-600" />
        </button>
      </div>
    </div>
  );
}

export default function AIChatbot({ selectedNodeId, selectedNodeLabel, onSTARComplete, onClose, onOpenGapDiagnosis, defaultTab = 'chat' }: AIChatbotProps) {
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
    if (selectedNodeId && selectedNodeLabel) {
      setMessages([
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `"${selectedNodeLabel}"에 대해 STAR 방식으로 자기소개서를 작성해볼까요? 먼저 상황(Situation)에 대해 알려주세요.`,
          timestamp: Date.now(),
          phase: 'situation',
        },
      ]);
      setCurrentPhase('situation');
      setStarProgress({ situation: false, task: false, action: false, result: false });
      setStarData({ situation: '', task: '', action: '', result: '' });
    }
  }, [selectedNodeId, selectedNodeLabel]);

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
  const generateAIResponse = async (userMessage: string, phase: STARPhase | null): Promise<string> => {
    // 실제로는 AI API를 호출하지만, 여기서는 키워드 기반 응답 생성
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

    if (!phase) {
      return '어떤 경험에 대해 이야기하고 싶으신가요?';
    }

    const keywords = userMessage.toLowerCase();
    let response = '';

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
  };

  // 메시지 전송
  const handleSend = async () => {
    if (!input.trim() || !currentPhase) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
      phase: currentPhase,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // STAR 데이터 저장
    setStarData(prev => ({
      ...prev,
      [currentPhase]: prev[currentPhase] + (prev[currentPhase] ? ' ' : '') + input,
    }));

    // AI 응답 생성
    const aiResponse = await generateAIResponse(input, currentPhase);
    
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
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">AI 어시스턴트</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                title="닫기 (ESC)"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'inventory')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-5 mt-1 flex-shrink-0">
              <TabsTrigger value="chat">대화</TabsTrigger>
              <TabsTrigger value="inventory">추천 인벤토리</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
              {/* STAR 진행 바 */}
              {currentPhase && (
                <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900">STAR 진행 상황</span>
                    <span className="text-xs font-medium text-gray-500">{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      className="bg-blue-600 h-2 rounded-full transition-all"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    {(['situation', 'task', 'action', 'result'] as STARPhase[]).map(phase => (
                      <div
                        key={phase}
                        className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                          starProgress[phase] 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {phase === 'situation' ? 'S' : phase === 'task' ? 'T' : phase === 'action' ? 'A' : 'R'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 노드 선택 가이드 */}
              {!selectedNodeId && (
                <div className="px-5 py-4 border-b border-blue-50 bg-blue-50/50 flex-shrink-0">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-1">노드를 선택해보세요</p>
                      <p className="text-xs text-blue-700">
                        마인드맵에서 경험 노드를 선택하면 AI가 STAR 기법으로 경험을 구조화하도록 도와드립니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 메시지 영역 */}
              <ScrollArea className="flex-1 min-h-0 px-5 py-4" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map(message => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-50 text-gray-900 border border-gray-100'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
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

              {/* 입력 영역 */}
              <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-2">
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
                    disabled={!currentPhase || isTyping}
                    className="flex-1 h-11 rounded-xl border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || !currentPhase || isTyping}
                    className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700 rounded-xl"
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="flex-1 m-0 overflow-hidden flex flex-col">
                {gapTags.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center px-5 py-12">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="font-semibold text-gray-900 mb-2">추천 인벤토리가 비어있습니다</p>
                    <p className="text-sm text-gray-500 mb-4">공백 진단을 통해 추천을 받아보세요</p>
                    {onOpenGapDiagnosis && (
                      <Button
                        onClick={onOpenGapDiagnosis}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        공백 진단하기
                      </Button>
                    )}
                  </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    {/* 가이드 메시지 */}
                    <div className="px-5 py-4 border-b border-blue-50 bg-blue-50/50 flex-shrink-0">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900 mb-1">
                            태그를 드래그하여 노드에 추가해보세요
                          </p>
                          <p className="text-xs text-blue-700">
                            태그를 마인드맵의 노드로 드래그하면 관련 경험을 추가할 수 있습니다
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 태그 카드 목록 */}
                    <div className="flex-1 px-5 py-4 overflow-y-auto">
                      <div className="space-y-3">
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

