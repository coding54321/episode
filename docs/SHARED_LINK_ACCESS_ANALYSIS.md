# 공유 링크 접근 권한 분석

## 현재 동작 방식

### 1. 로그인하지 않은 사용자 (익명 사용자)

**접근 가능 여부:**
- ✅ **공유 링크 접근 가능**
- ✅ **노드 조회 가능** (읽기 전용)
- ❌ **편집 불가능** (노드 추가/수정/삭제 불가)

**코드 확인:**

```typescript
// app/share/[nodeId]/page.tsx:117-134
useEffect(() => {
  // 인증 로딩이 완료되었고 공유 데이터가 있으면
  // user가 있으면 편집 가능, 없으면 읽기 전용
  setIsReadOnly(!user);
}, [user, authLoading, sharedData]);
```

**RLS 정책:**
```sql
-- shared_nodes 테이블
"Anyone can view shared nodes" (SELECT)
USING: true  -- 누구나 조회 가능
```

**미들웨어:**
```typescript
// middleware.ts:16-24
const shareRoutePattern = /^\/share\/[^/]+$/

// 공유 페이지는 인증 체크 제외
if (shareRoutePattern.test(pathname)) {
  return NextResponse.next()
}
```

**UI 표시:**
- 읽기 전용 오버레이 표시
- "로그인하여 편집하기" 버튼 표시
- 노드 조회, 줌/팬 가능
- 편집 기능 비활성화

### 2. 로그인한 사용자

**접근 가능 여부:**
- ✅ **공유 링크 접근 가능**
- ✅ **노드 조회 가능**
- ✅ **편집 가능** (노드 추가/수정/삭제 가능)

**코드 확인:**

```typescript
// app/share/[nodeId]/page.tsx:133
setIsReadOnly(!user);  // user가 있으면 false (편집 가능)
```

**RLS 정책:**
```sql
-- nodes 테이블
"Users can read their own project nodes" (SELECT)
USING: (
  is_project_owner(project_id)
  OR
  id IN (SELECT node_id FROM shared_nodes)
  OR
  parent_id IN (SELECT node_id FROM shared_nodes)
)

-- nodes 테이블
"Users can insert nodes" (INSERT)
WITH CHECK: (
  is_project_owner(project_id)
  OR
  (
    auth.uid() IS NOT NULL
    AND parent_id IN (SELECT node_id FROM shared_nodes)
  )
)
```

**UI 표시:**
- 읽기 전용 오버레이 제거
- 편집 모드 활성화
- 노드 CRUD 가능
- 실시간 협업 가능 (YJS)

### 3. 다른 브라우저에서 접근

**동작:**
- 로그인하지 않은 상태: 읽기 전용 (위 1번과 동일)
- 로그인한 상태: 편집 가능 (위 2번과 동일)

**세션 관리:**
- Supabase는 localStorage를 사용하여 세션 관리
- 브라우저별로 독립적인 세션
- 다른 브라우저 = 다른 세션

## 접근 흐름도

### 시나리오 1: 로그인하지 않은 사용자

```
사용자 → 공유 링크 클릭
  ↓
middleware.ts: 공유 페이지는 인증 체크 제외 → 통과
  ↓
SharePage 컴포넌트 로드
  ↓
getSharedNodeByNodeId() 호출
  ↓
RLS 정책: "Anyone can view shared nodes" → 조회 성공
  ↓
user = null → isReadOnly = true
  ↓
UI: 읽기 전용 모드 표시
  - 노드 조회 가능 ✅
  - 편집 불가 ❌
  - "로그인하여 편집하기" 버튼 표시
```

### 시나리오 2: 로그인한 사용자

```
사용자 → 공유 링크 클릭
  ↓
middleware.ts: 공유 페이지는 인증 체크 제외 → 통과
  ↓
SharePage 컴포넌트 로드
  ↓
getSharedNodeByNodeId() 호출
  ↓
RLS 정책: "Anyone can view shared nodes" → 조회 성공
  ↓
useUnifiedAuth() → user 존재
  ↓
user 존재 → isReadOnly = false
  ↓
UI: 편집 모드 활성화
  - 노드 조회 가능 ✅
  - 편집 가능 ✅
  - 노드 CRUD 가능 ✅
```

### 시나리오 3: 다른 브라우저 (로그인 안 함)

```
사용자 → 다른 브라우저에서 공유 링크 접근
  ↓
localStorage에 세션 없음
  ↓
useUnifiedAuth() → user = null
  ↓
isReadOnly = true
  ↓
시나리오 1과 동일 (읽기 전용)
```

### 시나리오 4: 다른 브라우저 (로그인 함)

```
사용자 → 다른 브라우저에서 공유 링크 접근
  ↓
해당 브라우저에서 로그인
  ↓
localStorage에 세션 저장
  ↓
useUnifiedAuth() → user 존재
  ↓
isReadOnly = false
  ↓
시나리오 2와 동일 (편집 가능)
```

## 보안 고려사항

### 현재 보안 상태

**✅ 안전한 부분:**
1. **읽기 전용 모드**: 로그인하지 않은 사용자는 편집 불가
2. **RLS 정책**: 공유 노드는 조회만 가능하도록 설정
3. **인증 체크**: 편집 시 인증 상태 확인

**⚠️ 주의할 부분:**
1. **공유 링크 노출**: 링크를 아는 사람은 누구나 조회 가능
2. **링크 추측**: nodeId를 추측하면 다른 공유 노드도 접근 가능할 수 있음
3. **만료 정책 없음**: 공유 링크에 만료 시간이 없음

### 개선 제안

1. **공유 링크 토큰화**: nodeId 대신 랜덤 토큰 사용
2. **만료 시간 추가**: 공유 링크에 만료 시간 설정
3. **비밀번호 보호**: 공유 링크에 비밀번호 추가 옵션
4. **접근 로그**: 누가 언제 접근했는지 기록

## 결론

### 현재 동작 요약

| 상황 | 접근 가능 | 조회 가능 | 편집 가능 |
|------|----------|----------|----------|
| 로그인 안 함 (같은 브라우저) | ✅ | ✅ | ❌ |
| 로그인 안 함 (다른 브라우저) | ✅ | ✅ | ❌ |
| 로그인 함 (같은 브라우저) | ✅ | ✅ | ✅ |
| 로그인 함 (다른 브라우저) | ✅ | ✅ | ✅ |

### 핵심 포인트

1. **공유 링크는 누구나 접근 가능** (인증 불필요)
2. **조회는 누구나 가능** (RLS 정책: "Anyone can view shared nodes")
3. **편집은 로그인한 사용자만 가능** (`isReadOnly = !user`)
4. **브라우저와 관계없이 동일하게 작동** (세션은 브라우저별로 독립적)
