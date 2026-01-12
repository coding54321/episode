# RLS 정책 무한 재귀 문제 분석

## 현재 상황

### 발견된 문제

1. **무한 재귀 오류**: `infinite recursion detected in policy for relation "nodes"`
2. **에러 코드**: `42P17`
3. **발생 위치**: `projects` 테이블 조회 시 `nodes(count)` 조인 쿼리

## 현재 정책 상태 분석

### nodes 테이블 정책 (6개)

1. **"Users can manage own project nodes"** (ALL)
   - 조건: `projects.user_id::text = auth.uid()::text`
   - 문제: `user_id`는 `uuid` 타입인데 `text`로 캐스팅

2. **"Users can read their own project nodes"** (SELECT)
   - 조건: `projects.user_id = auth.uid()` 
   - 문제: 타입 불일치 (`user_id`는 `uuid`, `auth.uid()`도 `uuid`이지만 정책이 제대로 작동하지 않을 수 있음)

3. **"Users can view own project nodes"** (SELECT) - 중복
   - 조건: `projects.user_id::text = auth.uid()::text`
   - 문제: 위 정책과 중복

4. **INSERT, UPDATE, DELETE 정책들**
   - 일부는 타입 캐스팅 없이 `p.user_id = auth.uid()` 사용

### projects 테이블 정책 (8개 - 중복 많음)

- `user_id`는 **`uuid` 타입**
- 중복된 정책들이 많음 (같은 작업에 대해 여러 정책 존재)

## 무한 재귀 원인

### 핵심 문제

`nodes(count)` 조인 쿼리 실행 시:

1. `projects` 테이블 조회 → RLS 정책 적용
2. `nodes(count)` 서브쿼리 실행 → `nodes` 테이블의 RLS 정책 적용
3. `nodes` SELECT 정책이 `projects` 테이블을 참조
4. `projects` 조회 시 다시 RLS 정책 확인
5. **무한 루프 발생**

### 정확한 재귀 경로

```
projects SELECT 쿼리
  ↓
nodes(count) 서브쿼리 실행
  ↓
nodes SELECT 정책 확인
  ↓
EXISTS (SELECT 1 FROM projects ...)  ← 여기서 projects 다시 조회
  ↓
projects SELECT 정책 확인
  ↓
다시 nodes(count) 실행... (무한 반복)
```

## 해결 방법

### 1단계: 중복 정책 제거 및 정리

#### nodes 테이블 정책 정리

```sql
-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can manage own project nodes" ON nodes;
DROP POLICY IF EXISTS "Users can read their own project nodes" ON nodes;
DROP POLICY IF EXISTS "Users can view own project nodes" ON nodes;
DROP POLICY IF EXISTS "Users can insert nodes in their own projects or under shared no" ON nodes;
DROP POLICY IF EXISTS "Users can update their own project nodes or shared nodes" ON nodes;
DROP POLICY IF EXISTS "Users can delete their own project nodes or shared nodes" ON nodes;
```

#### projects 테이블 정책 정리

```sql
-- 중복 정책 제거 (하나만 남기기)
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
-- 나머지는 유지: "Users can read/insert/update/delete their own projects"
```

### 2단계: 무한 재귀 방지 정책 생성

#### 핵심: `projects` 테이블 참조를 최소화

`nodes` 정책에서 `projects` 테이블을 참조할 때, RLS를 우회하는 방법 사용:

```sql
-- nodes SELECT 정책 (무한 재귀 방지)
CREATE POLICY "Users can read their own project nodes"
ON nodes FOR SELECT
USING (
  -- 방법 1: project_id를 직접 비교 (projects 테이블 참조 없이)
  -- 하지만 이 방법은 user_id를 알 수 없으므로 불가능
  
  -- 방법 2: SECURITY DEFINER 함수 사용 (권장)
  -- 또는
  
  -- 방법 3: projects 테이블 참조를 최소화하고 조건 단순화
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND p.user_id = auth.uid()  -- uuid 타입이므로 캐스팅 없이
  )
  OR
  -- 공유된 노드는 projects 참조 없이 직접 확인
  id IN (SELECT node_id FROM shared_nodes)
  OR
  parent_id IN (SELECT node_id FROM shared_nodes)
);
```

### 3단계: SECURITY DEFINER 함수 사용 (가장 확실한 방법)

무한 재귀를 완전히 방지하려면 함수를 사용:

```sql
-- 프로젝트 소유자 확인 함수 생성 (RLS 우회)
CREATE OR REPLACE FUNCTION is_project_owner(project_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param
    AND user_id = auth.uid()
  );
$$;

-- nodes SELECT 정책 (함수 사용)
CREATE POLICY "Users can read their own project nodes"
ON nodes FOR SELECT
USING (
  is_project_owner(project_id)
  OR
  id IN (SELECT node_id FROM shared_nodes)
  OR
  parent_id IN (SELECT node_id FROM shared_nodes)
);
```

## 권장 해결 순서

### 즉시 실행 (무한 재귀 해결)

```sql
-- 1. nodes SELECT 정책 중복 제거
DROP POLICY IF EXISTS "Users can manage own project nodes" ON nodes;
DROP POLICY IF EXISTS "Users can view own project nodes" ON nodes;

-- 2. SECURITY DEFINER 함수 생성
CREATE OR REPLACE FUNCTION is_project_owner(project_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param
    AND user_id = auth.uid()
  );
$$;

-- 3. nodes SELECT 정책 재생성 (함수 사용)
DROP POLICY IF EXISTS "Users can read their own project nodes" ON nodes;

CREATE POLICY "Users can read their own project nodes"
ON nodes FOR SELECT
USING (
  is_project_owner(project_id)
  OR
  id IN (SELECT node_id FROM shared_nodes)
  OR
  parent_id IN (SELECT node_id FROM shared_nodes)
);
```

### 나머지 정책도 함수 사용

```sql
-- INSERT 정책
DROP POLICY IF EXISTS "Users can insert nodes in their own projects or under shared no" ON nodes;

CREATE POLICY "Users can insert nodes in their own projects or under shared nodes"
ON nodes FOR INSERT
WITH CHECK (
  is_project_owner(project_id)
  OR
  (
    auth.uid() IS NOT NULL
    AND parent_id IN (SELECT node_id FROM shared_nodes)
  )
);

-- UPDATE 정책
DROP POLICY IF EXISTS "Users can update their own project nodes or shared nodes" ON nodes;

CREATE POLICY "Users can update their own project nodes or shared nodes"
ON nodes FOR UPDATE
USING (
  is_project_owner(project_id)
  OR
  (
    auth.uid() IS NOT NULL
    AND (
      id IN (SELECT node_id FROM shared_nodes)
      OR parent_id IN (SELECT node_id FROM shared_nodes)
    )
  )
);

-- DELETE 정책
DROP POLICY IF EXISTS "Users can delete their own project nodes or shared nodes" ON nodes;

CREATE POLICY "Users can delete their own project nodes or shared nodes"
ON nodes FOR DELETE
USING (
  is_project_owner(project_id)
  OR
  (
    auth.uid() IS NOT NULL
    AND (
      id IN (SELECT node_id FROM shared_nodes)
      OR parent_id IN (SELECT node_id FROM shared_nodes)
    )
  )
);
```

## 핵심 포인트

1. **SECURITY DEFINER 함수 사용**: RLS 정책 내에서 다른 테이블을 참조할 때 무한 재귀 방지
2. **중복 정책 제거**: 같은 작업에 대한 여러 정책이 충돌할 수 있음
3. **타입 일치**: `user_id`는 `uuid` 타입이므로 `auth.uid()`와 직접 비교 가능

## 확인 사항

- `projects.user_id`는 `uuid` 타입
- `auth.uid()`도 `uuid` 타입
- 따라서 `p.user_id = auth.uid()` 직접 비교 가능 (캐스팅 불필요)
