# /mindmaps 페이지 데이터 로딩 분석

## 데이터 흐름

### 1. 페이지 로딩 과정

```
/mindmaps/page.tsx
  ↓
mindMapProjectStorage.load()
  ↓
lib/storage-supabase.ts: mindMapProjectStorage.load()
  ↓
lib/supabase/data.ts: getProjects(userId)
  ↓
Supabase: SELECT * FROM projects WHERE user_id = ?
```

### 2. 현재 구현 상태

#### `getProjects()` 함수 (`lib/supabase/data.ts:12-38`)
```typescript
export async function getProjects(userId: string): Promise<MindMapProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('updated_at', { ascending: false });

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    badges: (p.badges as BadgeType[]) || [],
    nodes: [], // ⚠️ 항상 빈 배열 반환
    createdAt: new Date(p.created_at || '').getTime(),
    updatedAt: new Date(p.updated_at || '').getTime(),
    isDefault: p.is_default || false,
    isFavorite: p.is_favorite || false,
  }));
}
```

#### `/mindmaps` 페이지에서 노드 개수 표시 (`app/mindmaps/page.tsx:305`)
```typescript
<span className="font-medium">{project.nodes.length}개 노드</span>
```

## 발견된 문제점

### 🔴 Critical Issue: 노드 개수가 항상 0으로 표시됨

**문제:**
- `getProjects()` 함수는 성능상의 이유로 `nodes: []`를 항상 반환함
- 하지만 `/mindmaps` 페이지에서는 `project.nodes.length`를 표시함
- 결과적으로 모든 프로젝트가 "0개 노드"로 표시됨

**영향:**
- 사용자가 실제 노드 개수를 확인할 수 없음
- UI/UX 저하

### 🟡 Medium Issue: 불필요한 데이터 로딩 가능성

**현재 구조:**
- `getProjects()`: 프로젝트 목록만 반환 (노드 없음)
- `getProject()`: 단일 프로젝트 + 모든 노드 로드

**잠재적 문제:**
- 만약 나중에 노드 데이터가 필요해지면, 각 프로젝트마다 `getNodes()`를 호출해야 함
- N+1 쿼리 문제 발생 가능

## Supabase 데이터 구조

### projects 테이블
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `name` (text)
- `description` (text, nullable)
- `badges` (jsonb, default: [])
- `is_favorite` (boolean, default: false)
- `is_default` (boolean, default: false)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### nodes 테이블
- `id` (text, PK)
- `project_id` (uuid, FK → projects.id)
- `parent_id` (text, FK → nodes.id, nullable)
- `label` (text)
- `node_type` (text, nullable)
- `level` (integer, default: 0)
- `x`, `y` (float8, default: 0)
- `created_at`, `updated_at` (bigint)
- 기타 필드들...

### 현재 데이터 상태
- 프로젝트: 3개 존재
- 노드: 0개 (현재 DB에 노드 데이터 없음)

## 개선 방안

### Option 1: 노드 개수만 조회 (권장)
**장점:**
- 성능 최적화 (전체 노드 데이터 불필요)
- 간단한 구현

**구현:**
```typescript
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

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    badges: (p.badges as BadgeType[]) || [],
    nodes: Array(p.nodes?.[0]?.count || 0).fill(null), // 개수만 저장
    // 또는 별도 필드 추가: nodeCount: p.nodes?.[0]?.count || 0
    createdAt: new Date(p.created_at || '').getTime(),
    updatedAt: new Date(p.updated_at || '').getTime(),
    isDefault: p.is_default || false,
    isFavorite: p.is_favorite || false,
  }));
}
```

**또는 SQL 집계 사용:**
```sql
SELECT 
  p.*,
  COUNT(n.id) as node_count
FROM projects p
LEFT JOIN nodes n ON p.id = n.project_id
WHERE p.user_id = ?
GROUP BY p.id
ORDER BY p.is_favorite DESC, p.updated_at DESC
```

### Option 2: 타입 수정
`MindMapProject` 타입에 `nodeCount` 필드 추가:
```typescript
interface MindMapProject {
  // ... 기존 필드들
  nodeCount?: number; // 노드 개수 (목록 조회 시)
  nodes?: MindMapNode[]; // 전체 노드 데이터 (상세 조회 시)
}
```

### Option 3: 페이지에서 직접 조회
각 프로젝트의 노드 개수를 별도로 조회 (비권장 - N+1 문제)

## 기타 발견 사항

### ✅ 정상 동작하는 부분
1. 인증 체크: `useUnifiedAuth()`로 사용자 확인
2. 프로젝트 정렬: 즐겨찾기 우선, 그 다음 최신순
3. 에러 처리: try-catch로 에러 처리
4. 로딩 상태: `isLoading` 상태 관리

### ⚠️ 주의할 부분
1. **노드 개수 표시**: 현재 항상 0으로 표시됨
2. **타입 불일치**: `nodes`가 빈 배열인데 `nodes.length` 사용
3. **성능**: 프로젝트가 많아지면 노드 개수 조회가 필요할 수 있음

## 권장 수정 사항

1. **즉시 수정 필요**: `getProjects()`에서 노드 개수 조회 추가
2. **타입 개선**: `MindMapProject`에 `nodeCount` 필드 추가 고려
3. **성능 최적화**: Supabase의 `count` 기능 활용
