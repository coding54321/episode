# 인증 시스템 전체 검토 및 보완점

## 📋 검토 일자
2024년 (현재)

## 🔍 검토 범위
- 로그인 처리 방식 및 구조
- 인증 상태 관리
- Supabase 스키마 및 RLS 정책
- 보안 취약점

---

## 🚨 주요 발견 사항

### 1. 인증 시스템 중복 및 혼재 (Critical)

**문제점:**
- 3개의 서로 다른 인증 컨텍스트가 존재:
  - `AuthProvider` (`lib/auth/auth-context.tsx`)
  - `SimpleAuthProvider` (`lib/auth/simple-auth.tsx`) - **현재 사용 중**
  - `ImprovedAuthProvider` (`lib/auth/improved-auth-context.tsx`)
- 3개의 서로 다른 로그인 페이지:
  - `app/login/page.tsx` - SimpleAuth 사용
  - `app/login/improved-page.tsx` - useAuthState 사용
  - `app/login/simple-page.tsx` - SimpleAuth 사용
- 2개의 서로 다른 콜백 페이지:
  - `app/auth/callback/page.tsx` - 복잡한 세션 체크 로직
  - `app/auth/simple-callback/page.tsx` - 간단한 세션 체크

**영향:**
- 코드 유지보수성 저하
- 일관성 없는 인증 처리
- 혼란스러운 개발 경험
- 잠재적 버그 발생 가능성

**권장 조치:**
1. 단일 인증 시스템으로 통합
2. 사용하지 않는 파일 제거 또는 명확한 마이그레이션 경로 제공
3. 문서화: 어떤 인증 시스템을 사용해야 하는지 명시

---

### 2. Middleware 보안 취약점 (High)

**현재 코드:**
```typescript
const hasAuthCookie = req.cookies.has('sb-auth-token') ||
                     req.cookies.has('supabase-auth-token') ||
                     req.cookies.get('sb-auth-token')?.value
```

**문제점:**
- 쿠키 존재 여부만 확인하고 실제 세션 유효성 검증 없음
- 쿠키 이름이 하드코딩되어 있고 실제 Supabase 쿠키 이름과 다를 수 있음
- Supabase는 실제로 `sb-<project-ref>-auth-token` 형식의 쿠키를 사용
- 만료된 세션이나 무효한 토큰도 통과할 수 있음

**권장 조치:**
1. 서버 사이드에서 실제 세션 검증 수행
2. Supabase 서버 클라이언트 사용하여 `getUser()` 호출
3. 쿠키 이름을 환경 변수로 관리하거나 Supabase 클라이언트에서 자동 감지

---

### 3. Users 테이블 동기화 문제 (Medium)

**문제점:**
- `ensureUserInPublicTable` 함수가 여러 곳에서 호출되지만 일관성 없음
- `auth-service.ts`와 `supabase/auth.ts`에 중복된 로직 존재
- Supabase Auth 사용자와 `public.users` 테이블 간 동기화 타이밍 문제
- 트랜잭션 없이 사용자 생성/업데이트 수행

**영향:**
- 데이터 불일치 가능성
- 중복 사용자 생성 시도
- 에러 처리 복잡성 증가

**권장 조치:**
1. 단일 소스로 사용자 동기화 로직 통합
2. Database Trigger 사용 고려 (Supabase Auth Hook 또는 Database Trigger)
3. 트랜잭션 처리 또는 upsert 사용

---

### 4. RLS 정책 중복 및 개선 필요 (Medium)

**발견된 문제:**

#### users 테이블 정책 중복
- `Users can update own profile` (UPDATE)
- `Users can update their own record` (UPDATE)
- 두 정책이 동일한 작업에 대해 중복됨

#### shared_nodes 정책
- `Anyone can view shared nodes` - 모든 사용자가 조회 가능
- 공유 링크를 통한 접근은 별도 처리 필요하지만, 인증된 사용자도 모든 공유 노드 조회 가능

**권장 조치:**
1. 중복 정책 제거
2. shared_nodes 조회 정책 재검토 (공유 링크 기반 접근 고려)
3. 정책 문서화

---

### 5. 보안 권고사항 (High)

**Supabase Advisor 결과:**
- ⚠️ **Leaked Password Protection 비활성화됨**
  - HaveIBeenPwned.org 체크 비활성화
  - 유출된 비밀번호 사용 방지 기능 미활성화

**권장 조치:**
1. Supabase Dashboard에서 Leaked Password Protection 활성화
2. 비밀번호 강도 정책 설정 검토

---

### 6. 콜백 처리 방식 불일치 (Medium)

**문제점:**
- `auth/callback/page.tsx`: 복잡한 폴링 로직 (0.5초마다 최대 10회 체크)
- `auth/simple-callback/page.tsx`: 1초 지연 후 단일 체크
- 두 방식 모두 신뢰성 문제 가능성

**권장 조치:**
1. 단일 콜백 처리 방식으로 통합
2. Supabase의 `onAuthStateChange` 이벤트 활용
3. 에러 처리 개선

---

### 7. 세션 관리 복잡성 (Medium)

**문제점:**
- `SessionManager` 클래스가 있지만 모든 곳에서 사용되지 않음
- `SimpleAuthProvider`는 세션 관리 로직이 없음
- 토큰 갱신 로직이 일관되지 않음
- `auth-cache.ts`가 있지만 `SimpleAuthProvider`에서 사용되지 않음

**권장 조치:**
1. 세션 관리 로직 통합
2. 자동 토큰 갱신 일관성 확보
3. 캐싱 전략 통일

---

### 8. 에러 처리 불일치 (Low)

**문제점:**
- `improved-page.tsx`는 `AuthErrorHandler` 사용
- `page.tsx`는 간단한 문자열 에러 처리
- 에러 메시지 일관성 부족

**권장 조치:**
1. 통일된 에러 처리 시스템 사용
2. 사용자 친화적인 에러 메시지 표준화

---

### 9. TypeScript 타입 불일치 (Low)

**문제점:**
- `useAuthState`는 `User` 타입을 `any`로 사용
- `SimpleAuthProvider`는 Supabase의 `User` 타입 직접 사용
- 타입 변환 로직이 여러 곳에 분산

**권장 조치:**
1. 통일된 User 타입 정의
2. 타입 변환 로직 중앙화

---

### 10. 환경 변수 검증 부족 (Low)

**문제점:**
- `lib/supabase/client.ts`에서 환경 변수 누락 시 경고만 출력
- 런타임 에러 가능성

**권장 조치:**
1. 빌드 타임에 환경 변수 검증
2. 명확한 에러 메시지 제공

---

## 📊 우선순위별 개선 계획

### 🔴 Critical (즉시 조치)
1. **인증 시스템 통합**
   - 단일 인증 컨텍스트로 통합
   - 사용하지 않는 파일 제거 또는 명확한 마이그레이션 경로 제공

2. **Middleware 보안 강화**
   - 실제 세션 검증 구현
   - 쿠키 기반 체크 제거 또는 보완

### 🟡 High (단기 개선)
3. **보안 설정 활성화**
   - Leaked Password Protection 활성화
   - 비밀번호 정책 검토

4. **Users 테이블 동기화 개선**
   - 단일 소스로 통합
   - Database Trigger 고려

5. **RLS 정책 정리**
   - 중복 정책 제거
   - 정책 문서화

### 🟢 Medium (중기 개선)
6. **콜백 처리 통합**
   - 단일 콜백 처리 방식
   - 에러 처리 개선

7. **세션 관리 통합**
   - 일관된 세션 관리
   - 자동 토큰 갱신

### ⚪ Low (장기 개선)
8. **에러 처리 표준화**
9. **TypeScript 타입 개선**
10. **환경 변수 검증 강화**

---

## 🔧 구체적 개선 제안

### 1. 통합 인증 컨텍스트 구조

```typescript
// lib/auth/unified-auth-context.tsx
// - SimpleAuthProvider의 간단함
// - ImprovedAuthProvider의 기능성
// - SessionManager 통합
// - 에러 처리 통합
```

### 2. Middleware 개선

```typescript
// middleware.ts
// - 서버 사이드 세션 검증
// - Supabase 서버 클라이언트 사용
// - 명확한 에러 처리
```

### 3. Database Trigger 추가

```sql
-- Supabase Auth 사용자 생성 시 자동으로 public.users에 등록
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, provider, provider_user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. RLS 정책 정리

```sql
-- 중복 정책 제거
DROP POLICY IF EXISTS "Users can update their own record" ON users;
-- "Users can update own profile" 정책만 유지
```

---

## 📝 체크리스트

### 즉시 조치
- [ ] 인증 시스템 통합 계획 수립
- [ ] Middleware 보안 강화
- [ ] Leaked Password Protection 활성화

### 단기 조치 (1-2주)
- [ ] Users 테이블 동기화 개선
- [ ] RLS 정책 정리
- [ ] 콜백 처리 통합

### 중기 조치 (1개월)
- [ ] 세션 관리 통합
- [ ] 에러 처리 표준화
- [ ] TypeScript 타입 개선

### 장기 조치 (2-3개월)
- [ ] 문서화 개선
- [ ] 테스트 코드 추가
- [ ] 모니터링 및 로깅 개선

---

## 📚 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware 가이드](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

## 💡 추가 권장사항

1. **모니터링**
   - 인증 실패 로그 수집
   - 세션 만료 추적
   - 사용자 등록 실패 모니터링

2. **테스트**
   - 인증 플로우 통합 테스트
   - 세션 갱신 테스트
   - 에러 케이스 테스트

3. **문서화**
   - 인증 아키텍처 다이어그램
   - 개발자 가이드
   - 트러블슈팅 가이드
