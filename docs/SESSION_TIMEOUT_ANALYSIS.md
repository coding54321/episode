# Session Timeout 오류 원인 분석

## 문제 상황
배포 환경에서 다른 사람들이 로그인할 때 "session timeout" 오류가 발생합니다.

---

## 🔍 주요 원인 분석

### 1. OAuth 콜백 타임아웃 설정이 너무 짧음 ⚠️ **가장 가능성 높음**

**위치**: `app/auth/callback/page.tsx` (51-56번 라인)

```typescript
// 최대 10초 대기 후 타임아웃
timeoutId = setTimeout(() => {
  if (isMounted) {
    console.error('[AuthCallback] Timeout waiting for session')
    router.replace('/login?error=session_timeout')
  }
}, 10000) // 10초
```

**문제점**:
- 배포 환경에서는 네트워크 지연, Supabase 서버 응답 지연, 카카오 OAuth 서버 응답 지연 등으로 인해 10초 내에 세션이 설정되지 않을 수 있습니다.
- 특히 해외 서버나 느린 네트워크 환경에서는 더욱 문제가 됩니다.
- `onAuthStateChange` 이벤트가 발생하기 전에 타임아웃이 발생할 수 있습니다.

**영향도**: 🔴 **높음**

---

### 2. Supabase 클라이언트 설정 문제

**위치**: `lib/supabase/client.ts` (20-32번 라인)

```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-auth-token',
    flowType: 'implicit', // ⚠️ 문제 가능성
  },
});
```

**문제점**:
- `flowType: 'implicit'`는 OAuth 콜백 처리 방식인데, 배포 환경에서 URL 파라미터가 제대로 전달되지 않을 수 있습니다.
- `detectSessionInUrl: true`가 설정되어 있지만, 배포 환경에서 URL 해시나 쿼리 파라미터가 제대로 처리되지 않을 수 있습니다.
- `storage: window.localStorage`는 클라이언트 사이드에서만 작동하는데, SSR 환경에서 문제가 될 수 있습니다.

**영향도**: 🟡 **중간**

---

### 3. 네트워크 지연 및 타임아웃

**문제점**:
- 배포 환경에서 Supabase 서버로의 요청이 느릴 수 있습니다.
- 카카오 OAuth 서버 응답이 지연될 수 있습니다.
- `getSession()` 호출이 타임아웃될 수 있습니다.

**위치**: `app/auth/callback/page.tsx` (59번 라인)

```typescript
const { data: { session }, error } = await supabase.auth.getSession()
```

이 호출이 배포 환경에서 느리게 응답하거나 타임아웃될 수 있습니다.

**영향도**: 🟡 **중간**

---

### 4. 환경 변수 설정 문제

**위치**: `lib/supabase/client.ts` (5-6번 라인)

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
```

**문제점**:
- 배포 환경에서 환경 변수가 제대로 설정되지 않았을 수 있습니다.
- 환경 변수가 빈 문자열이면 Supabase 클라이언트가 제대로 초기화되지 않습니다.
- 이 경우 모든 인증 요청이 실패할 수 있습니다.

**영향도**: 🟡 **중간**

---

### 5. localStorage 접근 문제

**위치**: `lib/supabase/client.ts` (26번 라인)

```typescript
storage: typeof window !== 'undefined' ? window.localStorage : undefined,
```

**문제점**:
- 배포 환경에서 localStorage 접근이 제한될 수 있습니다 (예: Safari Private Mode, 특정 보안 설정).
- 쿠키 설정이 다를 수 있습니다.
- 브라우저 보안 정책으로 인해 localStorage에 접근하지 못할 수 있습니다.

**영향도**: 🟢 **낮음**

---

### 6. OAuth 콜백 URL 설정 문제

**위치**: `lib/auth/unified-auth-context.tsx` (282-284번 라인)

```typescript
const redirectTo = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
  : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`
```

**문제점**:
- 배포 환경에서 `window.location.origin`이 예상과 다를 수 있습니다 (예: 프록시, CDN).
- `NEXT_PUBLIC_SITE_URL` 환경 변수가 설정되지 않았을 수 있습니다.
- 카카오 OAuth 설정에서 허용된 리다이렉트 URL과 일치하지 않을 수 있습니다.

**영향도**: 🟡 **중간**

---

### 7. 세션 저장 타이밍 문제

**위치**: `app/auth/callback/page.tsx` (28-48번 라인)

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (!isMounted) return

    if (event === 'SIGNED_IN' && session?.user) {
      console.log('[AuthCallback] Login successful:', session.user.id)
      
      // 약간의 지연 후 리다이렉트 (세션 저장 완료 대기)
      setTimeout(() => {
        if (isMounted) {
          router.replace(next)
        }
      }, 100) // ⚠️ 100ms는 너무 짧을 수 있음
    }
  }
)
```

**문제점**:
- `SIGNED_IN` 이벤트가 발생한 후 100ms만 기다리는데, 배포 환경에서는 세션이 localStorage에 저장되는 데 더 오래 걸릴 수 있습니다.
- 세션이 완전히 저장되기 전에 리다이렉트되면 다음 페이지에서 세션을 찾지 못할 수 있습니다.

**영향도**: 🟡 **중간**

---

### 8. 동시 요청 경쟁 조건 (Race Condition)

**위치**: `app/auth/callback/page.tsx` (28-84번 라인)

**문제점**:
- `onAuthStateChange` 이벤트 리스너와 `getSession()` 호출이 동시에 실행됩니다.
- 배포 환경에서 이 두 가지가 경쟁 조건을 일으킬 수 있습니다.
- 타임아웃이 먼저 발생하면 세션이 설정되기 전에 로그인 페이지로 리다이렉트됩니다.

**영향도**: 🟡 **중간**

---

## 📊 원인 우선순위

1. **🔴 높음**: OAuth 콜백 타임아웃 설정이 너무 짧음 (10초)
2. **🟡 중간**: Supabase 클라이언트 설정 (`flowType: 'implicit'`)
3. **🟡 중간**: 네트워크 지연 및 타임아웃
4. **🟡 중간**: 환경 변수 설정 문제
5. **🟡 중간**: OAuth 콜백 URL 설정 문제
6. **🟡 중간**: 세션 저장 타이밍 문제
7. **🟡 중간**: 동시 요청 경쟁 조건
8. **🟢 낮음**: localStorage 접근 문제

---

## 🔎 추가 확인 사항

### 배포 환경에서 확인해야 할 것들:

1. **환경 변수 확인**:
   - `NEXT_PUBLIC_SUPABASE_URL`이 올바르게 설정되어 있는지
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 올바르게 설정되어 있는지
   - `NEXT_PUBLIC_SITE_URL`이 설정되어 있는지 (선택사항이지만 권장)

2. **카카오 OAuth 설정 확인**:
   - 카카오 개발자 콘솔에서 리다이렉트 URI가 배포 환경 URL과 일치하는지
   - 예: `https://your-domain.com/auth/callback`

3. **네트워크 확인**:
   - 배포 환경에서 Supabase 서버로의 네트워크 지연 시간
   - 카카오 OAuth 서버로의 네트워크 지연 시간

4. **브라우저 콘솔 로그 확인**:
   - `[AuthCallback] Timeout waiting for session` 메시지가 나타나는지
   - `[AuthCallback] Session check error` 메시지가 나타나는지
   - `[supabase/client] Supabase 클라이언트 생성 시작` 메시지가 나타나는지

5. **Supabase 대시보드 확인**:
   - Authentication > Settings에서 리다이렉트 URL이 올바르게 설정되어 있는지
   - Site URL이 배포 환경 URL과 일치하는지

---

## 💡 예상되는 시나리오

### 시나리오 1: 네트워크 지연으로 인한 타임아웃
1. 사용자가 카카오 로그인 클릭
2. 카카오 OAuth 페이지로 리다이렉트
3. 카카오 로그인 완료
4. `/auth/callback?code=...`로 리다이렉트
5. Supabase가 세션을 처리하는 데 10초 이상 걸림
6. 타임아웃 발생 → 로그인 페이지로 리다이렉트
7. 사용자는 "session timeout" 오류를 보게 됨

### 시나리오 2: 환경 변수 문제
1. 배포 환경에서 `NEXT_PUBLIC_SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 설정되지 않음
2. Supabase 클라이언트가 제대로 초기화되지 않음
3. `getSession()` 호출이 실패
4. 타임아웃 발생

### 시나리오 3: OAuth 콜백 URL 불일치
1. 카카오 OAuth 설정에서 리다이렉트 URI가 로컬 환경 URL로만 설정됨
2. 배포 환경 URL이 허용되지 않음
3. 카카오가 리다이렉트를 거부하거나 다른 URL로 리다이렉트
4. 세션이 설정되지 않음
5. 타임아웃 발생

---

## 🎯 결론

**가장 가능성 높은 원인**:
1. **OAuth 콜백 타임아웃이 10초로 너무 짧음** - 배포 환경의 네트워크 지연으로 인해 10초 내에 세션이 설정되지 않음
2. **Supabase 클라이언트 설정** - `flowType: 'implicit'`와 `detectSessionInUrl: true` 설정이 배포 환경에서 제대로 작동하지 않을 수 있음
3. **환경 변수 설정** - 배포 환경에서 Supabase 환경 변수가 제대로 설정되지 않았을 수 있음

**권장 조치** (코드 수정 없이):
1. 배포 환경의 환경 변수 확인
2. 카카오 OAuth 리다이렉트 URI 설정 확인
3. Supabase 대시보드의 Site URL 및 리다이렉트 URL 설정 확인
4. 브라우저 콘솔 로그를 통해 정확한 오류 메시지 확인
5. 네트워크 탭에서 Supabase API 호출 응답 시간 확인
