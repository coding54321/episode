'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { toast } from 'sonner';

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signInWithKakao, signInWithGoogle } = useUnifiedAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast.error(error.userMessage || error.message || '로그인에 실패했습니다.');
      } else {
        toast.success('로그인되었습니다.');
      }
    } catch (error) {
      toast.error('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      const { error } = await signInWithKakao();
      if (error) {
        toast.error(error.userMessage || error.message || '카카오 로그인에 실패했습니다.');
      }
    } catch (error) {
      toast.error('카카오 로그인 중 오류가 발생했습니다.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.userMessage || error.message || '구글 로그인에 실패했습니다.');
      }
    } catch (error) {
      toast.error('구글 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
          <p className="text-gray-600 mt-2">계정에 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">또는</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleKakaoLogin}
          >
            카카오로 로그인
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            구글로 로그인
          </Button>
        </div>

        <div className="text-center text-sm">
          <span className="text-gray-600">계정이 없으신가요? </span>
          <button
            type="button"
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            회원가입
          </button>
        </div>
      </div>
    </Card>
  );
}