import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, FileText, ChevronRight, Sparkles, GripVertical } from 'lucide-react';
import { ChatMessage, MindMapNode, GapTag } from '../types';

interface AIChatbotProps {
  selectedNode: MindMapNode | null;
  onNodeUpdate: (nodeId: string, content: string) => void;
  onSTARReady: (nodeId: string, messages: ChatMessage[]) => void;
  gapTags: GapTag[];
  onTagRemove: (tagId: string) => void;
  onDragStart: (tag: GapTag) => void;
  onOpenDiagnosis?: () => void;
}

const STAR_QUESTIONS = {
  situation: [
    '어떤 상황이었나요?',
    '당시 배경은 어떠했나요?',
    '문제가 발생한 맥락을 설명해주세요',
    '어떤 환경에서 일어난 일인가요?',
  ],
  task: [
    '어떤 과제나 목표가 있었나요?',
    '당신의 역할은 무엇이었나요?',
    '해결해야 할 문제는 무엇이었나요?',
    '무엇을 달성해야 했나요?',
  ],
  action: [
    '구체적으로 어떤 행동을 취했나요?',
    '어떤 방법을 사용했나요?',
    '왜 그런 접근을 선택했나요?',
    '어떤 단계로 진행했나요?',
  ],
  result: [
    '결과는 어땠나요?',
    '어떤 성과가 있었나요?',
    '이 경험에서 무엇을 배웠나요?',
    '개선된 점이나 달성한 것이 있나요?',
  ],
};

// 더 자연스러운 AI 응답 생성
const generateAIResponse = (
  userMessage: string,
  currentProgress: { s: boolean; t: boolean; a: boolean; r: boolean },
  nodeLabel: string
): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  // 상황 (S) 관련
  if (!currentProgress.s) {
    if (lowerMessage.includes('상황') || lowerMessage.includes('배경') || 
        lowerMessage.includes('때') || lowerMessage.includes('당시') ||
        lowerMessage.includes('환경') || lowerMessage.includes('상황')) {
      return '좋아요! 상황을 잘 설명해주셨네요. 이제 어떤 과제나 목표가 있었는지 알려주세요.';
    }
    return STAR_QUESTIONS.situation[Math.floor(Math.random() * STAR_QUESTIONS.situation.length)];
  }
  
  // 과제 (T) 관련
  if (!currentProgress.t) {
    if (lowerMessage.includes('역할') || lowerMessage.includes('목표') || 
        lowerMessage.includes('과제') || lowerMessage.includes('해야') ||
        lowerMessage.includes('해야 할') || lowerMessage.includes('해야했')) {
      return '네, 역할과 목표가 명확하네요! 그럼 구체적으로 어떤 행동을 취하셨는지 말씀해주세요.';
    }
    return STAR_QUESTIONS.task[Math.floor(Math.random() * STAR_QUESTIONS.task.length)];
  }
  
  // 행동 (A) 관련
  if (!currentProgress.a) {
    if (lowerMessage.includes('행동') || lowerMessage.includes('방법') || 
        lowerMessage.includes('했습니다') || lowerMessage.includes('했어요') ||
        lowerMessage.includes('했던') || lowerMessage.includes('했고') ||
        lowerMessage.includes('진행') || lowerMessage.includes('실행')) {
      return '훌륭해요! 구체적인 행동을 잘 설명해주셨습니다. 마지막으로 결과나 성과에 대해 알려주세요.';
    }
    return STAR_QUESTIONS.action[Math.floor(Math.random() * STAR_QUESTIONS.action.length)];
  }
  
  // 결과 (R) 관련
  if (!currentProgress.r) {
    if (lowerMessage.includes('결과') || lowerMessage.includes('성과') || 
        lowerMessage.includes('배웠') || lowerMessage.includes('개선') ||
        lowerMessage.includes('달성') || lowerMessage.includes('성공') ||
        lowerMessage.includes('효과') || lowerMessage.includes('영향')) {
      return '완벽해요! STAR 방식으로 경험이 잘 정리되었네요. 이제 초안을 생성할 수 있어요!';
    }
    return STAR_QUESTIONS.result[Math.floor(Math.random() * STAR_QUESTIONS.result.length)];
  }
  
  return '정말 좋은 경험이네요! STAR 방식으로 충분히 구조화되었습니다. 이제 초안을 생성할 수 있어요.';
};

export default function AIChatbot({ selectedNode, onNodeUpdate, onSTARReady, gapTags, onTagRemove, onDragStart, onOpenDiagnosis }: AIChatbotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'inventory'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [starProgress, setStarProgress] = useState({ s: false, t: false, a: false, r: false });
  const [isTyping, setIsTyping] = useState(false);
  const [topOffset, setTopOffset] = useState(73); // Start with header height
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedNode) {
      setIsExpanded(true);
      setActiveTab('chat');
      const welcomeMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `"${selectedNode.label}"에 대해 이야기해볼까요? 먼저 어떤 상황이었는지 설명해주세요.`,
        timestamp: Date.now(),
      };
      setMessages([welcomeMessage]);
      setStarProgress({ s: false, t: false, a: false, r: false });
    }
  }, [selectedNode]);

  useEffect(() => {
    if (gapTags.length > 0 && !selectedNode) {
      setActiveTab('inventory');
    }
  }, [gapTags, selectedNode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // Check if tab bar exists and adjust offset
    const updateOffset = () => {
      const tabBar = document.querySelector('.bg-gray-100.border-b.border-gray-300');
      const headerHeight = 73; // Fixed header height

      if (tabBar) {
        const tabBarHeight = tabBar.getBoundingClientRect().height;
        setTopOffset(headerHeight + tabBarHeight);
      } else {
        setTopOffset(headerHeight);
      }
    };

    // Initial check
    updateOffset();

    // Watch for DOM changes that might affect tab bar
    const observer = new MutationObserver(updateOffset);
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup
    return () => observer.disconnect();
  }, []);

  const updateProgress = (message: string): typeof starProgress => {
    const newProgress = { ...starProgress };
    const lowerMessage = message.toLowerCase();
    
    // 더 정확한 키워드 감지
    if (!newProgress.s && (
      lowerMessage.includes('상황') || lowerMessage.includes('배경') || 
      lowerMessage.includes('때') || lowerMessage.includes('당시') ||
      lowerMessage.includes('환경') || lowerMessage.length > 20 // 긴 메시지는 상황 설명일 가능성
    )) {
      newProgress.s = true;
    }
    if (!newProgress.t && (
      lowerMessage.includes('역할') || lowerMessage.includes('목표') || 
      lowerMessage.includes('과제') || lowerMessage.includes('해야') ||
      lowerMessage.includes('해야 할') || lowerMessage.includes('해야했')
    )) {
      newProgress.t = true;
    }
    if (!newProgress.a && (
      lowerMessage.includes('행동') || lowerMessage.includes('방법') || 
      lowerMessage.includes('했습니다') || lowerMessage.includes('했어요') ||
      lowerMessage.includes('했던') || lowerMessage.includes('했고') ||
      lowerMessage.includes('진행') || lowerMessage.includes('실행') ||
      lowerMessage.includes('만들었') || lowerMessage.includes('개발했')
    )) {
      newProgress.a = true;
    }
    if (!newProgress.r && (
      lowerMessage.includes('결과') || lowerMessage.includes('성과') || 
      lowerMessage.includes('배웠') || lowerMessage.includes('개선') ||
      lowerMessage.includes('달성') || lowerMessage.includes('성공') ||
      lowerMessage.includes('효과') || lowerMessage.includes('영향')
    )) {
      newProgress.r = true;
    }
    
    return newProgress;
  };

  const handleSend = () => {
    if (!inputValue.trim() || !selectedNode || isTyping) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');

    // Update progress
    const newProgress = updateProgress(inputValue);
    setStarProgress(newProgress);

    // Generate AI response with typing indicator
    setIsTyping(true);
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue, newProgress, selectedNode.label);
      
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      setIsTyping(false);

      // Check if STAR is complete
      if (newProgress.s && newProgress.t && newProgress.a && newProgress.r) {
        setTimeout(() => {
          onSTARReady(selectedNode.id, updatedMessages);
        }, 500);
      }
    }, 1000 + Math.random() * 500); // 1-1.5초 랜덤 딜레이로 더 자연스럽게
  };

  // Toggle button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-6 rounded-l-xl shadow-xl hover:bg-blue-700 transition-all z-30 flex items-center gap-2"
      >
        <Bot className="w-5 h-5" />
        <span className="text-xs writing-mode-vertical">어시스턴트</span>
      </button>
    );
  }

  const isSTARComplete = starProgress.s && starProgress.t && starProgress.a && starProgress.r;
  
  return (
    <div 
      className="fixed right-0 bg-white shadow-2xl border-l border-gray-200 w-96 flex flex-col z-30 animate-slide-in-right" 
      style={{ 
        top: `${topOffset}px`,
        height: `calc(100vh - ${topOffset}px)`
      }}
    >
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-4 text-sm transition-colors relative ${
            activeTab === 'chat'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="font-medium">AI 어시스턴트</span>
          </div>
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 px-4 py-4 text-sm transition-colors relative ${
            activeTab === 'inventory'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">추천 인벤토리</span>
            {gapTags.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {gapTags.length}
              </span>
            )}
          </div>
          {activeTab === 'inventory' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      {activeTab === 'chat' ? (
        selectedNode ? (
          <>
            {/* STAR Progress */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-2">
                {[
                  { key: 's', label: 'S' },
                  { key: 't', label: 'T' },
                  { key: 'a', label: 'A' },
                  { key: 'r', label: 'R' },
                ].map(item => (
                  <div
                    key={item.key}
                    className={`
                      flex-1 text-center py-1 rounded text-xs transition-all
                      ${starProgress[item.key as keyof typeof starProgress]
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`
                      max-w-[80%] px-3 py-2 rounded-xl text-sm
                      ${message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                      }
                    `}
                  >
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 text-gray-900 px-3 py-2 rounded-xl text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* STAR Ready Banner */}
            {isSTARComplete && (
              <div className="px-4 py-2 bg-green-50 border-t border-green-200 text-center">
                <p className="text-xs text-green-700 flex items-center justify-center gap-1">
                  <FileText className="w-3 h-3" />
                  STAR 초안을 생성할 수 있어요!
                </p>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()}
                  placeholder="경험을 자유롭게 설명해주세요..."
                  disabled={isTyping}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${inputValue.trim() && !isTyping
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          // No node selected state
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base text-gray-900 mb-2">경험 노드를 선택해주세요</h3>
              <p className="text-sm text-gray-500">
                마인드맵에서 노드를 선택하면<br />
                AI가 STAR 방식으로 경험 정리를 도와드려요
              </p>
            </div>
          </div>
        )
      ) : (
        // Gap Inventory Tab
        <div className="flex-1 flex flex-col overflow-y-auto">
          {gapTags.length > 0 ? (
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                채워야 할 역량을 경험 노드로 드래그하세요
              </p>

              {gapTags.map(tag => (
                <div
                  key={tag.id}
                  draggable
                  onDragStart={() => onDragStart(tag)}
                  className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 cursor-move hover:shadow-md transition-all border-2 border-blue-200"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900">{tag.label}</p>
                      <p className="text-xs text-blue-600 mt-1">{tag.source}</p>
                    </div>
                    <button
                      onClick={() => onTagRemove(tag.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded transition-all"
                    >
                      <X className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base text-gray-900 mb-2">추천 역량이 없습니다</h3>
                <p className="text-sm text-gray-500 mb-6">
                  "공백 진단하기"를 통해<br />
                  채워야 할 역량을 찾아보세요
                </p>
                {onOpenDiagnosis && (
                  <button
                    onClick={onOpenDiagnosis}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    공백 진단하기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
