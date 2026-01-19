'use client';

import { useState, useRef, useEffect } from 'react';
import { PostIt as PostItType } from '@/types';
import { X, Edit2, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface PostItProps {
  postIt: PostItType;
  onUpdate: (id: string, updates: Partial<PostItType>) => void;
  onDelete: (id: string) => void;
  onDragStart?: (id: string, e: React.MouseEvent) => void;
  isDragging?: boolean;
  zoom: number;
  pan: { x: number; y: number };
  isReadOnly?: boolean;
}

export default function PostIt({
  postIt,
  onUpdate,
  onDelete,
  onDragStart,
  isDragging = false,
  zoom,
  pan,
  isReadOnly = false,
}: PostItProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(postIt.title);
  const [editContent, setEditContent] = useState(postIt.content);
  const [isHovered, setIsHovered] = useState(false);
  const postItRef = useRef<HTMLDivElement>(null);

  // 편집 모드에서 외부 클릭 시 저장
  useEffect(() => {
    if (isEditing) {
      const handleClickOutside = (e: MouseEvent) => {
        if (postItRef.current && !postItRef.current.contains(e.target as Node)) {
          handleSave();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, editTitle, editContent]);

  const handleSave = () => {
    if (editTitle.trim() || editContent.trim()) {
      onUpdate(postIt.id, {
        title: editTitle.trim() || '제목 없음',
        content: editContent.trim(),
        updatedAt: Date.now(),
      });
    }
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('포스트잇을 삭제하시겠습니까?')) {
      onDelete(postIt.id);
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (isReadOnly || isEditing) return;
    if (onDragStart) {
      onDragStart(postIt.id, e);
    }
  };

  const colorClasses = {
    yellow: 'bg-yellow-200 border-yellow-300',
    pink: 'bg-pink-200 border-pink-300',
    blue: 'bg-blue-200 border-blue-300',
    green: 'bg-green-200 border-green-300',
    purple: 'bg-purple-200 border-purple-300',
  };

  const color = postIt.color || 'yellow';
  const width = postIt.width || 200;
  const height = postIt.height || 150;

  return (
    <motion.div
      ref={postItRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isDragging ? 0.8 : 1, 
        scale: isDragging ? 1.05 : 1,
      }}
      transition={{ duration: 0.2 }}
      className={`relative ${colorClasses[color as keyof typeof colorClasses] || colorClasses.yellow} border-2 rounded-lg shadow-lg cursor-move`}
      style={{
        width: `${width}px`,
        minHeight: `${height}px`,
        zIndex: postIt.zIndex || 1000, // 노드보다 위에 표시
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
      }}
      onMouseEnter={() => !isReadOnly && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => !isReadOnly && setIsEditing(true)}
    >
      {/* 드래그 핸들 */}
      {!isReadOnly && (isHovered || isDragging) && (
        <div
          className="absolute top-1 left-1 cursor-move text-gray-500 hover:text-gray-700"
          onMouseDown={handleDragStart}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* 삭제 버튼 */}
      {!isReadOnly && (isHovered || isEditing) && (
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
          title="삭제"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* 편집 버튼 */}
      {!isReadOnly && isHovered && !isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-1 right-8 p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="편집"
        >
          <Edit2 className="h-3 w-3" />
        </button>
      )}

      {/* 내용 */}
      <div className="p-3 h-full flex flex-col">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditTitle(postIt.title);
                  setEditContent(postIt.content);
                }
              }}
              className="font-bold text-sm mb-2 bg-transparent border-b-2 border-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="제목"
              autoFocus
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditTitle(postIt.title);
                  setEditContent(postIt.content);
                }
              }}
              className="flex-1 text-xs bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
              placeholder="내용을 입력하세요..."
            />
          </>
        ) : (
          <>
            <h3 className="font-bold text-sm mb-2 line-clamp-2">{postIt.title || '제목 없음'}</h3>
            <p className="text-xs text-gray-700 flex-1 overflow-y-auto whitespace-pre-wrap line-clamp-6">
              {postIt.content || '내용을 입력하세요...'}
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
