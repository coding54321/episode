# 프로젝트 로드 실패 디버깅 가이드

## 현재 상황

RLS 정책을 설정했지만 여전히 프로젝트를 불러오지 못하는 문제가 발생하고 있습니다.

## 디버깅 단계

### 1단계: 브라우저 개발자 도구에서 확인

**Network 탭 확인:**
1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭 선택
3. 마인드맵 페이지 새로고침
4. Supabase API 요청 찾기 (보통 `/rest/v1/projects` 형태)
5. 요청 클릭하여 상세 정보 확인:
   - **Status Code**: 403 (Forbidden) 또는 401 (Unauthorized)인지 확인
   - **Response**: 에러 메시지 확인
   - **Request Headers**: `Authorization` 헤더가 있는지 확인

**Console 탭 확인:**
- 더 자세한 에러 메시지가 있는지 확인
- `error.code`, `error.message`, `error.details` 등 확인

### 2단계: RLS 정책 확인

SQL Editor에서 실행:

```sql
-- 1. projects 테이블의 RLS 상태 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'projects';

-- 2. projects 테이블의 모든 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'projects';

-- 3. nodes 테이블의 SELECT 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'nodes' AND cmd = 'SELECT';
```

### 3단계: 인증 상태 확인

SQL Editor에서 실행:

```sql
-- 현재 인증된 사용자 확인
SELECT auth.uid() as current_user_id;

-- 또는 애플리케이션 코드에서 확인
-- 브라우저 Console에서:
-- supabase.auth.getUser().then(u => console.log(u))
```

### 4단계: 테스트 쿼리 실행

SQL Editor에서 직접 쿼리 실행 (RLS 정책이 적용되는지 확인):

```sql
-- 1. 프로젝트 조회 테스트
SELECT * FROM projects 
WHERE user_id::uuid = auth.uid()
LIMIT 5;

-- 2. 노드 개수 조회 테스트
SELECT 
  p.*,
  (SELECT COUNT(*) FROM nodes n WHERE n.project_id = p.id) as node_count
FROM projects p
WHERE p.user_id::uuid = auth.uid()
LIMIT 5;
```

**결과:**
- 쿼리가 성공하면: RLS 정책은 정상, 애플리케이션 코드 문제 가능
- 쿼리가 실패하면: RLS 정책 문제

## 가능한 원인 및 해결책

### 원인 1: `nodes(count)` 조인 시 RLS 정책 위반

**증상:**
- `projects` 테이블 조회는 성공하지만
- `nodes(count)` 조인 시 실패

**해결책:**

`nodes` 테이블의 SELECT 정책에 프로젝트 소유자 조건 추가:

```sql
-- 기존 nodes SELECT 정책 확인
SELECT * FROM pg_policies 
WHERE tablename = 'nodes' AND cmd = 'SELECT';

-- nodes SELECT 정책 수정 (프로젝트 소유자도 조회 가능하도록)
DROP POLICY IF EXISTS "Users can read their own project nodes" ON nodes;

CREATE POLICY "Users can read their own project nodes"
ON nodes FOR SELECT
USING (
  -- 프로젝트 소유자는 자신의 프로젝트 노드 조회 가능
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND p.user_id::uuid = auth.uid()
  )
  OR
  -- 공유된 노드는 조회 가능
  id IN (SELECT node_id FROM shared_nodes)
  OR EXISTS (
    SELECT 1 FROM nodes parent
    WHERE parent.id = parent_id
    AND parent.id IN (SELECT node_id FROM shared_nodes)
  )
);
```

### 원인 2: `projects` 테이블의 RLS 정책이 잘못 설정됨

**증상:**
- `projects` 테이블 조회 자체가 실패

**해결책:**

```sql
-- projects SELECT 정책 확인 및 수정
DROP POLICY IF EXISTS "Users can read their own projects" ON projects;

-- user_id가 text 타입인 경우
CREATE POLICY "Users can read their own projects"
ON projects FOR SELECT
USING (
  user_id = auth.uid()::text
);

-- 또는 user_id가 uuid 타입인 경우
CREATE POLICY "Users can read their own projects"
ON projects FOR SELECT
USING (
  user_id = auth.uid()
);
```

### 원인 3: 인증 토큰이 제대로 전달되지 않음

**증상:**
- `auth.uid()`가 NULL 반환

**확인 방법:**

브라우저 Console에서:
```javascript
// Supabase 클라이언트 확인
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.auth.getUser().then(u => console.log('Current user:', u));
```

**해결책:**
- 로그인 상태 확인
- 세션 갱신 필요할 수 있음

### 원인 4: `user_id` 타입 불일치

**확인 방법:**

```sql
-- user_id 타입 확인
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'user_id';

-- auth.uid() 타입 확인
SELECT pg_typeof(auth.uid()) as auth_uid_type;
```

**해결책:**
- 타입에 맞는 캐스팅 사용
- `user_id::uuid = auth.uid()` 또는 `user_id = auth.uid()::text`

## 임시 해결책 (테스트용)

문제를 빠르게 확인하려면:

```sql
-- projects 테이블 RLS 임시 비활성화 (테스트용만)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 테스트 후 다시 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
```

**주의:** 프로덕션 환경에서는 사용하지 마세요.

## 코드 수정 (에러 로깅 개선)

`lib/supabase/data.ts`의 `getProjects` 함수에 더 자세한 에러 로깅 추가:

```typescript
export async function getProjects(userId: string): Promise<MindMapProject[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        nodes(count)
      `)
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      // 더 자세한 에러 로깅
      console.error('Failed to get projects - detailed error:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: (error as any).details,
        errorHint: (error as any).hint,
        userId,
      });
      throw error;
    }

    // ... 나머지 코드
  } catch (error) {
    console.error('Failed to get projects:', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as any)?.code,
      userId,
    });
    return [];
  }
}
```

## 체크리스트

- [ ] 브라우저 Network 탭에서 Supabase API 응답 확인
- [ ] `projects` 테이블의 RLS 정책 확인
- [ ] `nodes` 테이블의 SELECT 정책 확인
- [ ] 인증 상태 확인 (`auth.uid()` 반환값 확인)
- [ ] SQL Editor에서 직접 쿼리 테스트
- [ ] `user_id` 타입 확인
- [ ] 에러 로깅 개선 후 재확인

## 다음 단계

1. 위의 디버깅 단계를 순서대로 실행
2. 각 단계의 결과를 기록
3. 문제가 발견되면 해당 원인의 해결책 적용
4. 여전히 실패하면 에러 로깅을 개선하여 더 자세한 정보 수집
