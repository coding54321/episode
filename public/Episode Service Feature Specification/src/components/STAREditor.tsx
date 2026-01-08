import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';
import { STARAsset, ChatMessage } from '../types';

interface STAREditorProps {
  isOpen: boolean;
  nodeId: string;
  nodeLabel: string;
  messages: ChatMessage[];
  onClose: () => void;
  onSave: (asset: Omit<STARAsset, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function STAREditor({ isOpen, nodeId, nodeLabel, messages, onClose, onSave }: STAREditorProps) {
  const [content, setContent] = useState(() => generateSTARContent(messages, nodeLabel));
  const [title, setTitle] = useState(nodeLabel);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContent(generateSTARContent(messages, nodeLabel));
      setTitle(nodeLabel);
    }
  }, [isOpen, messages, nodeLabel]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    // Extract STAR components from content
    const situationMatch = content.match(/\[Situation[^\]]*\](.*?)(?=\[|$)/is);
    const taskMatch = content.match(/\[Task[^\]]*\](.*?)(?=\[|$)/is);
    const actionMatch = content.match(/\[Action[^\]]*\](.*?)(?=\[|$)/is);
    const resultMatch = content.match(/\[Result[^\]]*\](.*?)(?=\[|$)/is);

    onSave({
      nodeId,
      title: title.trim(),
      situation: situationMatch ? situationMatch[1].trim() : '',
      task: taskMatch ? taskMatch[1].trim() : '',
      action: actionMatch ? actionMatch[1].trim() : '',
      result: resultMatch ? resultMatch[1].trim() : '',
      content: content.trim(),
    });
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const wordCount = content.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-gray-900">STAR 초안 에디터</h2>
            <p className="text-sm text-gray-600 mt-1">AI가 생성한 초안을 자유롭게 수정하세요</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="경험의 제목을 입력하세요"
            />
          </div>

          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-gray-700">내용</label>
              <span className={`text-xs ${wordCount > 700 ? 'text-orange-600' : wordCount < 500 ? 'text-gray-500' : 'text-green-600'}`}>
                {wordCount}자 {wordCount < 500 && '(최소 500자 권장)'}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
              placeholder="STAR 방식으로 경험을 작성하세요..."
            />
          </div>

          {/* STAR Guide */}
          <div className="bg-blue-50 rounded-xl p-4 text-sm">
            <h4 className="text-blue-900 mb-2 font-semibold">STAR 작성 가이드</h4>
            <ul className="space-y-1 text-blue-700 text-xs">
              <li><strong>S (Situation):</strong> 상황과 배경을 설명합니다</li>
              <li><strong>T (Task):</strong> 목표와 역할을 명확히 합니다</li>
              <li><strong>A (Action):</strong> 구체적인 행동과 방법을 서술합니다</li>
              <li><strong>R (Result):</strong> 성과와 배운 점을 정리합니다</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleCopy}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                복사됨
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                복사하기
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim()}
            className={`flex-1 py-3 rounded-xl transition-colors ${
              title.trim() && content.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

function generateSTARContent(messages: ChatMessage[], nodeLabel: string): string {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  
  if (userMessages.length === 0) {
    return `[Situation - 상황]
당시 상황과 배경을 설명해주세요.

[Task - 과제]
해결해야 할 과제나 목표를 명시해주세요.

[Action - 행동]
구체적으로 어떤 행동을 취했는지 서술해주세요.

[Result - 결과]
어떤 성과가 있었는지, 무엇을 배웠는지 정리해주세요.`;
  }

  // 더 나은 STAR 생성 로직
  const allUserText = userMessages.join(' ');
  
  // 상황 추출 (첫 번째 메시지 또는 상황 관련 키워드)
  let situation = '';
  let task = '';
  let action = '';
  let result = '';
  
  // 메시지를 순서대로 분석하여 STAR 구성 요소 추출
  userMessages.forEach((msg, index) => {
    const lowerMsg = msg.toLowerCase();
    
    if (!situation && (lowerMsg.includes('상황') || lowerMsg.includes('배경') || lowerMsg.includes('때') || index === 0)) {
      situation = msg;
    } else if (!task && (lowerMsg.includes('역할') || lowerMsg.includes('목표') || lowerMsg.includes('과제'))) {
      task = msg;
    } else if (!action && (lowerMsg.includes('행동') || lowerMsg.includes('방법') || lowerMsg.includes('했습니다') || lowerMsg.includes('했어요'))) {
      action = msg;
    } else if (!result && (lowerMsg.includes('결과') || lowerMsg.includes('성과') || lowerMsg.includes('배웠'))) {
      result = msg;
    }
  });
  
  // 기본값 설정
  if (!situation && userMessages.length > 0) situation = userMessages[0];
  if (!task && userMessages.length > 1) task = userMessages[1];
  if (!action && userMessages.length > 2) action = userMessages.slice(2, -1).join(' ') || userMessages[userMessages.length - 2] || '';
  if (!result && userMessages.length > 0) result = userMessages[userMessages.length - 1];

  return `${nodeLabel} 경험을 통해 성장한 과정을 공유하고자 합니다.

[Situation - 상황]
${situation || '당시 상황과 배경을 설명해주세요.'}

[Task - 과제]
${task || '해결해야 할 과제나 목표를 명시해주세요.'}

[Action - 행동]
${action || '구체적으로 어떤 행동을 취했는지 서술해주세요.'}

[Result - 결과]
${result || '어떤 성과가 있었는지, 무엇을 배웠는지 정리해주세요.'}

이러한 경험을 통해 문제 해결 능력과 협업 역량을 키울 수 있었습니다.`;
}
