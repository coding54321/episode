# 노드 CRUD 성능 분석 및 버벅임 원인

## 📋 분석 일자
2024년 (현재)

## 🔍 발견된 성능 문제

### 1. 드래그 중 과도한 상태 업데이트 (Critical)

**위치**: `components/mindmap/MindMapCanvas.tsx:270-286`

**문제점**:
```typescript
const handleMouseMove = useCallback((e: MouseEvent) => {
  // ...
  const updatedNodes = nodes.map(node => {
    // 드래그된 노드
    if (node.id === draggedNodeId) {
      return { ...node, x: newX, y: newY, updatedAt: Date.now() };
    }
    // 하위 노드들도 같은 만큼 이동
    if (descendantIds.includes(node.id)) {
      return { 
        ...node, 
        x: node.x + deltaX, 
        y: node.y + deltaY, 
        updatedAt: Date.now() 
      };
    }
    return node;
  });
  onNodesChange(updatedNodes); // 매 마우스 이동마다 전체 배열 재생성 및 상태 업데이트
}, [nodes, onNodesChange, getDescendantIds, ...]);
```

**영향**:
- 마우스 이동 이벤트는 초당 수십~수백 번 발생
- 매번 전체 노드 배열을 `map()`으로 재생성
- `onNodesChange` 호출로 상위 컴포넌트 리렌더링
- React의 상태 업데이트 배치 처리에도 불구하고 과도한 연산

**예상 성능 저하**:
- 노드 100개 기준: 매 이벤트마다 100번의 객체 생성 + 상태 업데이트
- 초당 60회 이벤트 발생 시: 초당 6,000번의 객체 생성

---

### 2. handleNodesChange의 즉시 상태 업데이트 (High)

**위치**: `app/mindmap/[projectId]/page.tsx:264-297`

**문제점**:
```typescript
const handleNodesChange = async (newNodes: MindMapNode[]) => {
  // React 상태 즉시 업데이트 (UI 반응성)
  setNodes(newNodes);
  if (project) {
    setProject({
      ...project,
      nodes: newNodes,
      updatedAt: Date.now(),
    });
  }
  // DB 저장은 디바운싱되지만 상태 업데이트는 즉시
}
```

**영향**:
- 드래그 중 매번 두 개의 상태 업데이트 (`setNodes`, `setProject`)
- `project` 객체 전체를 새로 생성하여 불필요한 리렌더링 유발
- 디바운싱은 DB 저장에만 적용되고, 상태 업데이트는 즉시 발생

---

### 3. saveNodes 함수의 복잡한 로직 (High)

**위치**: `lib/supabase/data.ts:322-648`

**문제점**:
```typescript
export async function saveNodes(projectId: string, nodes: MindMapNode[]): Promise<boolean> {
  // 1. 계층별 정렬 (재귀적)
  const sortedNodes = sortNodesByHierarchy(nodes);
  
  // 2. 부모 노드 조회 (재귀적으로 모든 조상 포함)
  // while 루프로 누락된 부모 노드들을 DB에서 조회
  
  // 3. 계층별로 다시 정렬
  const sortedNodesWithParents = sortNodesByHierarchy(nodesToSave);
  
  // 4. 각 레벨별로 upsert (순차적)
  for (let levelIndex = 0; levelIndex < sortedNodesWithParents.length; levelIndex++) {
    // ...
  }
}
```

**영향**:
- 노드 수가 많을수록 정렬 연산 시간 증가 (O(n²) 또는 그 이상)
- 부모 노드 조회를 위한 반복적인 DB 쿼리
- 계층별 순차 저장으로 인한 지연

**예상 성능 저하**:
- 노드 100개: 약 100-500ms
- 노드 500개: 약 1-3초

---

### 4. 불필요한 배열 순회 (Medium)

**위치**: 여러 곳

**문제점**:
```typescript
// 매번 전체 배열을 순회
const node = nodes.find(n => n.id === nodeId);
const children = nodes.filter(n => n.parentId === nodeId);
const updatedNodes = nodes.map(node => { ... });
```

**영향**:
- `find`, `filter`, `map`이 O(n) 시간 복잡도
- 같은 노드를 여러 번 찾는 경우가 많음
- 인덱스 맵이나 캐시 없이 매번 선형 탐색

**예상 성능 저하**:
- 노드 100개 기준: 각 연산마다 최대 100번 비교
- 여러 연산이 중첩되면 O(n²) 또는 O(n³) 복잡도

---

### 5. getDescendantIds의 재귀적 호출 (Medium)

**위치**: `components/mindmap/MindMapCanvas.tsx:229-239`

**문제점**:
```typescript
const getDescendantIds = useCallback((nodeId: string): string[] => {
  const descendants: string[] = [];
  const children = nodes.filter(n => n.parentId === nodeId); // 매번 전체 배열 필터링
  
  children.forEach(child => {
    descendants.push(child.id);
    descendants.push(...getDescendantIds(child.id)); // 재귀 호출
  });
  
  return descendants;
}, [nodes]);
```

**영향**:
- 드래그 중 매번 호출되어 하위 노드 ID 수집
- 재귀 호출 + 매번 전체 배열 필터링
- 깊은 트리 구조에서 성능 저하

---

### 6. sharedPathMap 계산의 중복 (Low)

**위치**: `components/mindmap/MindMapCanvas.tsx:460-480`

**문제점**:
```typescript
const sharedPathMap = useMemo(() => {
  // DFS로 모든 노드의 공유 경로 여부 계산
  nodes.forEach(n => dfs(n.id));
  return map;
}, [nodes]);
```

**영향**:
- `useMemo`로 최적화되어 있지만, `nodes`가 변경될 때마다 재계산
- 드래그 중 `nodes`가 자주 변경되므로 매번 재계산
- DFS 연산이 모든 노드에 대해 실행

---

### 7. canvasBounds 계산 (Low)

**위치**: `components/mindmap/MindMapCanvas.tsx:483-498`

**문제점**:
```typescript
const canvasBounds = useMemo(() => {
  const nodePositions = nodes.map(n => ({ x: n.x, y: n.y }));
  const minX = Math.min(...nodePositions.map(p => p.x)) - 2000;
  // ...
}, [nodes]);
```

**영향**:
- `useMemo`로 최적화되어 있지만, 드래그 중 매번 재계산
- `Math.min`/`Math.max`에 스프레드 연산자 사용 (큰 배열에서 비효율적)

---

### 8. 연결선 렌더링 최적화 부족 (Medium)

**위치**: `components/mindmap/MindMapCanvas.tsx:537-556`

**문제점**:
```typescript
{nodes.map(node => {
  if (!node.parentId) return null;
  const parent = nodes.find(n => n.id === node.parentId); // 매번 find 호출
  // ...
})}
```

**영향**:
- 렌더링마다 각 노드의 부모를 찾기 위해 전체 배열 순회
- 노드 수가 많을수록 렌더링 시간 증가

---

### 9. 상태 업데이트 배치 처리 부족 (Medium)

**문제점**:
- `setNodes`와 `setProject`가 별도로 호출되어 두 번의 리렌더링 발생
- React 18의 자동 배치 처리가 있지만, 비동기 함수 내에서는 작동하지 않을 수 있음

---

### 10. 디바운싱 타이머 관리 (Low)

**위치**: `app/mindmap/[projectId]/page.tsx:276-295`

**문제점**:
```typescript
if (supabaseUpdateTimeoutRef.current) {
  clearTimeout(supabaseUpdateTimeoutRef.current);
}
supabaseUpdateTimeoutRef.current = setTimeout(async () => {
  await saveNodes(projectId, newNodes);
}, 500);
```

**영향**:
- 디바운싱은 잘 구현되어 있지만, 타이머가 자주 취소되고 재설정됨
- 드래그 중에는 실제로 저장이 거의 발생하지 않아도 타이머 관리 오버헤드

---

## 📊 성능 영향 요약

### 드래그 중 (가장 심각)
- **초당 이벤트**: ~60회
- **노드 100개 기준**:
  - 초당 객체 생성: ~6,000개
  - 초당 상태 업데이트: ~60회
  - 초당 리렌더링: ~60회
- **예상 지연**: 50-200ms (눈에 띄는 버벅임)

### 노드 추가/삭제/편집
- **상태 업데이트**: 즉시 발생
- **DB 저장**: 500ms 디바운싱
- **예상 지연**: 10-50ms (드래그보다 덜 심각)

### 저장 시
- **계층 정렬**: O(n²) 또는 그 이상
- **부모 노드 조회**: 반복적인 DB 쿼리
- **예상 지연**: 100ms-3초 (노드 수에 따라)

---

## 🎯 우선순위별 개선 방안

### Critical (즉시 개선 필요)
1. **드래그 중 상태 업데이트 최적화**
   - 드래그 중에는 임시 상태 사용 (ref)
   - 드래그 종료 시에만 실제 상태 업데이트
   - requestAnimationFrame으로 업데이트 빈도 제한

2. **handleNodesChange 최적화**
   - 드래그 중에는 DB 저장만 디바운싱하고 상태는 즉시 업데이트
   - 또는 드래그 중에는 상태 업데이트도 디바운싱

### High (단기 개선)
3. **노드 인덱스 맵 생성**
   - `Map<nodeId, node>` 형태로 인덱스 생성
   - `find` 대신 `map.get()` 사용 (O(1))

4. **saveNodes 최적화**
   - 계층 정렬 알고리즘 개선
   - 부모 노드 조회를 한 번에 처리
   - 배치 upsert 사용

### Medium (중기 개선)
5. **getDescendantIds 최적화**
   - 결과 캐싱
   - 인덱스 맵 사용

6. **연결선 렌더링 최적화**
   - 부모 노드 인덱스 맵 사용
   - React.memo로 개별 선 최적화

7. **상태 업데이트 배치**
   - `startTransition` 사용
   - 상태 업데이트 그룹화

### Low (장기 개선)
8. **canvasBounds 최적화**
   - 드래그 중에는 bounds 재계산 생략
   - 고정 크기 사용 또는 lazy 계산

9. **sharedPathMap 최적화**
   - 변경된 노드만 재계산
   - 증분 업데이트

---

## 🔧 구체적 개선 제안

### 1. 드래그 최적화 (가장 중요)

```typescript
// 임시 드래그 상태 사용
const [dragState, setDragState] = useState<{
  nodeId: string;
  offset: { x: number; y: number };
  startPos: { x: number; y: number };
} | null>(null);

// 드래그 중에는 임시 좌표만 업데이트 (상태 업데이트 없음)
// 드래그 종료 시에만 실제 상태 업데이트
```

### 2. 노드 인덱스 맵

```typescript
const nodeMap = useMemo(() => {
  return new Map(nodes.map(n => [n.id, n]));
}, [nodes]);

// find 대신
const node = nodeMap.get(nodeId);
```

### 3. 상태 업데이트 디바운싱

```typescript
const debouncedSetNodes = useMemo(
  () => debounce((newNodes: MindMapNode[]) => {
    setNodes(newNodes);
  }, 16), // ~60fps
  []
);
```

### 4. React.memo 활용

```typescript
const MindMapNode = React.memo(({ node, ... }) => {
  // ...
}, (prev, next) => {
  // 커스텀 비교 로직
  return prev.node.id === next.node.id &&
         prev.node.x === next.node.x &&
         prev.node.y === next.node.y &&
         // ...
});
```

---

## 📝 체크리스트

### 즉시 개선
- [ ] 드래그 중 상태 업데이트 최적화
- [ ] 노드 인덱스 맵 생성

### 단기 개선
- [ ] handleNodesChange 최적화
- [ ] saveNodes 최적화
- [ ] getDescendantIds 최적화

### 중기 개선
- [ ] 연결선 렌더링 최적화
- [ ] 상태 업데이트 배치
- [ ] React.memo 적용

### 장기 개선
- [ ] canvasBounds 최적화
- [ ] sharedPathMap 증분 업데이트
- [ ] 가상화 (노드가 매우 많을 경우)

---

## 💡 추가 권장사항

1. **성능 모니터링**
   - React DevTools Profiler 사용
   - 실제 사용자 환경에서 성능 측정

2. **점진적 개선**
   - 한 번에 모든 것을 개선하지 말고 단계적으로
   - 각 개선 후 성능 측정

3. **사용자 피드백**
   - 실제 사용자에게 버벅임 정도 확인
   - 어떤 작업에서 가장 심각한지 파악
