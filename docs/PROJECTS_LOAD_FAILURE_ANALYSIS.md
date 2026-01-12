# 프로젝트 로드 실패 문제 분석

## 문제 현상

RLS 정책을 `nodes` 테이블에 설정한 후, 갑자기 마인드맵 프로젝트 목록을 불러오지 못하는 문제가 발생했습니다.

**에러 메시지:**
```
Failed to get projects: {}
at getProjects (lib/supabase/data.ts:47:13)
```

## 원인 분석

### 핵심 문제: `projects` 테이블의 RLS 정책 부재

`getProjects` 함수는 다음과 같이 동작합니다:

```typescript
// lib/supabase/data.ts:12-24
export async function getProjects(userId: string): Promise<MindMapProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      nodes(count)
    `)
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('updated_at', { ascending: false });
}
```

**문제점:**

1. **`projects` 테이블 조회**
   - `from('projects')`로 프로젝트 데이터를 조회
   - `projects` 테이블에 RLS가 활성화되어 있지만 SELECT 정책이 없으면 조회 실패

2. **`nodes(count)` 조인 쿼리**
   - `nodes(count)`는 `nodes` 테이블과 조인하여 노드 개수를 계산
   - `nodes` 테이블의 RLS 정책이 이 조인 쿼리에서 제대로 작동하지 않을 수 있음

### 가능한 시나리오

#### 시나리오 1: `projects` 테이블에 RLS가 활성화되어 있지만 정책이 없음

**증상:**
- `nodes` 테이블에만 RLS 정책을 설정했지만
- `projects` 테이블에도 RLS가 활성화되어 있을 수 있음
- RLS가 활성화되어 있으면 정책이 없으면 모든 접근이 차단됨

**확인 방법:**
```sql
-- projects 테이블의 RLS 상태 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'projects';

-- projects 테이블의 RLS 정책 확인
SELECT * FROM pg_policies 
WHERE tablename = 'projects';
```

#### 시나리오 2: `nodes(count)` 조인 시 RLS 정책 위반

**증상:**
- `projects` 테이블 조회는 성공하지만
- `nodes(count)` 조인 시 `nodes` 테이블의 RLS 정책이 적용되어
- 노드 개수를 계산하지 못함

**원인:**
- `nodes` 테이블의 SELECT 정책이 조인 쿼리에서 제대로 작동하지 않음
- 또는 `nodes` 테이블의 RLS 정책이 너무 제한적임

#### 시나리오 3: `user_id` 타입 불일치로 인한 정책 실패

**증상:**
- `projects.user_id`와 `auth.uid()`의 타입이 맞지 않아
- RLS 정책이 제대로 작동하지 않음

**확인 방법:**
```sql
-- projects 테이블의 user_id 타입 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'user_id';
```

## 코드 분석

### `getProjects` 함수의 쿼리 구조

```typescript
supabase
  .from('projects')           // 1. projects 테이블 조회
  .select(`
    *,
    nodes(count)              // 2. nodes 테이블과 조인하여 개수 계산
  `)
  .eq('user_id', userId)     // 3. user_id로 필터링
```

**RLS 정책이 필요한 곳:**

1. **`projects` 테이블 SELECT**
   - 사용자가 자신의 프로젝트를 조회할 수 있어야 함
   - RLS 정책: `user_id = auth.uid()::text` 또는 `user_id::uuid = auth.uid()`

2. **`nodes` 테이블 SELECT (조인)**
   - 프로젝트의 노드 개수를 계산하기 위해 필요
   - RLS 정책: 프로젝트 소유자는 자신의 프로젝트 노드를 조회할 수 있어야 함

### 에러 객체가 비어있는 이유

```typescript
catch (error) {
  console.error('Failed to get projects:', error); // {}
  return [];
}
```

**가능한 원인:**
- RLS 정책 위반 시 Supabase가 에러 객체를 제대로 전달하지 않음
- 또는 에러 객체의 직렬화 문제
- 네트워크 레벨에서 차단되어 에러 정보가 손실됨

## 해결 방안 (제안)

### 1. `projects` 테이블에 SELECT 정책 추가

```sql
-- projects 테이블의 SELECT 정책
CREATE POLICY "Users can read their own projects"
ON projects FOR SELECT
USING (
  user_id::uuid = auth.uid()
  OR
  user_id = auth.uid()::text
);
```

**주의:** `user_id`의 타입에 따라 캐스팅 방향이 달라질 수 있음

### 2. `nodes` 테이블의 SELECT 정책 확인 및 수정

현재 설정한 `nodes` 테이블의 SELECT 정책이 조인 쿼리에서도 작동하는지 확인:

```sql
-- 현재 nodes SELECT 정책 확인
SELECT * FROM pg_policies 
WHERE tablename = 'nodes' AND cmd = 'SELECT';
```

조인 쿼리에서도 작동하도록 정책 수정 필요할 수 있음

### 3. RLS 비활성화 (임시 해결책, 권장하지 않음)

```sql
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE nodes DISABLE ROW LEVEL SECURITY;
```

**주의:** 보안상 권장하지 않음. 프로덕션 환경에서는 사용하지 말 것

## 확인 사항

### 1. `projects` 테이블의 RLS 상태 확인

Supabase 대시보드에서:
- Table Editor → `projects` 테이블 → RLS 탭
- RLS가 활성화되어 있는지 확인
- SELECT 정책이 있는지 확인

### 2. `nodes` 테이블의 SELECT 정책 확인

- Table Editor → `nodes` 테이블 → RLS 탭
- SELECT 정책이 올바르게 설정되어 있는지 확인
- 특히 프로젝트 소유자가 자신의 프로젝트 노드를 조회할 수 있는지 확인

### 3. 브라우저 개발자 도구 확인

- Network 탭에서 Supabase API 요청 확인
- 응답 상태 코드 확인 (403 Forbidden인지 확인)
- 응답 본문에서 에러 메시지 확인

## 예상되는 해결 방법

가장 가능성 높은 원인: **`projects` 테이블에 RLS가 활성화되어 있지만 SELECT 정책이 없음**

**해결:**
1. `projects` 테이블에 SELECT 정책 추가
2. `nodes` 테이블의 SELECT 정책이 조인 쿼리에서도 작동하는지 확인

## 추가 고려사항

### `nodes(count)` 조인 쿼리의 RLS 동작

Supabase의 `nodes(count)` 조인은 내부적으로 다음과 같이 동작합니다:

```sql
SELECT 
  p.*,
  (SELECT COUNT(*) FROM nodes n WHERE n.project_id = p.id) as count
FROM projects p
WHERE p.user_id = ?
```

이 경우 `nodes` 테이블의 RLS 정책이 서브쿼리에도 적용됩니다.

**문제:**
- `nodes` 테이블의 SELECT 정책이 프로젝트 소유자를 제대로 인식하지 못할 수 있음
- 특히 `project_id`를 통한 접근 권한 확인이 필요함

**해결:**
- `nodes` 테이블의 SELECT 정책에 프로젝트 소유자 조건 추가:
```sql
EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_id
  AND p.user_id::uuid = auth.uid()
)
```

## 결론

**핵심 문제:**
- `projects` 테이블에 RLS가 활성화되어 있지만 SELECT 정책이 없어서 조회 실패
- 또는 `nodes` 테이블의 SELECT 정책이 조인 쿼리에서 제대로 작동하지 않음

**즉시 조치:**
1. `projects` 테이블의 RLS 상태 확인
2. `projects` 테이블에 SELECT 정책 추가
3. `nodes` 테이블의 SELECT 정책이 조인 쿼리에서도 작동하는지 확인
