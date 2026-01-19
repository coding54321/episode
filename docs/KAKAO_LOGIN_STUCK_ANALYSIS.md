# 카카오 로그인 후 '로그인 처리 중...' 멈춤 원인 분석

## 🔍 문제 상황
카카오 로그인 후 `/auth/callback` 페이지에서 '로그인 처리 중...' 화면에서 멈춰서 다음 페이지로 이동하지 않음.

---

## ⚠️ 발견된 주요 문제점

### 1. **onAuthStateChange 이벤트가 발생하지 않을 수 있음** 🔴 **가장 가능성 높음**

**위치**: `app/auth/callback/page.tsx` (33-72번째 줄)

**문제점**:
- `onAuthStateChange` 이벤트는 **세션 상태가 변경될 때**만 발생합니다.
- Supabase가 URL에서 세션을 자동으로 처리하는 경우 (`detectSessionInUrl: true`), 페이지 로드 시점에 이미 세션이 설정되어 있어 `SIGNED_IN` 이벤트가 발생하지 않을 수 있습니다.
- 특히 `flowType: 'pkce'`를 사용하는 경우, Supabase가 URL의 `code` 파라미터를 자동으로 처리하여 세션을 설정하므로, 이벤트가 발생하기 전에 이미 세션이 존재할 수 있습니다.

**코드 분석**:
```typescript
// 33번째 줄: onAuthStateChange 이벤트 리스너 등록
const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // 이 이벤트가 발생하지 않으면 여기 도달하지 못함
    }
  }
)

// 169번째 줄: 초기 세션 확인
await checkSessionWithRetry()
```

**시나리오**:
1. 사용자가 카카오 로그인 후 `/auth/callback?code=xxx&state=xxx`로 리다이렉트됨
2. Supabase 클라이언트가 URL의 `code`를 자동으로 감지하고 세션을 설정함
3. 이 시점에 이미 세션이 존재하므로 `SIGNED_IN` 이벤트가 발생하지 않음
4. `onAuthStateChange` 리스너는 등록되었지만 이벤트가 발생하지 않아 무한 대기
5. `checkSessionWithRetry()`에서 세션을 찾지만, `sessionFound` 플래그가 `false`로 유지되어 리다이렉트가 발생하지 않음

**영향도**: 🔴 **높음** (핵심 문제)

---

### 2. **checkSessionWithRetry에서 세션을 찾아도 리다이렉트가 안 됨**

**위치**: `app/auth/callback/page.tsx` (123-149번째 줄)

**문제점**:
- `checkSessionWithRetry()` 함수에서 세션을 찾았을 때 (123번째 줄), `sessionFound` 플래그를 `true`로 설정하고 리다이렉트를 수행합니다.
- 하지만 이 함수는 타임아웃 핸들러(76-92번째 줄)에서만 호출됩니다.
- 초기 호출(169번째 줄)에서는 세션을 찾아도 정상적으로 처리되지만, 만약 세션이 없으면 재시도 로직이 실행되지 않습니다.

**코드 분석**:
```typescript
// 123번째 줄: 세션을 찾았을 때
if (session?.user) {
  sessionFound = true
  clearTimeout(timeoutId)
  // 리다이렉트 수행
} else {
  // 세션이 없으면 아무것도 하지 않음 - 이벤트를 기다림
}
```

**영향도**: 🟡 **중간**

---

### 3. **타임아웃 설정이 30초로 너무 김**

**위치**: `app/auth/callback/page.tsx` (76번째 줄)

**문제점**:
- 타임아웃이 30초로 설정되어 있어, 사용자가 30초 동안 기다려야 에러를 볼 수 있습니다.
- 하지만 실제로는 세션이 이미 존재하는데 이벤트가 발생하지 않아 무한 대기하는 경우가 많습니다.

**영향도**: 🟡 **중간** (사용자 경험)

---

### 4. **초기 세션 확인 후 처리 로직 부재**

**위치**: `app/auth/callback/page.tsx` (168-169번째 줄)

**문제점**:
- `checkSessionWithRetry()`를 호출하지만, 이 함수는 세션을 찾지 못하면 아무것도 하지 않고 이벤트를 기다립니다.
- 하지만 세션이 이미 존재하는 경우, `checkSessionWithRetry()`에서 세션을 찾아도 `onAuthStateChange` 이벤트가 발생하지 않으면 리다이렉트가 발생하지 않습니다.

**코드 분석**:
```typescript
// 168번째 줄: 초기 세션 확인
await checkSessionWithRetry()

// checkSessionWithRetry 내부 (123번째 줄):
if (session?.user) {
  // 세션을 찾았을 때만 리다이렉트
  sessionFound = true
  // ...
} else {
  // 세션이 없으면 아무것도 하지 않음
  // onAuthStateChange 이벤트를 기다림
}
```

**영향도**: 🔴 **높음**

---

### 5. **onAuthStateChange와 getSession의 경쟁 조건**

**위치**: `app/auth/callback/page.tsx` (전체)

**문제점**:
- `onAuthStateChange` 이벤트 리스너와 `getSession()` 호출이 동시에 실행됩니다.
- 세션이 이미 존재하는 경우:
  - `getSession()`에서 세션을 찾아 리다이렉트 시도
  - 하지만 `onAuthStateChange` 이벤트는 발생하지 않음
  - 두 가지가 서로 다른 플래그(`sessionFound`)를 사용하므로 경쟁 조건 발생 가능

**영향도**: 🟡 **중간**

---

### 6. **Supabase 클라이언트 설정의 detectSessionInUrl**

**위치**: `lib/supabase/client.ts` (24번째 줄)

**문제점**:
- `detectSessionInUrl: true`로 설정되어 있어, Supabase가 URL에서 자동으로 세션을 처리합니다.
- 이 경우 페이지 로드 시점에 이미 세션이 설정되어 있어 `SIGNED_IN` 이벤트가 발생하지 않을 수 있습니다.

**영향도**: 🟡 **중간**

---

## 🔍 디버깅을 위한 확인 사항

### 브라우저 콘솔에서 확인할 로그:

1. **세션이 이미 존재하는 경우**:
   ```
   [AuthCallback] Session found: <user-id>
   ```
   - 이 로그가 나타나면 세션은 찾았지만 리다이렉트가 안 되는 것

2. **이벤트가 발생하지 않는 경우**:
   - `[AuthCallback] Login successful:` 로그가 나타나지 않음
   - `onAuthStateChange` 이벤트가 발생하지 않음

3. **타임아웃 발생**:
   ```
   [AuthCallback] Timeout waiting for session
   ```
   - 30초 후에 이 로그가 나타남

### Network 탭에서 확인:

1. **Supabase API 호출**:
   - `/auth/v1/token` 엔드포인트 호출 여부
   - 응답 상태 코드 (200이면 성공)

2. **localStorage 확인**:
   - `sb-auth-token` 키에 세션 정보가 저장되어 있는지 확인
   - 개발자 도구 > Application > Local Storage에서 확인

---

## 📊 원인 우선순위

1. **🔴 높음**: `onAuthStateChange` 이벤트가 발생하지 않아 세션을 찾아도 리다이렉트가 안 됨
2. **🔴 높음**: 초기 세션 확인 후 처리 로직 부재
3. **🟡 중간**: `checkSessionWithRetry`에서 세션을 찾아도 리다이렉트가 안 되는 경우
4. **🟡 중간**: 타임아웃 설정이 너무 김 (30초)
5. **🟡 중간**: `onAuthStateChange`와 `getSession`의 경쟁 조건

---

## 💡 해결 방안 (참고용)

### 방안 1: 초기 세션 확인을 우선 처리
- `checkSessionWithRetry()`에서 세션을 찾으면 즉시 리다이렉트
- `onAuthStateChange`는 백업으로만 사용

### 방안 2: 세션 확인 로직 단순화
- `onAuthStateChange` 이벤트만 사용
- 초기 `getSession()` 호출 제거
- 타임아웃을 15초로 단축

### 방안 3: 폴링 방식 사용
- 일정 간격으로 `getSession()` 호출
- 세션을 찾으면 즉시 리다이렉트
- 최대 재시도 횟수 제한

### 방안 4: Supabase의 `getSession()`을 즉시 호출
- 페이지 로드 시 즉시 `getSession()` 호출
- 세션이 있으면 바로 리다이렉트
- 없으면 `onAuthStateChange` 이벤트 대기

---

## 🎯 권장 해결 방법

**가장 확실한 방법**: 초기 세션 확인을 우선 처리하고, 세션을 찾으면 즉시 리다이렉트하는 방식

1. 페이지 로드 시 즉시 `getSession()` 호출
2. 세션이 있으면 바로 리다이렉트 (온보딩 체크 포함)
3. 세션이 없으면 `onAuthStateChange` 이벤트 대기
4. 타임아웃을 15초로 단축

이렇게 하면 Supabase가 URL에서 자동으로 세션을 처리한 경우에도 즉시 리다이렉트할 수 있습니다.
