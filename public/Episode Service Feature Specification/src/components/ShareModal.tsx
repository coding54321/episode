import { useState } from 'react';
import { X, Link2, Check, Copy } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  nodeLabel: string;
  shareLink: string;
  onClose: () => void;
}

export default function ShareModal({ isOpen, nodeLabel, shareLink, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    // Fallback method for clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = shareLink;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    
    document.body.removeChild(textArea);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Link2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">노드 공유</h2>
              <p className="text-sm text-gray-500">"{nodeLabel}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Info */}
        <div className="mb-4 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-900">
            이 링크를 받은 사람은 선택한 노드와 모든 하위 노드를 볼 수 있습니다.
          </p>
        </div>

        {/* Link Display */}
        <div className="mb-4">
          <label className="text-xs text-gray-600 mb-2 block">공유 링크</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-sm">복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">복사</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}