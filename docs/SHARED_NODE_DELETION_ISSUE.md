# 공유 노드 수정 시 원본 노드 삭제 문제 분석

## 문제 현상

공유된 페이지(`/share/[nodeId]`)에서 노드를 수정하면, 공유를 한 원래 페이지(`/mindmap/[projectId]`)의 **다른 노드들이 모두 사라지는** 문제가 발생합니다.

## 원인 분석

### 핵심 문제: `saveNodes` 함수의 삭제 로직

`lib/supabase/data.ts`의 `saveNodes` 함수는 다음과 같은 로직을 수행합니다:

```731:775:lib/supabase/data.ts
    // 프로젝트에 속하지 않는 노드 삭제 (삭제된 노드 처리)
    const nodeIds = nodes.map(n => n.id);
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('id, parent_id')
      .eq('project_id', projectId);

    if (existingNodes) {
      const existingNodeIds = existingNodes.map(n => n.id);
      const nodesToDeleteIds = existingNodeIds.filter(id => !nodeIds.includes(id));

      if (nodesToDeleteIds.length > 0) {
        // 삭제할 노드들을 자식부터 부모 순으로 정렬
        const nodesToDeleteData = existingNodes.filter(n => nodesToDeleteIds.includes(n.id));
        const sortedDeleteNodes = sortNodesByHierarchy(
          nodesToDeleteData.map(n => ({
            id: n.id,
            parentId: n.parent_id,
            label: '',
            children: [],
            x: 0,
            y: 0,
            level: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
          } as MindMapNode))
        );

        // 자식 노드부터 삭제 (역순)
        for (let i = sortedDeleteNodes.length - 1; i >= 0; i--) {
          const levelNodes = sortedDeleteNodes[i];
          const levelNodeIds = levelNodes.map(n => n.id);

          const { error: deleteError } = await supabase
            .from('nodes')
            .delete()
            .in('id', levelNodeIds);

          if (deleteError) {
            // 삭제 에러는 무시 (RLS 정책이나 이미 삭제된 노드일 수 있음)
            console.warn(`Failed to delete level ${i} nodes:`, deleteError.message);
          }
        }
      }
    }
```

**이 로직의 의도:**
- 사용자가 노드를 삭제한 경우, DB에서도 삭제하기 위함
- 전달받은 `nodes` 배열에 없는 노드들을 삭제

**문제점:**
- 공유 페이지에서는 **공유된 노드와 그 하위 노드만** 로드합니다
- 하지만 `saveNodes`는 **전체 프로젝트의 노드**를 대상으로 삭제 로직을 실행합니다

### 문제 발생 시나리오

1. **원래 페이지 (`/mindmap/[projectId]`):**
   - 프로젝트 전체 노드 로드 (예: 100개)
   - 모든 노드가 표시됨

2. **공유 페이지 (`/share/[nodeId]`):**
   - `getSharedNodeByNodeId`로 공유된 노드와 하위 노드만 로드 (예: 20개)
   ```typescript
   // app/share/[nodeId]/page.tsx:68
   const allNodes = [data.node, ...data.descendants];
   setNodes(allNodes);
   ```

3. **공유 페이지에서 노드 수정:**
   ```typescript
   // app/share/[nodeId]/page.tsx:143-155
   const handleNodesChange = async (newNodes: MindMapNode[]) => {
     if (isReadOnly || !sharedData) return;
     setNodes(newNodes);
     try {
       await saveNodes(sharedData.projectId, newNodes); // ⚠️ 문제 발생 지점
     } catch (error) {
       console.error('Failed to save nodes to database:', error);
     }
   };
   ```

4. **`saveNodes` 실행:**
   - 전달받은 20개 노드만 upsert
   - DB에 있는 100개 노드 중, 전달받은 20개에 없는 **80개 노드를 삭제**
   - 결과: 원래 페이지의 다른 노드들이 모두 사라짐

### 코드 흐름 상세 분석

#### 1. 공유 페이지 데이터 로드

```typescript
// app/share/[nodeId]/page.tsx:51
const data = await getSharedNodeByNodeId(trimmedNodeId);

// getSharedNodeByNodeId는 공유된 노드와 하위 노드만 반환
// lib/supabase/data.ts:1705
const descendants = getDescendants(node.id);
```

**`getDescendants` 함수:**
```typescript
// lib/supabase/data.ts:1668-1703
const getDescendants = (parentId: string): MindMapNode[] => {
  const children = allProjectNodes.filter((n: any) => n.parent_id === parentId);
  const descendants: MindMapNode[] = [];
  
  children.forEach(child => {
    // ... 하위 노드만 재귀적으로 추가
    descendants.push(...getDescendants(child.id));
  });
  
  return descendants;
};
```

**결과:** 공유된 노드의 하위 노드만 로드됨 (형제 노드나 다른 브랜치는 제외)

#### 2. 노드 수정 시 저장

```typescript
// app/share/[nodeId]/page.tsx:143-155
const handleNodesChange = async (newNodes: MindMapNode[]) => {
  if (isReadOnly || !sharedData) return;
  setNodes(newNodes);
  
  // ⚠️ 문제: 공유된 노드들만 전달
  await saveNodes(sharedData.projectId, newNodes);
};
```

#### 3. `saveNodes`의 삭제 로직 실행

```typescript
// lib/supabase/data.ts:731-775
// 1. 전달받은 노드 ID 수집 (공유된 노드들만, 예: 20개)
const nodeIds = nodes.map(n => n.id);

// 2. DB에서 프로젝트의 모든 노드 조회 (예: 100개)
const { data: existingNodes } = await supabase
  .from('nodes')
  .select('id, parent_id')
  .eq('project_id', projectId);

// 3. 전달받은 노드에 없는 노드들을 삭제 대상으로 식별 (예: 80개)
const nodesToDeleteIds = existingNodeIds.filter(id => !nodeIds.includes(id));

// 4. 삭제 실행 ⚠️ 원래 페이지의 다른 노드들이 삭제됨
await supabase.from('nodes').delete().in('id', levelNodeIds);
```

## 영향 범위

### 직접 영향
- 공유 페이지에서 노드 수정 시 원본 프로젝트의 다른 노드들이 삭제됨
- 데이터 손실 발생

### 간접 영향
- 공유 기능의 신뢰성 저하
- 협업 시 데이터 무결성 문제

## 해결 방안 (제안)

### 방안 1: 공유 페이지에서 부분 업데이트만 수행 (권장)

공유 페이지에서는 `saveNodes` 대신 **개별 노드 업데이트**만 수행:

```typescript
// app/share/[nodeId]/page.tsx 수정
const handleNodesChange = async (newNodes: MindMapNode[]) => {
  if (isReadOnly || !sharedData) return;
  
  setNodes(newNodes);
  
  // 전체 저장 대신 변경된 노드만 개별 업데이트
  const previousNodes = nodes; // 이전 상태와 비교
  const changedNodes = newNodes.filter((newNode, index) => {
    const oldNode = previousNodes.find(n => n.id === newNode.id);
    return !oldNode || JSON.stringify(oldNode) !== JSON.stringify(newNode);
  });
  
  // 변경된 노드만 개별 업데이트
  for (const node of changedNodes) {
    await updateNode(sharedData.projectId, node.id, {
      label: node.label,
      x: node.x,
      y: node.y,
    });
  }
};
```

**장점:**
- 다른 노드에 영향 없음
- 데이터 무결성 보장

**단점:**
- 노드 추가/삭제 시 추가 로직 필요

### 방안 2: `saveNodes`에 공유 모드 플래그 추가

`saveNodes` 함수에 공유 모드 플래그를 추가하여 삭제 로직을 건너뛰기:

```typescript
// lib/supabase/data.ts 수정
export async function saveNodes(
  projectId: string, 
  nodes: MindMapNode[],
  options?: { skipDeletion?: boolean } // 공유 모드 플래그
): Promise<boolean> {
  // ... 기존 upsert 로직 ...
  
  // 공유 모드가 아닐 때만 삭제 로직 실행
  if (!options?.skipDeletion) {
    // 프로젝트에 속하지 않는 노드 삭제
    // ... 기존 삭제 로직 ...
  }
}

// app/share/[nodeId]/page.tsx 수정
await saveNodes(sharedData.projectId, newNodes, { skipDeletion: true });
```

**장점:**
- 기존 코드 구조 유지
- 명확한 플래그로 의도 표현

**단점:**
- `saveNodes` 함수의 복잡도 증가

### 방안 3: 공유 노드 전용 저장 함수 생성

공유 노드용 별도 저장 함수 생성:

```typescript
// lib/supabase/data.ts
export async function saveSharedNodes(
  projectId: string,
  nodes: MindMapNode[]
): Promise<boolean> {
  // upsert만 수행, 삭제 로직 없음
  // ... upsert 로직만 ...
}

// app/share/[nodeId]/page.tsx 수정
await saveSharedNodes(sharedData.projectId, newNodes);
```

**장점:**
- 책임 분리 명확
- 기존 코드에 영향 없음

**단점:**
- 코드 중복 가능성

## 권장 해결 방안

**방안 1 (부분 업데이트)**을 권장합니다:
- 가장 안전함
- 데이터 무결성 보장
- 공유 페이지의 특성에 맞음 (부분 노드만 수정)

## 추가 고려사항

### 노드 추가/삭제 처리

공유 페이지에서 노드 추가/삭제 시에도 동일한 문제가 발생할 수 있습니다:

```typescript
// app/share/[nodeId]/page.tsx:188-259
const handleNodeAddChild = (parentId: string, ...) => {
  // 새 노드 추가
  updatedNodes.push(newChild);
  handleNodesChange(updatedNodes); // ⚠️ 전체 저장으로 인한 삭제 위험
};

const handleNodeDelete = (nodeId: string) => {
  // 노드 삭제
  const updatedNodes = nodes.filter(...);
  handleNodesChange(updatedNodes); // ⚠️ 전체 저장으로 인한 삭제 위험
};
```

**해결:**
- 노드 추가: `insertNode` 함수 생성 또는 개별 insert
- 노드 삭제: `deleteNode` 함수 사용 (개별 삭제)

## 결론

**문제의 핵심:**
- 공유 페이지는 부분 노드만 로드하지만, `saveNodes`는 전체 프로젝트를 대상으로 삭제 로직을 실행
- 결과적으로 공유되지 않은 노드들이 삭제됨

**즉시 조치 필요:**
- 공유 페이지에서 `saveNodes` 사용 금지
- 개별 노드 업데이트 함수(`updateNode`)만 사용
- 노드 추가/삭제는 별도 함수로 처리
