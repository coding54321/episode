import { Search, Menu, LayoutDashboard, LogOut, Home, Map } from 'lucide-react';
import { User } from '../App';

interface HeaderProps {
  user: User;
  showDiagnosisButton?: boolean;
  onOpenDiagnosis?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToHome?: () => void;
  onNavigateToMindmap?: () => void;
  onLogout?: () => void;
  showMenu?: boolean;
  onToggleMenu?: (show: boolean) => void;
  currentPage?: 'home' | 'mindmap' | 'dashboard';
}

export default function Header({
  user,
  showDiagnosisButton = false,
  onOpenDiagnosis,
  onNavigateToDashboard,
  onNavigateToHome,
  onNavigateToMindmap,
  onLogout,
  showMenu = false,
  onToggleMenu,
  currentPage = 'mindmap'
}: HeaderProps) {
  return (
    <header className="toss-card" style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--toss-gray-200)', padding: 'var(--toss-space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
      <div className="flex items-center gap-6">
        <button
          onClick={onNavigateToHome}
          className="toss-text-h3"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--toss-gray-900)', transition: 'color 0.2s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--toss-blue)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--toss-gray-900)'}
        >
          episode
        </button>

        <nav className="flex items-center gap-1">
          {onNavigateToHome && (
            <button
              onClick={onNavigateToHome}
              className={`toss-button toss-button-ghost ${
                currentPage === 'home' ? 'toss-button-secondary' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Home className="w-4 h-4" />
                <span>홈</span>
              </div>
            </button>
          )}
          {onNavigateToMindmap && (
            <button
              onClick={onNavigateToMindmap}
              className={`toss-button toss-button-ghost ${
                currentPage === 'mindmap' ? 'toss-button-secondary' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Map className="w-4 h-4" />
                <span>마인드맵</span>
              </div>
            </button>
          )}
        </nav>

        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="경험 검색..."
            className="toss-input"
            style={{ paddingLeft: '2.25rem', width: '16rem' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {showDiagnosisButton && onOpenDiagnosis && (
          <button
            onClick={onOpenDiagnosis}
            className="toss-button toss-button-primary"
          >
            공백 진단하기
          </button>
        )}
        {onNavigateToDashboard && (
          <button
            onClick={onNavigateToDashboard}
            className="toss-icon-button"
            title="대시보드"
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => onToggleMenu?.(!showMenu)}
            className="toss-icon-button"
          >
            <Menu className="w-5 h-5" />
          </button>
          {showMenu && onLogout && (
            <div className="toss-card" style={{ position: 'absolute', right: 0, marginTop: 'var(--toss-space-2)', width: '12rem', zIndex: 50 }}>
              <div style={{ paddingBottom: 'var(--toss-space-3)', marginBottom: 'var(--toss-space-3)', borderBottom: '1px solid var(--toss-gray-200)' }}>
                <p className="toss-text-body2" style={{ color: 'var(--toss-gray-900)' }}>{user.name}</p>
                <p className="toss-text-caption">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="toss-button toss-button-ghost"
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}