'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * 보호된 라우트 래퍼 컴포넌트
 * 인증되지 않은 사용자를 로그인 페이지로 리다이렉트
 */
export default function ProtectedRoute({ 
  children, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading } = useUnifiedAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`${redirectTo}?returnUrl=${encodeURIComponent(currentPath)}`);
    }
  }, [user, loading, router, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null; // 리다이렉트 중
  }

  return <>{children}</>;
}
