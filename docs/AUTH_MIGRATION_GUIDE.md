# 인증 시스템 마이그레이션 가이드

## 개요

기존의 여러 인증 시스템을 통합하여 단일 인증 컨텍스트(`UnifiedAuthProvider`)로 통합했습니다.

## 변경 사항

### 1. 통합 인증 컨텍스트

**새로운 파일:**
- `lib/auth/unified-auth-context.tsx` - 통합 인증 컨텍스트

**제거 예정 파일 (하위 호환성 유지 중):**
- `lib/auth/simple-auth.tsx` - `UnifiedAuthProvider`로 대체
- `lib/auth/auth-context.tsx` - `UnifiedAuthProvider`로 대체
- `lib/auth/improved-auth-context.tsx` - `UnifiedAuthProvider`로 대체

### 2. 사용 방법

#### 기존 코드 (SimpleAuth)
```typescript
import { useSimpleAuth } from '@/lib/auth/simple-auth'

const { user, loading, signInWithKakao, signOut } = useSimpleAuth()
```

#### 새로운 코드 (UnifiedAuth)
```typescript
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context'
// 또는 하위 호환성을 위해
import { useAuth } from '@/lib/auth/unified-auth-context'

const { user, loading, error, signInWithKakao, signOut, clearError, refreshSession } = useUnifiedAuth()
```

### 3. 주요 차이점

#### User 타입
- **기존**: Supabase의 `User` 타입 직접 사용
- **새로운**: `AppUser` 타입 사용 (일관된 인터페이스)

```typescript
interface AppUser {
  id: string
  name: string
  email: string
  provider: 'kakao' | 'google' | 'email'
  createdAt: number
}
```

#### 에러 처리
- **기존**: 문자열 에러 또는 없음
- **새로운**: `AuthError` 타입 사용 (구조화된 에러)

```typescript
const { error, clearError } = useUnifiedAuth()

if (error) {
  console.log(error.code) // 'SESSION_EXPIRED', 'OAUTH_ERROR' 등
  console.log(error.userMessage) // 사용자 친화적 메시지
}
```

#### 세션 관리
- **기존**: 수동 관리
- **새로운**: `SessionManager` 통합 (자동 토큰 갱신)

### 4. 마이그레이션 체크리스트

#### Layout 업데이트
- [x] `app/layout.tsx` - `UnifiedAuthProvider` 사용

#### 로그인 페이지
- [x] `app/login/page.tsx` - `useUnifiedAuth` 사용
- [ ] `app/login/improved-page.tsx` - 마이그레이션 또는 제거
- [ ] `app/login/simple-page.tsx` - 마이그레이션 또는 제거

#### 콜백 페이지
- [x] `app/auth/callback/page.tsx` - 통합 콜백 처리
- [ ] `app/auth/simple-callback/page.tsx` - 제거 (통합됨)

#### 컴포넌트
- [ ] `components/FloatingHeader.tsx` - 확인 필요
- [ ] `components/Header.tsx` - 확인 필요
- [ ] 기타 인증 사용 컴포넌트

### 5. 하위 호환성

현재는 하위 호환성을 위해 다음 별칭을 제공합니다:

```typescript
// unified-auth-context.tsx에서
export const AuthProvider = UnifiedAuthProvider
export const useAuth = useUnifiedAuth
```

하지만 장기적으로는 직접 import하는 것을 권장합니다.

### 6. Database 변경 사항

#### RLS 정책 정리
- `users` 테이블의 중복된 UPDATE 정책 제거
- 더 구체적인 정책만 유지

#### Database Trigger 추가
- `handle_new_user()` 함수: Supabase Auth 사용자 생성 시 자동으로 `public.users`에 등록
- `sync_existing_auth_users()` 함수: 기존 사용자 동기화용 (수동 실행)

### 7. Middleware 개선

- 쿠키 기반 체크에서 실제 세션 검증으로 변경
- 서버 사이드에서 `getUser()` 호출하여 토큰 유효성 검증

### 8. 제거 예정 파일

다음 파일들은 점진적으로 제거될 예정입니다:

1. `lib/auth/simple-auth.tsx` - `UnifiedAuthProvider`로 대체
2. `lib/auth/auth-context.tsx` - `UnifiedAuthProvider`로 대체
3. `lib/auth/improved-auth-context.tsx` - `UnifiedAuthProvider`로 대체
4. `app/auth/simple-callback/page.tsx` - `app/auth/callback/page.tsx`로 통합
5. `app/login/improved-page.tsx` - `app/login/page.tsx`로 통합 (또는 제거)
6. `app/login/simple-page.tsx` - `app/login/page.tsx`로 통합 (또는 제거)

### 9. 테스트 체크리스트

마이그레이션 후 다음을 테스트하세요:

- [ ] 로그인 플로우 (카카오 OAuth)
- [ ] 로그아웃
- [ ] 세션 갱신
- [ ] 보호된 라우트 접근
- [ ] 에러 처리
- [ ] 콜백 처리

### 10. 문제 해결

#### 문제: "useUnifiedAuth must be used within a UnifiedAuthProvider"
**해결**: `app/layout.tsx`에서 `UnifiedAuthProvider`로 감싸져 있는지 확인

#### 문제: User 타입 불일치
**해결**: `AppUser` 타입을 사용하도록 업데이트

#### 문제: 세션이 만료되어도 계속 로그인 상태
**해결**: Middleware가 실제 세션을 검증하도록 개선됨

### 11. 추가 개선 사항

#### 보안
- [ ] Supabase Dashboard에서 Leaked Password Protection 활성화
- [ ] 비밀번호 정책 설정 검토

#### 모니터링
- [ ] 인증 실패 로그 수집
- [ ] 세션 만료 추적

#### 문서화
- [ ] 인증 아키텍처 다이어그램
- [ ] 개발자 가이드 업데이트
