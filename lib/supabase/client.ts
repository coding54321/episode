import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// 환경 변수에서 Supabase URL과 키 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
}

// Supabase 클라이언트 생성
console.log('[supabase/client] Supabase 클라이언트 생성 시작', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length
});

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Web Locks API 관련 문제를 피하기 위해 storage를 명시적으로 설정
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // storageKey를 명시적으로 설정하여 충돌 방지
    storageKey: 'sb-auth-token',
    // flowType을 'pkce'로 변경하여 보안성 향상 및 배포 환경 호환성 개선
    // 'pkce'는 OAuth 2.0 PKCE 플로우로, 더 안전하고 배포 환경에서 더 안정적
    flowType: 'pkce',
  },
});

console.log('[supabase/client] Supabase 클라이언트 생성 완료');

// 서버 사이드용 클라이언트 (서버 컴포넌트에서 사용)
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

