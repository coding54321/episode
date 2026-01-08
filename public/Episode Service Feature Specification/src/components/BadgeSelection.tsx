import { useState } from 'react';
import { Briefcase, Code, Users, GraduationCap, Star, CheckCircle2 } from 'lucide-react';
import { Badge } from '../App';

interface BadgeSelectionProps {
  userName: string;
  onComplete: (badges: Badge[]) => void;
}

const AVAILABLE_BADGES: Badge[] = [
  { id: 'intern', label: '인턴', icon: 'briefcase' },
  { id: 'project', label: '프로젝트', icon: 'code' },
  { id: 'club', label: '동아리', icon: 'users' },
  { id: 'academic', label: '학업', icon: 'graduation' },
  { id: 'other', label: '기타 경험', icon: 'star' },
];

const ICON_MAP = {
  briefcase: Briefcase,
  code: Code,
  users: Users,
  graduation: GraduationCap,
  star: Star,
};

export default function BadgeSelection({ userName, onComplete }: BadgeSelectionProps) {
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);

  const toggleBadge = (badgeId: string) => {
    setSelectedBadges(prev =>
      prev.includes(badgeId)
        ? prev.filter(id => id !== badgeId)
        : [...prev, badgeId]
    );
  };

  const handleComplete = () => {
    if (selectedBadges.length === 0) return;
    
    const badges = AVAILABLE_BADGES.filter(badge =>
      selectedBadges.includes(badge.id)
    );
    onComplete(badges);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl mb-3 text-gray-900">
            반가워요, {userName}님! 👋
          </h1>
          <p className="text-xl text-gray-600">
            어떤 경험들을 정리하고 싶으신가요?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            선택한 경험들이 마인드맵의 시작점이 됩니다
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {AVAILABLE_BADGES.map(badge => {
            const Icon = ICON_MAP[badge.icon as keyof typeof ICON_MAP];
            const isSelected = selectedBadges.includes(badge.id);

            return (
              <button
                key={badge.id}
                onClick={() => toggleBadge(badge.id)}
                className={`
                  relative p-6 rounded-2xl border-2 transition-all
                  ${isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <Icon className={`w-8 h-8 mx-auto mb-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className={`text-sm ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                  {badge.label}
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleComplete}
          disabled={selectedBadges.length === 0}
          className={`
            w-full py-4 rounded-xl transition-all
            ${selectedBadges.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {selectedBadges.length === 0
            ? '최소 1개 이상 선택해주세요'
            : `${selectedBadges.length}개 경험으로 시작하기`
          }
        </button>

        <p className="text-xs text-gray-500 text-center mt-6">
          나중에 언제든지 경험 카테고리를 추가하거나 삭제할 수 있어요
        </p>
      </div>
    </div>
  );
}
