import { User } from '../App';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const handleSocialLogin = (provider: 'kakao' | 'google') => {
    // Mock social login - in production, this would integrate with OAuth
    const mockUser: User = {
      id: `${provider}_${Date.now()}`,
      name: provider === 'kakao' ? '김토스' : 'Toss Kim',
      email: `user@${provider}.com`,
      provider,
    };
    
    onLogin(mockUser);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl mb-3 text-gray-900">episode</h1>
          <p className="text-gray-600">
            소셜 계정으로 3초 만에 시작하세요
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleSocialLogin('kakao')}
            className="w-full py-4 bg-[#FEE500] text-[#000000] rounded-xl hover:bg-[#FDD835] transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.9 2.117 5.433 5.25 6.808-.203.738-.663 2.533-.763 2.933-.125.5.188.488.388.35.15-.1 2.45-1.675 3.4-2.325.575.075 1.163.125 1.763.125 5.523 0 10-3.477 10-7.75S17.523 3 12 3z"/>
            </svg>
            <span>카카오로 시작하기</span>
          </button>

          <button
            onClick={() => handleSocialLogin('google')}
            className="w-full py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google로 시작하기</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-8 leading-relaxed">
          로그인 시 episode의 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          <br />
          <span className="text-gray-400">
            episode는 PII 수집 및 민감 정보 저장을 지양합니다.
          </span>
        </p>
      </div>
    </div>
  );
}
