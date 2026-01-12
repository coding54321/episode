# 공유 페이지에서 노드 수정 시 원본 노드 삭제 문제 분석

## 🔴 Critical Issue 발견

### 문제 상황

공유된 페이지(`/share/[nodeId]`)에서 노드를 수정하면, 원본 프로젝트 페이지(`/mindmap/[projectId]`)의 **모든 노드가 사라지는** 문제가 발생합니다.

## 원인 분석

### 핵심 문제: `saveNodes` 함수의 삭제 로직

**위치:** `lib/supabase/data.ts:732-775`

```typescript
// 저장할 노드 ID 집합 생성
const nodeIds = new Set(nodesToSave.map(n => n.id));

// 기존 노드 조회
const { data: existingNodes } = await supabase
  .from('nodes')
  .select('id, parent_id')
  .eq('project_id', projectId);

if (existingNodes) {
  const existingNodeIds = existingNodes.map(n => n.id);
  // ⚠️ 받은 노드 배열에 없는 기존 노드들을 찾아서 삭제
  const nodesToDeleteIds = existingNodeIds.filter(id => !nodeIds.has(id));

  if (nodesToDeleteIds.length > 0) {
    // 삭제할 노드들을 자식부터 부모 순으로 정렬
    // ... 삭제 로직 실행
    await supabase.from('nodes').delete().in('id', nodesToDeleteIds);
  }
}
```

### 문제 발생 시나리오

#### 시나리오 1: 공유 페이지에서 노드 드래그

```
원본 프로젝트 상태:
- 노드 A (공유되지 않음)
- 노드 B (공유되지 않음)
- 노드 C (공유됨) ← 공유 페이지에서 표시
  - 노드 D (하위 노드)
  - 노드 E (하위 노드)

공유 페이지에서 노드 D를 드래그:
  ↓
handleNodesChange 호출
  ↓
saveNodes(projectId, [C, D, E]) 호출
  ↓
nodeIds = Set(['C', 'D', 'E'])
existingNodeIds = ['A', 'B', 'C', 'D', 'E']
nodesToDeleteIds = ['A', 'B'] ← ⚠️ 원본 노드들이 삭제 대상!
  ↓
노드 A, B 삭제됨 ❌
```

#### 시나리오 2: 공유 페이지에서 노드 편집

```
공유 페이지에서 노드 C의 라벨 수정:
  ↓
handleNodeEdit 호출
  ↓
updateNode(projectId, 'C', { label: '새 라벨' }) 호출
  ↓
✅ 단일 노드만 업데이트하므로 문제 없음

하지만 다른 작업(드래그 등)에서:
  ↓
handleNodesChange 호출
  ↓
saveNodes(projectId, [C, D, E]) 호출
  ↓
노드 A, B 삭제됨 ❌
```

### 코드 흐름 분석

#### 공유 페이지 노드 로딩 (`app/share/[nodeId]/page.tsx:67-78`)

```typescript
// 공유된 노드와 하위 노드만 로드
const allNodes = [data.node, ...data.descendants];
setNodes(allNodes);
```

**문제:**
- 공유 페이지는 **필터링된 노드 배열**만 가지고 있음
- 원본 프로젝트의 다른 노드들은 로드하지 않음

#### 공유 페이지에서 노드 변경 (`app/share/[nodeId]/page.tsx:143-155`)

```typescript
const handleNodesChange = async (newNodes: MindMapNode[]) => {
  if (isReadOnly || !sharedData) return;
  
  setNodes(newNodes);
  
  // ⚠️ 필터링된 노드 배열만 전달
  await saveNodes(sharedData.projectId, newNodes);
};
```

**문제:**
- 필터링된 노드 배열만 `saveNodes`에 전달
- `saveNodes`는 받은 노드 배열에 없는 기존 노드를 삭제
- 결과: 원본 프로젝트의 다른 노드들이 삭제됨

#### saveNodes의 삭제 로직 (`lib/supabase/data.ts:732-775`)

```typescript
// 받은 노드 ID 집합
const nodeIds = new Set(nodesToSave.map(n => n.id));

// 기존 노드 조회
const existingNodes = await supabase
  .from('nodes')
  .select('id, parent_id')
  .eq('project_id', projectId);

// 받은 노드 배열에 없는 기존 노드 찾기
const nodesToDeleteIds = existingNodeIds.filter(id => !nodeIds.has(id));

// ⚠️ 삭제 실행
if (nodesToDeleteIds.length > 0) {
  await supabase.from('nodes').delete().in('id', nodesToDeleteIds);
}
```

**문제:**
- `saveNodes`는 **전체 교체 방식**으로 설계됨
- 받은 노드 배열에 없는 노드는 모두 삭제
- 공유 페이지에서 부분 노드만 전달하면 나머지가 삭제됨

## 발견된 문제점

### 🔴 Critical: saveNodes의 전체 교체 방식

**문제:**
- `saveNodes`는 받은 노드 배열로 전체를 교체하는 방식
- 받은 노드 배열에 없는 기존 노드를 삭제
- 공유 페이지에서는 필터링된 노드만 전달하므로 원본 노드가 삭제됨

**영향:**
- 공유 페이지에서 노드 드래그 시 원본 노드 삭제
- 공유 페이지에서 노드 추가/삭제 시 원본 노드 삭제
- 데이터 손실 위험

### 🟡 Medium: 공유 페이지의 handleNodesChange

**문제:**
- 공유 페이지의 `handleNodesChange`가 전체 저장 로직(`saveNodes`) 사용
- 부분 노드만 수정해야 하는데 전체 교체 방식 사용

**영향:**
- 공유 페이지에서 노드 수정 시 원본 노드 삭제
- 하지만 `updateNode`를 사용하는 경우는 문제 없음

## 해결 방안

### Option 1: 공유 페이지에서 saveNodes 사용 금지 (권장)

**방법:**
- 공유 페이지에서는 `saveNodes` 대신 `updateNode`만 사용
- 드래그 등 위치 변경도 `updateNode`로 처리
- 노드 추가/삭제는 공유 페이지에서 비활성화

**장점:**
- 단일 노드만 업데이트하므로 안전
- 원본 노드 삭제 방지
- 성능도 좋음

**단점:**
- 공유 페이지에서 노드 추가/삭제 불가능
- 하지만 공유 페이지는 읽기/편집 전용이므로 문제 없을 수 있음

### Option 2: saveNodes에 부분 업데이트 모드 추가

**방법:**
- `saveNodes`에 `partialUpdate` 옵션 추가
- 부분 업데이트 모드에서는 삭제 로직 실행 안 함

**장점:**
- 공유 페이지에서도 노드 추가/삭제 가능
- 기존 로직과 호환성 유지

**단점:**
- 함수 시그니처 변경 필요
- 복잡도 증가

### Option 3: 공유 페이지에서 전체 노드 로드

**방법:**
- 공유 페이지에서도 원본 프로젝트의 모든 노드 로드
- 수정 시 전체 노드 배열 전달

**장점:**
- 기존 로직 그대로 사용 가능

**단점:**
- 공유 페이지에서 불필요한 노드까지 로드 (성능 저하)
- 보안 문제 (공유되지 않은 노드도 접근 가능)

## 권장 해결 방안

### 즉시 수정 필요 (High Priority)

**Option 1 채택: 공유 페이지에서 saveNodes 사용 금지**

1. **공유 페이지의 handleNodesChange 수정**
   - `saveNodes` 대신 `updateNode`만 사용
   - 드래그 시에도 각 노드별로 `updateNode` 호출

2. **공유 페이지에서 노드 추가/삭제 비활성화**
   - 공유 페이지는 읽기/편집 전용으로 제한
   - 노드 추가/삭제는 원본 프로젝트에서만 가능

3. **updateNode 함수 확장**
   - 위치 변경(`x`, `y`)도 지원 (이미 지원됨)
   - 필요시 추가 필드 지원

## 예상 수정 사항

### 1. 공유 페이지의 handleNodesChange 수정

```typescript
// 기존 (문제 있음)
const handleNodesChange = async (newNodes: MindMapNode[]) => {
  await saveNodes(sharedData.projectId, newNodes); // ❌ 전체 교체
};

// 수정 (안전)
const handleNodesChange = async (newNodes: MindMapNode[]) => {
  // 변경된 노드만 찾아서 updateNode 호출
  const changedNodes = findChangedNodes(nodes, newNodes);
  for (const node of changedNodes) {
    await updateNode(sharedData.projectId, node.id, {
      x: node.x,
      y: node.y,
      label: node.label,
    });
  }
};
```

### 2. 공유 페이지에서 노드 추가/삭제 비활성화

- `onNodeAddChild` 비활성화
- `onNodeDelete` 비활성화
- UI에서도 버튼 숨김

## 결론

### 문제 원인
- `saveNodes` 함수가 받은 노드 배열로 전체를 교체하는 방식
- 공유 페이지에서 필터링된 노드 배열만 전달
- 결과: 원본 프로젝트의 다른 노드들이 삭제됨

### 해결 방법
- 공유 페이지에서는 `saveNodes` 사용 금지
- `updateNode`만 사용하여 단일 노드만 업데이트
- 노드 추가/삭제는 공유 페이지에서 비활성화

### 우선순위
- 🔴 **Critical**: 즉시 수정 필요 (데이터 손실 위험)
