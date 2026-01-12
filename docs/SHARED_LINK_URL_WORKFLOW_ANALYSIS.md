# 공유 링크 URL 작동 방식 분석

## URL 구조

```
/share/[nodeId]
```

- **경로**: `/share/[nodeId]`
- **nodeId**: 공유된 노드의 고유 ID (UUID 형식으로 추정)
- **예시**: `/share/node_1234567890_abc123def`

## 전체 플로우

### 1. URL 접근

```
사용자 → /share/[nodeId] 접근
  ↓
Next.js 라우팅
  ↓
app/share/[nodeId]/page.tsx 렌더링
  ↓
useParams()로 nodeId 추출
```

**코드:**
```typescript
// app/share/[nodeId]/page.tsx:19-21
const params = useParams();
const nodeId = params.nodeId as string;
```

### 2. nodeId 검증

**1단계: 클라이언트 사이드 검증 (SharePage)**

```typescript
// app/share/[nodeId]/page.tsx:37-44
if (!nodeId || typeof nodeId !== 'string' || nodeId.trim().length === 0) {
  setIsLoading(false);
  setSharedData(null);
  return;
}
```

**검증 내용:**
- ✅ null/undefined 체크
- ✅ 문자열 타입 체크
- ✅ 빈 문자열 체크 (trim 후)

**2단계: 서버 사이드 검증 (getSharedNodeByNodeId)**

```typescript
// lib/supabase/data.ts:1540-1544
if (!nodeId || typeof nodeId !== 'string' || nodeId.trim().length === 0) {
  console.warn('[data.ts] getSharedNodeByNodeId: 유효하지 않은 nodeId', { nodeId });
  return null;
}
```

**검증 내용:**
- ✅ 동일한 검증 (중복)
- ❌ UUID 형식 검증 없음
- ❌ SQL injection 방지 (Supabase가 자동 처리)

### 3. 데이터 로드 과정

#### 단계 1: shared_nodes 테이블 조회

```typescript
// lib/supabase/data.ts:1554-1560
const result = await supabase
  .from('shared_nodes')
  .select('*')
  .eq('node_id', trimmedNodeId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

**RLS 정책:**
```sql
"Anyone can view shared nodes" (SELECT)
USING: true  -- 누구나 조회 가능
```

**동작:**
- `node_id`로 공유 노드 찾기
- 최신 공유 노드 1개만 반환 (같은 node_id가 여러 개일 경우)
- 데이터 없으면 `null` 반환

#### 단계 2: nodes 테이블 조회

```typescript
// lib/supabase/data.ts:1608-1612
const result = await supabase
  .from('nodes')
  .select('*')
  .eq('id', data.node_id)
  .single();
```

**RLS 정책:**
```sql
"Users can read their own project nodes" (SELECT)
USING: (
  is_project_owner(project_id)
  OR
  id IN (SELECT node_id FROM shared_nodes)
  OR
  parent_id IN (SELECT node_id FROM shared_nodes)
)
```

**동작:**
- 공유 노드의 실제 노드 데이터 조회
- RLS 정책으로 공유된 노드만 조회 가능
- 데이터 없으면 `null` 반환

#### 단계 3: projects 테이블 검증

```typescript
// lib/supabase/data.ts:1652-1656
const result = await supabase
  .from('projects')
  .select('id')
  .eq('id', nodeData.project_id)
  .single();
```

**동작:**
- 프로젝트 존재 여부만 확인
- 프로젝트가 삭제되었을 경우 대비
- 데이터 없으면 `null` 반환

#### 단계 4: 프로젝트의 모든 노드 조회 (descendants 계산)

```typescript
// lib/supabase/data.ts:1711-1714
const result = await supabase
  .from('nodes')
  .select('*')
  .eq('project_id', data.project_id);
```

**동작:**
- 프로젝트의 모든 노드를 가져와서 하위 노드 계산
- 재귀적으로 descendants 찾기
- 실패해도 공유 노드만 반환 (graceful degradation)

#### 단계 5: STAR 에셋 조회 (선택적)

```typescript
// lib/supabase/data.ts:1835-1838
const result = await supabase
  .from('star_assets')
  .select('*')
  .in('node_id', allNodeIds);
```

**동작:**
- 공유 노드와 하위 노드들의 STAR 에셋 조회
- 재시도 로직 포함 (최대 2회)
- 실패해도 계속 진행

#### 단계 6: 사용자 정보 조회 (선택적)

```typescript
// lib/supabase/data.ts:1899-1903
const result = await supabase
  .from('users')
  .select('id, name, email')
  .eq('id', data.created_by)
  .maybeSingle();
```

**동작:**
- 공유한 사용자 정보 조회
- 재시도 로직 포함 (최대 2회)
- 실패해도 계속 진행

### 4. 에러 처리

#### AbortError 처리

```typescript
// 여러 곳에서 AbortError 처리
if (err instanceof Error && err.name === 'AbortError') {
  console.log('AbortError 무시 (정상적인 중단)');
  return null;
}
```

**발생 시나리오:**
- 컴포넌트 언마운트
- 네트워크 요청 취소
- 페이지 이동

**처리 방식:**
- 조용히 무시하고 `null` 반환
- 정상적인 중단으로 간주

#### 일반 에러 처리

```typescript
// lib/supabase/data.ts:1572-1591
if (error) {
  if (error.code === 'PGRST116') {
    // 찾을 수 없음 (정상적인 경우)
    return null;
  }
  // 다른 에러는 로깅하고 null 반환
  console.error('에러 발생', { error });
  return null;
}
```

**에러 코드:**
- `PGRST116`: 데이터 없음 (정상)
- 기타: 실제 에러 (로깅 후 null 반환)

### 5. UI 상태 관리

```typescript
// app/share/[nodeId]/page.tsx:33-115
useEffect(() => {
  const loadData = async () => {
    // nodeId 검증
    if (!nodeId || ...) {
      setSharedData(null);
      return;
    }
    
    // 데이터 로드
    const data = await getSharedNodeByNodeId(trimmedNodeId);
    
    if (!data) {
      setSharedData(null);
      return;
    }
    
    // 상태 업데이트
    setSharedData(data);
    setNodes(allNodes);
    setIsReadOnly(true);
  };
  
  loadData();
}, [nodeId]);
```

**상태 흐름:**
1. `isLoading = true` (초기)
2. 데이터 로드 중
3. 성공: `sharedData` 설정, `isLoading = false`
4. 실패: `sharedData = null`, `isLoading = false`

## 문제점 분석

### 1. nodeId 형식 검증 부족

**현재:**
```typescript
// 빈 문자열만 체크
if (!nodeId || typeof nodeId !== 'string' || nodeId.trim().length === 0) {
  return null;
}
```

**문제:**
- UUID 형식 검증 없음
- 잘못된 형식의 nodeId도 DB 쿼리 실행
- 불필요한 DB 부하

**개선 방안:**
```typescript
// UUID 형식 검증 추가
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(trimmedNodeId)) {
  return null;
}
```

### 2. 순차적 쿼리 실행 (성능 문제)

**현재:**
```
shared_nodes 조회 → nodes 조회 → projects 조회 → 
프로젝트 노드 조회 → STAR 에셋 조회 → 사용자 조회
```

**문제:**
- 6단계 순차 실행
- 총 대기 시간 = 각 단계 시간의 합
- 느린 응답 시간

**개선 방안:**
```typescript
// 병렬 실행 가능한 쿼리들
const [sharedNode, projectNodes] = await Promise.all([
  supabase.from('shared_nodes').select('*').eq('node_id', nodeId).maybeSingle(),
  supabase.from('nodes').select('*').eq('project_id', projectId)
]);
```

### 3. 재시도 로직의 복잡성

**현재:**
- STAR 에셋 조회: 최대 2회 재시도
- 사용자 정보 조회: 최대 2회 재시도
- 각각 다른 재시도 로직

**문제:**
- 코드 중복
- 일관성 부족
- 유지보수 어려움

**개선 방안:**
```typescript
// 공통 재시도 함수
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T | null> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await fn();
      if (result !== undefined) return result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
          continue;
        }
      }
      return null;
    }
  }
  return null;
}
```

### 4. 보안 고려사항

**현재 보안:**
- ✅ SQL injection 방지 (Supabase 자동 처리)
- ✅ RLS 정책으로 접근 제어
- ❌ nodeId 추측 공격 가능

**문제:**
- nodeId를 추측하면 다른 공유 노드 접근 가능
- UUID이지만 완전히 랜덤하지 않을 수 있음

**개선 방안:**
1. **공유 토큰 사용**: nodeId 대신 랜덤 토큰 사용
2. **만료 시간 추가**: 공유 링크에 만료 시간 설정
3. **접근 로그**: 누가 언제 접근했는지 기록

### 5. 에러 메시지 노출

**현재:**
```typescript
// 콘솔에만 로깅
console.error('에러 발생', { error });
return null;
```

**문제:**
- 사용자에게 명확한 에러 메시지 없음
- 디버깅은 가능하지만 UX 저하

**개선 방안:**
```typescript
// 에러 타입별 메시지
if (error.code === 'PGRST116') {
  // "공유 링크를 찾을 수 없습니다"
} else if (error.code === '42P01') {
  // "서버 오류가 발생했습니다"
} else {
  // "알 수 없는 오류가 발생했습니다"
}
```

## 정상 작동 확인

### ✅ 정상 작동하는 부분

1. **URL 라우팅**: Next.js 동적 라우팅 정상 작동
2. **nodeId 추출**: `useParams()`로 정상 추출
3. **기본 검증**: 빈 문자열 체크 정상 작동
4. **데이터 로드**: 단계별 데이터 로드 정상 작동
5. **RLS 정책**: 공유 노드 조회 정상 작동
6. **에러 처리**: AbortError 처리 정상 작동
7. **UI 상태**: 로딩/에러 상태 정상 표시

### ⚠️ 개선이 필요한 부분

1. **nodeId 형식 검증**: UUID 형식 검증 추가 필요
2. **성능 최적화**: 순차 쿼리를 병렬로 변경
3. **재시도 로직**: 공통 함수로 리팩토링
4. **보안 강화**: 공유 토큰 사용 고려
5. **에러 메시지**: 사용자 친화적 메시지 추가

## 결론

### 현재 상태

**정상 작동:**
- ✅ 기본적인 공유 링크 접근 및 데이터 로드
- ✅ 에러 처리 및 상태 관리
- ✅ RLS 정책을 통한 접근 제어

**개선 필요:**
- ⚠️ nodeId 형식 검증 부족
- ⚠️ 성능 최적화 필요 (순차 → 병렬)
- ⚠️ 보안 강화 필요 (토큰화, 만료 시간)
- ⚠️ 에러 메시지 개선 필요

### 권장 사항

1. **즉시 개선**: nodeId 형식 검증 추가
2. **성능 개선**: 병렬 쿼리 실행
3. **보안 강화**: 공유 토큰 도입 검토
4. **UX 개선**: 에러 메시지 개선
