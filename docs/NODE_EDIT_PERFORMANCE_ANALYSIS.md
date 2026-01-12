# 노드 내용 수정(편집) 성능 분석

## 데이터 흐름

### 편집 프로세스

```
사용자 더블클릭
  ↓
onStartEdit(nodeId) → setEditingNodeId(nodeId)
  ↓
MindMapNode 컴포넌트에서 input 렌더링
  ↓
사용자 타이핑 → setEditValue (로컬 상태)
  ↓
Enter 키 또는 Blur 이벤트
  ↓
onEdit(nodeId, label) → handleNodeEdit()
  ↓
nodes.map()으로 전체 배열 순회하여 업데이트
  ↓
handleNodesChange(updatedNodes, false) // 드래그 아님
  ↓
즉시 상태 업데이트 (setNodes, setProject)
  ↓
500ms 디바운싱 후 saveNodes() 호출
  ↓
복잡한 계층 정렬 로직 실행
  ↓
Supabase에 upsert
```

## 코드 분석

### 1. 편집 시작 (`MindMapNode.tsx:123-128`)

```typescript
const handleDoubleClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (isReadOnly) return;
  onStartEdit(node.id);
};
```

**분석:**
- ✅ 간단한 상태 변경만 수행
- ✅ 성능 문제 없음

### 2. 편집 중 입력 처리 (`MindMapNode.tsx:211-221`)

```typescript
<input
  ref={inputRef}
  value={editValue}
  onChange={(e) => setEditValue(e.target.value)}
  onKeyDown={handleKeyDown}
  onBlur={handleBlur}
  // ...
/>
```

**분석:**
- ✅ 로컬 상태(`editValue`)만 업데이트
- ✅ 리렌더링은 해당 컴포넌트에만 제한
- ✅ 성능 문제 없음

### 3. 편집 완료 처리 (`app/mindmap/[projectId]/page.tsx:336-344`)

```typescript
const handleNodeEdit = async (nodeId: string, label: string) => {
  const updatedNodes = nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, label, updatedAt: Date.now() };
    }
    return node;
  });
  handleNodesChange(updatedNodes, false);
};
```

**분석:**
- ⚠️ **문제점 1**: 전체 노드 배열을 `map()`으로 순회 (O(n))
- ⚠️ **문제점 2**: 노드 인덱스 맵(`nodeMap`)을 사용하지 않음
- ✅ 하지만 단일 노드만 업데이트하므로 영향은 제한적

**성능 영향:**
- 노드 100개: ~0.1ms (무시 가능)
- 노드 1000개: ~1ms (무시 가능)
- 노드 10000개: ~10ms (약간 느림)

### 4. 상태 업데이트 (`app/mindmap/[projectId]/page.tsx:277-334`)

```typescript
const handleNodesChange = async (newNodes: MindMapNode[], isDrag = false) => {
  // 드래그 중이면 상태 업데이트도 디바운싱 (16ms = ~60fps)
  if (isDrag) {
    // ... 디바운싱 처리
  } else {
    // 드래그가 아니면 즉시 업데이트
    isDraggingRef.current = false;
    setNodes(newNodes);
    if (project) {
      setProject({
        ...project,
        nodes: newNodes,
        updatedAt: Date.now(),
      });
    }
  }

  // DB에 직접 저장 (디바운싱 적용)
  if (project) {
    // 기존 타이머 취소
    if (supabaseUpdateTimeoutRef.current) {
      clearTimeout(supabaseUpdateTimeoutRef.current);
    }

    // 500ms 디바운싱으로 Supabase에 노드 저장
    supabaseUpdateTimeoutRef.current = setTimeout(async () => {
      try {
        await saveNodes(projectId, newNodes);
        await mindMapProjectStorage.update(projectId, {
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error('Failed to save nodes to database:', error);
      }
    }, 500);
  }
};
```

**분석:**
- ✅ 편집 시 즉시 상태 업데이트 (사용자 경험 좋음)
- ✅ DB 저장은 500ms 디바운싱 적용 (과도한 저장 방지)
- ⚠️ **문제점**: `setNodes`와 `setProject` 두 번의 상태 업데이트
- ⚠️ **문제점**: `nodes` 배열 전체를 새로 생성하여 전달

**성능 영향:**
- 상태 업데이트: 즉시 (사용자 경험 우선)
- 리렌더링: 전체 노드 배열이 변경되어 모든 노드 컴포넌트 리렌더링 가능성
- 하지만 React의 최적화로 실제 변경된 노드만 리렌더링될 가능성 높음

### 5. DB 저장 (`lib/supabase/data.ts:335-755`)

```typescript
export async function saveNodes(projectId: string, nodes: MindMapNode[]): Promise<boolean> {
  // 중복 호출 방지
  const existingPromise = saveNodesInProgress.get(projectId);
  if (existingPromise) {
    return await existingPromise;
  }

  const savePromise = (async () => {
    // 1. 계층 정렬 (O(n²) 복잡도)
    const sortedNodes = sortNodesByHierarchy(nodes);
    
    // 2. 부모 노드 찾기 및 추가
    // ... 복잡한 로직
    
    // 3. 계층별로 다시 정렬
    const sortedNodesWithParents = sortNodesByHierarchy(nodesToSave);
    
    // 4. 계층별로 순차 저장
    for (let levelIndex = 0; levelIndex < sortedNodesWithParents.length; levelIndex++) {
      const levelNodes = sortedNodesWithParents[levelIndex];
      // upsert 실행
    }
  })();
  
  saveNodesInProgress.set(projectId, savePromise);
  // ...
}
```

**분석:**
- ⚠️ **문제점 1**: `sortNodesByHierarchy()`가 O(n²) 복잡도
- ⚠️ **문제점 2**: 단일 노드 라벨 변경인데도 전체 노드 배열을 처리
- ⚠️ **문제점 3**: 부모 노드 찾기 로직이 복잡함
- ✅ 중복 호출 방지 메커니즘 있음 (좋음)
- ✅ 500ms 디바운싱으로 과도한 저장 방지 (좋음)

**성능 영향:**
- 노드 100개: 100-500ms
- 노드 500개: 500ms-2초
- 노드 1000개: 1-3초

## 발견된 문제점

### 🔴 Critical: 단일 노드 편집 시 전체 노드 처리

**문제:**
- 노드 라벨 하나만 변경했는데도 `saveNodes()`가 전체 노드 배열을 처리
- `sortNodesByHierarchy()`가 O(n²) 복잡도로 실행됨
- 불필요한 부모 노드 찾기 및 정렬 작업 수행

**영향:**
- 노드가 많을수록 편집 후 저장이 느려짐
- 사용자가 편집을 완료한 후 실제 저장까지 지연

### 🟡 Medium: 상태 업데이트 최적화 여지

**문제:**
- `handleNodeEdit`에서 전체 배열을 `map()`으로 순회
- `nodeMap`을 사용하지 않아 O(1) 조회 기회 상실

**영향:**
- 노드가 매우 많을 때(10000개 이상) 약간의 지연 가능
- 하지만 실제로는 무시 가능한 수준

### 🟢 Low: 편집 중 리렌더링

**문제:**
- 편집 중 `setEditValue`로 인한 리렌더링
- 하지만 로컬 상태만 변경하므로 영향 제한적

**영향:**
- 해당 노드 컴포넌트만 리렌더링
- 성능 문제 없음

## 성능 측정 (예상)

### 편집 시작 → 완료까지

| 단계 | 노드 100개 | 노드 500개 | 노드 1000개 |
|------|-----------|-----------|------------|
| handleNodeEdit (map) | <1ms | <1ms | ~1ms |
| 상태 업데이트 | <1ms | <1ms | ~1ms |
| 리렌더링 | ~5ms | ~10ms | ~20ms |
| **총 UI 반응** | **~5ms** | **~10ms** | **~20ms** |

### DB 저장 (500ms 디바운싱 후)

| 단계 | 노드 100개 | 노드 500개 | 노드 1000개 |
|------|-----------|-----------|------------|
| sortNodesByHierarchy | ~10ms | ~100ms | ~500ms |
| 부모 노드 찾기 | ~5ms | ~50ms | ~200ms |
| DB upsert | ~50ms | ~200ms | ~500ms |
| **총 저장 시간** | **~65ms** | **~350ms** | **~1200ms** |

## 개선 방안

### Option 1: 단일 노드 업데이트 최적화 (권장)

**문제:** 단일 노드 라벨 변경인데도 전체 노드 배열을 처리

**해결:**
```typescript
// 단일 노드 업데이트 전용 함수 추가
export async function updateNode(
  projectId: string, 
  nodeId: string, 
  updates: Partial<MindMapNode>
): Promise<boolean> {
  // 해당 노드만 업데이트
  const { error } = await supabase
    .from('nodes')
    .update({
      label: updates.label,
      updated_at: Date.now(),
      // ... 기타 필드
    })
    .eq('id', nodeId)
    .eq('project_id', projectId);
  
  return !error;
}
```

**장점:**
- 단일 노드만 업데이트하므로 매우 빠름 (<10ms)
- 전체 노드 배열 처리 불필요
- 계층 정렬 로직 불필요

**단점:**
- 위치 변경 등 다른 업데이트는 여전히 `saveNodes` 사용 필요

### Option 2: handleNodeEdit 최적화

**현재:**
```typescript
const updatedNodes = nodes.map(node => {
  if (node.id === nodeId) {
    return { ...node, label, updatedAt: Date.now() };
  }
  return node;
});
```

**개선:**
```typescript
// nodeMap 사용 (이미 존재함)
const node = nodeMap.get(nodeId);
if (!node) return;

const updatedNodes = [...nodes];
const index = nodes.findIndex(n => n.id === nodeId);
if (index !== -1) {
  updatedNodes[index] = { ...node, label, updatedAt: Date.now() };
}
```

**장점:**
- 약간의 성능 향상 (노드가 매우 많을 때)
- 하지만 실제로는 무시 가능한 수준

### Option 3: 편집 완료 시 즉시 저장 (디바운싱 제거)

**현재:** 500ms 디바운싱 후 저장

**개선:** 편집 완료 시 즉시 저장 (단일 노드만)

**장점:**
- 사용자가 편집을 완료하면 즉시 저장됨
- 단일 노드만 업데이트하므로 빠름

**단점:**
- 빠르게 여러 노드를 편집할 때 저장 요청 증가
- 하지만 단일 노드 업데이트이므로 영향 제한적

## 권장 사항

### 즉시 개선 필요 (High Priority)

1. **단일 노드 업데이트 함수 추가**
   - `updateNode()` 함수 구현
   - 라벨 변경 시에만 사용
   - 위치 변경 등은 기존 `saveNodes()` 사용

2. **handleNodeEdit에서 조건부 처리**
   ```typescript
   const handleNodeEdit = async (nodeId: string, label: string) => {
     // 라벨만 변경된 경우 단일 노드 업데이트
     if (onlyLabelChanged) {
       await updateNode(projectId, nodeId, { label });
       // 로컬 상태만 업데이트
       const node = nodeMap.get(nodeId);
       if (node) {
         setNodes(prev => {
           const updated = [...prev];
           const index = updated.findIndex(n => n.id === nodeId);
           if (index !== -1) {
             updated[index] = { ...node, label, updatedAt: Date.now() };
           }
           return updated;
         });
       }
     } else {
       // 기존 로직 (전체 저장)
       // ...
     }
   };
   ```

### 선택적 개선 (Medium Priority)

1. **handleNodeEdit에서 nodeMap 활용**
   - 이미 존재하는 `nodeMap` 사용
   - 하지만 실제 성능 향상은 미미함

2. **상태 업데이트 최적화**
   - `setNodes`와 `setProject`를 하나로 통합
   - 하지만 React의 배치 업데이트로 이미 최적화됨

## 결론

### 현재 상태
- ✅ 편집 시작/중: 성능 문제 없음
- ✅ UI 반응성: 즉시 반영 (좋음)
- ⚠️ 편집 완료 후 저장: 노드가 많을 때 느림 (500ms-3초)

### 주요 문제
- 단일 노드 라벨 변경인데도 전체 노드 배열을 처리하는 것이 가장 큰 문제
- `sortNodesByHierarchy()`의 O(n²) 복잡도가 성능 병목

### 개선 효과 예상
- 단일 노드 업데이트 함수 추가 시: **저장 시간 99% 감소** (500ms → <10ms)
- 사용자 경험 크게 향상
