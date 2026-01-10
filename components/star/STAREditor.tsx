'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { assetStorage } from '@/lib/storage';
import { STARAsset, COMPETENCY_KEYWORDS } from '@/types';
import { Copy, Save, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface STAREditorProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodeLabel: string | null;
  onNodeLabelUpdate?: (nodeId: string, newLabel: string) => void; // 노드 라벨 업데이트 콜백
  initialData?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

export default function STAREditor({
  isOpen,
  onClose,
  nodeId,
  nodeLabel,
  onNodeLabelUpdate,
  initialData,
}: STAREditorProps) {
  const [title, setTitle] = useState('');
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [content, setContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setSituation(initialData.situation);
      setTask(initialData.task);
      setAction(initialData.action);
      setResult(initialData.result);
      setTitle(nodeLabel || '');
    } else {
      setTitle(nodeLabel || '');
    }
    
    // 기존 저장된 태그 로드
    if (nodeId) {
      const loadExistingAsset = async () => {
        const existingAsset = await assetStorage.getByNodeId(nodeId);
        if (existingAsset && existingAsset.tags) {
          setSelectedTags(existingAsset.tags);
        }
      };
      loadExistingAsset();
    }
  }, [initialData, nodeLabel, nodeId]);

  useEffect(() => {
    // STAR 구성 요소를 조립하여 최종 텍스트 생성
    const parts = [];
    if (situation) parts.push(`상황(Situation): ${situation}`);
    if (task) parts.push(`과제(Task): ${task}`);
    if (action) parts.push(`행동(Action): ${action}`);
    if (result) parts.push(`결과(Result): ${result}`);
    setContent(parts.join('\n\n'));
  }, [situation, task, action, result]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    if (!content.trim()) {
      toast.error('내용을 입력해주세요');
      return;
    }

    if (!nodeId) {
      toast.error('노드 정보가 없습니다');
      return;
    }

    // 기존 asset 확인
    const existingAsset = await assetStorage.getByNodeId(nodeId);

    const asset: STARAsset = {
      id: existingAsset?.id || `asset_${Date.now()}`,
      nodeId,
      title: title.trim(),
      situation,
      task,
      action,
      result,
      content,
      tags: selectedTags,
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
    if (onNodeLabelUpdate && title.trim() !== nodeLabel) {
      onNodeLabelUpdate(nodeId, title.trim());
    }
    
    toast.success('저장되었습니다');
    onClose();
    
    // 폼 초기화
    setTitle('');
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
    setContent('');
    setSelectedTags([]);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      toast.success('클립보드에 복사되었습니다');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('복사에 실패했습니다');
    }
  };

  const wordCount = content.length;
  const isOverLimit = wordCount > 700;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">STAR 에디터</DialogTitle>
        <div className="space-y-6 pt-6">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 웹 개발 프로젝트 경험"
              className="w-full"
            />
          </div>

          {/* STAR 구성 요소 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Badge variant="outline" className="mr-2">S</Badge>
                상황 (Situation)
              </label>
              <Textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="어떤 상황이었나요?"
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Badge variant="outline" className="mr-2">T</Badge>
                과제 (Task)
              </label>
              <Textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="어떤 과제나 목표가 있었나요?"
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Badge variant="outline" className="mr-2">A</Badge>
                행동 (Action)
              </label>
              <Textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="구체적으로 어떤 행동을 취했나요?"
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Badge variant="outline" className="mr-2">R</Badge>
                결과 (Result)
              </label>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="결과는 어땠나요?"
                className="min-h-[100px]"
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
                  variant={selectedTags.includes(keyword) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    selectedTags.includes(keyword)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleToggleTag(keyword)}
                >
                  {keyword}
                  {selectedTags.includes(keyword) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              이 경험에서 발휘한 강점이나 역량을 선택해주세요 (복수 선택 가능)
            </p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              저장하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

