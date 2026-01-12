# 공유 링크에서 프로젝트 조회 실패 문제 분석

## 문제 현상

다른 브라우저에서 공유 링크를 복붙하면 공유 페이지가 조회되지 않습니다.

**에러 로그:**
```
[Log] [data.ts] getSharedNodeByNodeId: 시작 – {nodeId: "badge_intern_0"}
[Log] [data.ts] getSharedNodeByNodeId: 공유 노드 발견 – {nodeId: "badge_intern_0", projectId: "5094c78e-edfe-4c85-8281-486d0019e957"}
[Error] Failed to load resource: the server responded with a status of 406 () (projects, line 0)
[Warning] [data.ts] getSharedNodeByNodeId: 프로젝트를 찾을 수 없음 – {projectId: "5094c78e-edfe-4c85-8281-486d0019e957", nodeId: "badge_intern_0"}
```

## 원인 분석

### 핵심 문제: `projects` 테이블의 RLS 정책

**현재 `projects` 테이블의 SELECT 정책:**
```sql
"Users can read their own projects" (SELECT)
USING: (user_id = auth.uid())
```

**문제점:**
1. **로그인하지 않은 사용자는 프로젝트 조회 불가**
   - `auth.uid()`가 `null`이면 `user_id = auth.uid()` 조건이 항상 `false`
   - 공유 링크를 다른 브라우저에서 열면 로그인하지 않은 상태일 수 있음
   - 프로젝트 존재 여부 확인만 필요한데도 RLS 정책에 의해 차단됨

2. **406 에러 (Not Acceptable)**
   - RLS 정책 위반 시 Supabase가 406 에러 반환
   - 프로젝트 조회가 실패하여 공유 노드 로드 실패

### 데이터 로드 플로우

```
1. shared_nodes 조회 ✅
   - RLS: "Anyone can view shared nodes" (USING: true)
   - 성공: 공유 노드 발견

2. nodes 조회 ✅
   - RLS: "Users can read their own project nodes"
   - USING: (
       is_project_owner(project_id)
       OR
       id IN (SELECT node_id FROM shared_nodes)
       OR
       parent_id IN (SELECT node_id FROM shared_nodes)
     )
   - 공유된 노드는 조회 가능 → 성공

3. projects 조회 ❌
   - RLS: "Users can read their own projects"
   - USING: (user_id = auth.uid())
   - 로그인하지 않은 사용자는 auth.uid() = null
   - user_id = null 조건이 false → 조회 실패 (406 에러)
```

### 왜 프로젝트 조회가 필요한가?

**코드 확인:**
```typescript
// lib/supabase/data.ts:1677-1681
supabase
  .from('projects')
  .select('id')
  .eq('id', data.project_id)
  .single()
```

**목적:**
- 프로젝트가 실제로 존재하는지 검증
- 삭제된 프로젝트의 공유 노드는 표시하지 않기 위함

**문제:**
- 프로젝트 존재 여부만 확인하면 되는데
- RLS 정책 때문에 로그인하지 않은 사용자는 조회 불가

## 해결 방안

### 방안 1: projects SELECT 정책에 공유 노드 프로젝트 조회 허용 (권장)

**정책 수정:**
```sql
DROP POLICY IF EXISTS "Users can read their own projects" ON projects;

CREATE POLICY "Users can read their own projects"
ON projects FOR SELECT
USING (
  -- 자신의 프로젝트 조회 가능
  user_id = auth.uid()
  OR
  -- 공유된 노드의 프로젝트도 조회 가능 (존재 여부 확인용)
  id IN (
    SELECT DISTINCT project_id 
    FROM shared_nodes
  )
);
```

**장점:**
- 로그인하지 않은 사용자도 공유 노드의 프로젝트 조회 가능
- 보안: 공유된 노드의 프로젝트만 조회 가능 (다른 프로젝트는 여전히 차단)
- 간단하고 명확함

**단점:**
- 공유된 노드가 있는 프로젝트는 누구나 조회 가능 (하지만 ID만 조회하므로 문제 없음)

### 방안 2: SECURITY DEFINER 함수 사용

**함수 생성:**
```sql
CREATE OR REPLACE FUNCTION is_project_exists(project_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param
  );
$$;
```

**코드 수정:**
```typescript
// lib/supabase/data.ts
const projectExists = await is_project_exists(data.project_id);
if (!projectExists) {
  return null;
}
```

**장점:**
- RLS 정책을 완전히 우회
- 프로젝트 존재 여부만 확인 (보안 강화)

**단점:**
- 함수 생성 필요
- 코드 수정 필요

### 방안 3: 프로젝트 조회 제거 (간단하지만 권장하지 않음)

**코드 수정:**
```typescript
// 프로젝트 존재 여부 검증 제거
// 삭제된 프로젝트의 공유 노드도 표시됨
```

**장점:**
- 간단함
- RLS 정책 수정 불필요

**단점:**
- 삭제된 프로젝트의 공유 노드도 표시됨
- 데이터 일관성 문제

## 권장 해결책

**방안 1 (정책 수정)**을 권장합니다:

1. **보안**: 공유된 노드의 프로젝트만 조회 가능
2. **간단함**: 정책만 수정하면 됨
3. **명확함**: 의도가 명확함

## 추가 고려사항

### 현재 상황

- **shared_nodes**: 누구나 조회 가능 ✅
- **nodes**: 공유된 노드는 누구나 조회 가능 ✅
- **projects**: 자신의 프로젝트만 조회 가능 ❌ (공유 노드의 프로젝트는 조회 불가)

### 보안 영향

**방안 1 적용 시:**
- 공유된 노드가 있는 프로젝트의 ID만 조회 가능
- 프로젝트의 다른 정보(이름, 설명 등)는 조회 불가 (SELECT 'id'만)
- 보안 문제 없음

## 결론

**핵심 문제:**
- `projects` 테이블의 SELECT 정책이 로그인하지 않은 사용자를 차단
- 공유 링크 접근 시 프로젝트 존재 여부 확인이 필요하지만 RLS 정책에 의해 차단됨

**해결 방법:**
- `projects` SELECT 정책에 공유된 노드의 프로젝트 조회 허용 추가
- 공유된 노드가 있는 프로젝트의 ID만 조회 가능하도록 제한
