import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/Login';
import BadgeSelection from './components/BadgeSelection';
import MindMapCanvas from './components/MindMapCanvas';
import Dashboard from './components/Dashboard';
import SharedMindMapView from './components/SharedMindMapView';
import { X } from 'lucide-react';
import './styles/toss-design.css';

export interface User {
  id: string;
  name: string;
  email: string;
  provider: 'kakao' | 'google';
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
}

export type AppScreen = 'landing' | 'login' | 'badge-selection' | 'mindmap' | 'dashboard' | 'shared';

export interface Tab {
  id: string;
  type: 'main' | 'shared';
  title: string;
  nodeId?: string; // for shared tabs
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const savedUser = localStorage.getItem('episode_user');
  if (!savedUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Landing Route
function LandingRoute() {
  const navigate = useNavigate();
  return <Landing onGetStarted={() => navigate('/login')} />;
}

// Login Route
function LoginRoute() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem('episode_user');
  
  useEffect(() => {
    if (savedUser) {
      const savedBadges = localStorage.getItem('episode_badges');
      if (savedBadges) {
        navigate('/mindmap', { replace: true });
      } else {
        navigate('/badge-selection', { replace: true });
      }
    }
  }, [savedUser, navigate]);

  const handleLogin = (userData: User) => {
    localStorage.setItem('episode_user', JSON.stringify(userData));
    navigate('/badge-selection');
  };

  return <Login onLogin={handleLogin} />;
}

// Badge Selection Route
function BadgeSelectionRoute() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem('episode_user');
  
  useEffect(() => {
    if (!savedUser) {
      navigate('/login', { replace: true });
      return;
    }
  }, [savedUser, navigate]);

  if (!savedUser) return null;

  const user = JSON.parse(savedUser) as User;

  const handleBadgeSelection = (badges: Badge[]) => {
    localStorage.setItem('episode_badges', JSON.stringify(badges));
    navigate('/mindmap');
  };

  return <BadgeSelection userName={user.name || '사용자'} onComplete={handleBadgeSelection} />;
}

// MindMap Route
function MindMapRoute() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem('episode_user');
  const savedBadges = localStorage.getItem('episode_badges');
  
  useEffect(() => {
    if (!savedUser) {
      navigate('/login', { replace: true });
      return;
    }
    if (!savedBadges) {
      navigate('/badge-selection', { replace: true });
      return;
    }
  }, [savedUser, savedBadges, navigate]);

  if (!savedUser || !savedBadges) return null;

  const user = JSON.parse(savedUser) as User;
  const badges = JSON.parse(savedBadges) as Badge[];
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize main tab
    const mainTab: Tab = {
      id: 'main',
      type: 'main',
      title: '경험 맵'
    };
    setTabs([mainTab]);
    setActiveTabId('main');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('episode_user');
    localStorage.removeItem('episode_badges');
    localStorage.removeItem('episode_mindmap');
    localStorage.removeItem('episode_assets');
    localStorage.removeItem('episode_gap_tags');
    navigate('/');
  };

  const openNodeInNewTab = (nodeId: string, nodeLabel: string) => {
    const newTab: Tab = {
      id: `shared_${nodeId}_${Date.now()}`,
      type: 'shared',
      title: nodeLabel,
      nodeId
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    if (tabId === 'main') return; // Can't close main tab

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else if (newTabs.length === 0) {
        setActiveTabId('main');
      }
      return newTabs;
    });
  };

  const renderTabBar = () => {
    if (tabs.length === 0) return null;

    return (
      <div className="bg-gray-100 border-b border-gray-300 flex items-center overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`
              flex items-center gap-2 px-4 py-2 border-r border-gray-300 min-w-[150px] max-w-[200px] cursor-pointer
              ${activeTabId === tab.id ? 'bg-white' : 'bg-gray-50 hover:bg-gray-200'}
            `}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="flex-1 truncate text-sm text-gray-900">{tab.title}</span>
            {tab.id !== 'main' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="hover:bg-gray-300 rounded p-0.5"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderActiveTab = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return null;

    if (activeTab.type === 'main') {
      return (
        <MindMapCanvas
          user={user}
          badges={badges}
          onNavigateToDashboard={() => navigate('/dashboard')}
          onNavigateToHome={() => navigate('/')}
          onLogout={handleLogout}
          onOpenNodeInNewTab={openNodeInNewTab}
          renderTabBar={renderTabBar}
        />
      );
    } else {
      return (
        <SharedMindMapView
          nodeId={activeTab.nodeId!}
          onBackToHome={() => closeTab(activeTab.id)}
          isEmbedded={true}
          renderTabBar={renderTabBar}
          user={user}
          onNavigateToDashboard={() => navigate('/dashboard')}
          onNavigateToHome={() => navigate('/')}
          onLogout={handleLogout}
        />
      );
    }
  };

  return renderActiveTab();
}

// Dashboard Route
function DashboardRoute() {
  const navigate = useNavigate();
  const savedUser = localStorage.getItem('episode_user');
  
  useEffect(() => {
    if (!savedUser) {
      navigate('/login', { replace: true });
      return;
    }
  }, [savedUser, navigate]);

  if (!savedUser) return null;

  const user = JSON.parse(savedUser) as User;

  const handleLogout = () => {
    localStorage.removeItem('episode_user');
    localStorage.removeItem('episode_badges');
    localStorage.removeItem('episode_mindmap');
    localStorage.removeItem('episode_assets');
    localStorage.removeItem('episode_gap_tags');
    navigate('/');
  };

  return (
    <Dashboard
      user={user}
      onNavigateToMindmap={() => navigate('/mindmap')}
      onLogout={handleLogout}
    />
  );
}

// Shared MindMap Route
function SharedMindMapRoute() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();

  if (!nodeId) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <h2 className="text-xl text-gray-900 mb-2">노드를 찾을 수 없습니다</h2>
          <p className="text-sm text-gray-600 mb-6">공유 링크가 올바르지 않습니다.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <SharedMindMapView
      nodeId={nodeId}
      onBackToHome={() => navigate('/')}
      isEmbedded={false}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route 
          path="/badge-selection" 
          element={
            <ProtectedRoute>
              <BadgeSelectionRoute />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mindmap" 
          element={
            <ProtectedRoute>
              <MindMapRoute />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardRoute />
            </ProtectedRoute>
          } 
        />
        <Route path="/share/:nodeId" element={<SharedMindMapRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
