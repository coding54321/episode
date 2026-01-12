# 공유 노드 추가 시 오류 및 원본 노드 삭제 문제 분석

## 문제 현상

1. **노드 추가 시 오류 발생**
   - `insertNode` 함수에서 에러 발생
   - 에러 객체가 비어있음 (`{}`)
   - 콘솔 에러: `[data.ts] insertNode: 노드 추가 실패 {}`

2. **원본 마인드맵 노드가 모두 사라짐**
   - 공유 페이지에서 노드 추가 실패 후 원본 프로젝트의 다른 노드들이 삭제됨

## 원인 분석

### 1. 노드 추가 실패 원인

#### 문제점 1: RLS (Row Level Security) 정책 문제

**가능성: 높음**

공유 페이지에서 노드를 추가할 때, 현재 사용자가 해당 프로젝트의 소유자가 아닐 수 있습니다.

```typescript
// lib/supabase/data.ts:418-439
export async function insertNode(projectId: string, node: MindMapNode): Promise<boolean> {
  const nodeData: any = {
    id: node.id,
    project_id: projectId, // ⚠️ 공유된 프로젝트의 ID
    parent_id: node.parentId || null,
    // ...
  };

  const { error } = await supabase
    .from('nodes')
    .insert(nodeData); // ⚠️ RLS 정책에 의해 차단될 수 있음
}
```

**RLS 정책이 다음과 같이 설정되어 있다면:**
- "사용자는 자신의 프로젝트에만 노드를 추가할 수 있음"
- 공유 페이지의 사용자는 프로젝트 소유자가 아니므로 INSERT가 거부됨

**에러 객체가 비어있는 이유:**
- Supabase의 RLS 정책 위반 시 에러 객체가 제대로 전달되지 않을 수 있음
- 또는 에러 객체의 직렬화 문제

#### 문제점 2: Foreign Key 제약 조건 위반

**가능성: 중간**

`parent_id`가 유효하지 않을 수 있습니다:

```typescript
// app/share/[nodeId]/page.tsx:264-275
const newChild: MindMapNode = {
  id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
  label: defaultLabel,
  parentId: parentId, // ⚠️ 이 parentId가 공유된 노드의 하위 노드인지 확인 필요
  // ...
};
```

**가능한 시나리오:**
- `parentId`가 공유된 노드 트리 밖에 있는 노드일 수 있음
- 하지만 `handleNodeAddChild`에서 `nodes.find(n => n.id === parentId)`로 찾으므로 이 경우는 아닐 가능성이 높음

#### 문제점 3: 필수 필드 누락 또는 데이터 타입 불일치

**가능성: 낮음**

`insertNode` 함수에서 모든 필수 필드를 포함하고 있으므로 가능성은 낮습니다.

### 2. 원본 노드가 사라지는 원인

#### 문제점 1: `handleNodeAddChild`의 로직 문제

**현재 코드:**
```typescript
// app/share/[nodeId]/page.tsx:277-300
const handleNodeAddChild = async (parentId: string, ...) => {
  // ...
  
  // DB에 새 노드 추가
  try {
    const success = await insertNode(sharedData.projectId, newChild);
    if (!success) {
      console.error('[share/page] handleNodeAddChild: 노드 추가 실패');
      return; // ⚠️ 실패 시 return
    }
  } catch (error) {
    console.error('[share/page] handleNodeAddChild: 노드 추가 중 에러', error);
    return; // ⚠️ 실패 시 return
  }

  // 로컬 상태 업데이트 (성공 시에만 실행됨)
  const updatedNodes = nodes.map(node => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, newChild.id] };
    }
    return node;
  });
  updatedNodes.push(newChild);
  setNodes(updatedNodes);
};
```

**분석:**
- `insertNode`가 실패하면 `return`하므로 로컬 상태는 업데이트되지 않음
- 하지만 원본 노드가 사라진다는 것은 다른 곳에서 전체 저장이 일어났을 가능성

#### 문제점 2: `handleNodesChange`가 예상치 못하게 호출됨

**현재 코드:**
```typescript
// app/share/[nodeId]/page.tsx:142-184
const handleNodesChange = async (newNodes: MindMapNode[]) => {
  if (isReadOnly || !sharedData) return;

  setNodes(newNodes); // ⚠️ 즉시 상태 업데이트

  try {
    const previousNodes = nodes; // ⚠️ 클로저 문제 가능성
    const previousNodeMap = new Map(previousNodes.map(n => [n.id, n]));
    
    for (const newNode of newNodes) {
      const oldNode = previousNodeMap.get(newNode.id);
      
      if (!oldNode) {
        // 새 노드는 insertNode로 처리하지 않음
        continue; // ⚠️ 새 노드는 DB에 저장되지 않음
      }
      
      // 위치 변경만 처리
      if (oldNode.x !== newNode.x || oldNode.y !== newNode.y) {
        await updateNode(sharedData.projectId, newNode.id, {
          x: newNode.x,
          y: newNode.y,
        });
      }
    }
  } catch (error) {
    console.error('[share/page] handleNodesChange: 노드 업데이트 실패', error);
  }
};
```

**문제점:**
1. **클로저 문제**: `const previousNodes = nodes;`는 함수 호출 시점의 `nodes` 상태를 캡처합니다. 하지만 `setNodes(newNodes)`로 상태가 업데이트된 후, 다른 곳에서 `handleNodesChange`가 다시 호출되면 이전 상태를 참조할 수 있습니다.

2. **부모 노드의 children 업데이트 누락**: 
   ```typescript
   // handleNodeAddChild에서 부모 노드의 children 배열을 업데이트
   const updatedNodes = nodes.map(node => {
     if (node.id === parentId) {
       return { ...node, children: [...node.children, newChild.id] };
     }
     return node;
   });
   updatedNodes.push(newChild);
   setNodes(updatedNodes); // ⚠️ 이 상태 변경이 handleNodesChange를 트리거할 수 있음
   ```

3. **MindMapCanvas의 동작**: `MindMapCanvas` 컴포넌트가 내부적으로 `onNodesChange`를 호출할 수 있습니다. 예를 들어:
   - 노드 드래그 시
   - 노드 추가 후 자동 정렬
   - 다른 이벤트 핸들러

#### 문제점 3: `handleNodeAddChild` 실패 후에도 상태가 변경됨

**시나리오:**
1. 사용자가 노드 추가 버튼 클릭
2. `handleNodeAddChild` 실행
3. `insertNode` 실패 (RLS 정책 위반)
4. `return`으로 함수 종료
5. 하지만 `MindMapCanvas`나 다른 컴포넌트에서 이미 상태 변경이 일어났을 수 있음
6. `handleNodesChange`가 호출되어 `newNodes`에 새 노드가 포함됨
7. `handleNodesChange`에서 새 노드는 건너뛰지만, 다른 노드들의 위치가 변경되었을 수 있음
8. 하지만 실제 문제는 **`handleNodesChange`가 호출될 때 `previousNodes`가 잘못된 상태를 참조**할 수 있음

#### 문제점 4: `saveNodes`가 어딘가에서 호출됨

**가능성: 낮음**

코드를 확인한 결과 공유 페이지에서는 `saveNodes`를 import하지 않았습니다. 하지만 다른 곳에서 호출되었을 가능성도 있습니다.

## 근본 원인 추정

### 가장 가능성 높은 시나리오:

1. **RLS 정책 위반으로 `insertNode` 실패**
   - 공유 페이지 사용자가 프로젝트 소유자가 아님
   - RLS 정책이 INSERT를 차단
   - 에러 객체가 제대로 전달되지 않음

2. **`handleNodeAddChild` 실패 후 상태 불일치**
   - `insertNode` 실패로 `return`
   - 하지만 `MindMapCanvas`나 다른 컴포넌트에서 이미 상태 변경이 일어남
   - `handleNodesChange`가 호출되어 예상치 못한 동작 발생

3. **`handleNodesChange`의 클로저 문제**
   - `const previousNodes = nodes;`가 잘못된 시점의 상태를 참조
   - 새 노드가 포함된 상태로 `handleNodesChange`가 호출되면, `previousNodes`에 새 노드가 없어서 건너뛰지만, 다른 노드들의 위치가 변경되었을 수 있음

## 해결 방안 (제안)

### 1. RLS 정책 확인 및 수정
- 공유된 노드에 대한 INSERT 권한 확인
- 공유 페이지 사용자도 노드를 추가할 수 있도록 RLS 정책 수정

### 2. 에러 로깅 개선
- `insertNode` 함수에서 에러 객체를 더 자세히 로깅
- RLS 정책 위반인지 확인

### 3. `handleNodesChange` 로직 개선
- 클로저 문제 해결 (useRef 사용)
- 새 노드가 포함된 경우 명시적으로 처리

### 4. `handleNodeAddChild` 개선
- 실패 시 롤백 로직 추가
- 상태 업데이트 전에 DB 저장 확인

## 추가 조사 필요 사항

1. **RLS 정책 확인**
   - `nodes` 테이블의 RLS 정책이 어떻게 설정되어 있는지 확인
   - 공유 페이지 사용자가 INSERT할 수 있는지 확인

2. **에러 객체 상세 정보**
   - 브라우저 개발자 도구에서 네트워크 탭 확인
   - Supabase 응답 확인

3. **상태 변경 추적**
   - `handleNodesChange`가 언제 호출되는지 로깅
   - `handleNodeAddChild` 실행 전후 상태 비교

4. **MindMapCanvas 동작 확인**
   - `MindMapCanvas` 컴포넌트가 `onNodesChange`를 언제 호출하는지 확인
