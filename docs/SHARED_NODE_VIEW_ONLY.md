# 공유 노드 View-Only + 로그인 편집 플로우

## 핵심 아이디어

- **공유 받은 상태 (익명)**: **View만 가능** (읽기 전용)
- **편집하려면**: **로그인 필요**
- **로그인 후**: CRUD 가능 + 실시간 협업 (피그마 스타일)

## 장점

1. ✅ **안전성**: 익명 사용자는 조회만 가능
2. ✅ **책임 추적**: 편집은 로그인한 사용자만 가능 → 누가 편집했는지 명확
3. ✅ **구현 단순**: 복잡한 익명 세션 관리 불필요
4. ✅ **명확한 권한**: View vs Edit 권한이 명확히 구분됨

## 플로우

### 1. 공유 링크 접근 (익명)

```
사용자 → 공유 링크 클릭
  ↓
공유 노드 페이지 로드 (읽기 전용)
  ↓
- 노드 조회 가능 ✅
- 줌/팬 가능 ✅
- 편집 불가 ❌ (버튼 비활성화 또는 숨김)
  ↓
"편집하려면 로그인하세요" CTA 표시
```

### 2. 로그인 후 편집

```
사용자 → "로그인하여 편집하기" 클릭
  ↓
로그인 페이지
  ↓
로그인 완료
  ↓
공유 노드 페이지로 리다이렉트 (편집 모드)
  ↓
- 노드 CRUD 가능 ✅
- 실시간 협업 가능 ✅ (YJS Awareness)
- 다른 편집자 표시 ✅
```

## 구현

### 1. 공유 노드 페이지 수정

```typescript
// app/share/[nodeId]/page.tsx
export default function SharePage() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  const [sharedData, setSharedData] = useState<SharedNodeData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(true);
  
  useEffect(() => {
    // 1. 공유 노드 데이터 로드
    loadSharedNodeData(nodeId).then(setSharedData);
    
    // 2. 로그인 상태 확인
    checkAuthStatus().then((authUser) => {
      if (authUser) {
        setUser(authUser);
        setIsAuthenticated(true);
        setIsReadOnly(false); // 로그인하면 편집 가능
      }
    });
  }, [nodeId]);
  
  // 로그인 핸들러
  const handleLogin = () => {
    router.push(`/login?redirect=/share/${nodeId}`);
  };
  
  // YJS 초기화 (로그인한 경우만)
  useEffect(() => {
    if (!isAuthenticated || !sharedData) return;
    
    const ydoc = new Y.Doc();
    nodesToYjsMap(ydoc, [sharedData.node, ...sharedData.descendants]);
    
    const provider = new SharedNodeProvider(ydoc, {
      projectId: sharedData.projectId,
      nodeId,
      user, // 로그인한 사용자 정보
    });
    
    return () => provider.destroy();
  }, [isAuthenticated, sharedData, user]);
  
  return (
    <div>
      {/* 헤더 */}
      <header>
        {!isAuthenticated && (
          <Button onClick={handleLogin}>
            로그인하여 편집하기
          </Button>
        )}
        {isAuthenticated && (
          <div>
            <span>{user.name}님</span>
            <ActiveUsers awareness={provider.awareness} />
          </div>
        )}
      </header>
      
      {/* 마인드맵 캔버스 */}
      <MindMapCanvas
        nodes={allNodes}
        isReadOnly={isReadOnly} // 읽기 전용 모드
        onNodesChange={isReadOnly ? undefined : handleNodesChange}
        // ... 기타 props
      />
      
      {/* 편집 불가 안내 */}
      {isReadOnly && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 shadow-lg">
          <p className="text-sm text-blue-900">
            편집하려면 <button onClick={handleLogin} className="underline font-semibold">로그인</button>이 필요합니다
          </p>
        </div>
      )}
    </div>
  );
}
```

### 2. MindMapCanvas에 ReadOnly 모드 추가

```typescript
// components/mindmap/MindMapCanvas.tsx
interface MindMapCanvasProps {
  // ... 기존 props
  isReadOnly?: boolean; // 읽기 전용 모드
}

export default function MindMapCanvas({
  // ... 기존 props
  isReadOnly = false,
}: MindMapCanvasProps) {
  // 읽기 전용일 때 편집 기능 비활성화
  const handleNodeAddChild = useCallback((parentId: string, direction?: 'right' | 'left' | 'top' | 'bottom') => {
    if (isReadOnly) {
      // 읽기 전용이면 아무것도 하지 않음
      return;
    }
    onNodeAddChild(parentId, direction);
  }, [isReadOnly, onNodeAddChild]);
  
  const handleDelete = useCallback((nodeId: string) => {
    if (isReadOnly) return;
    onNodeDelete(nodeId);
  }, [isReadOnly, onNodeDelete]);
  
  // ... 나머지 코드
  
  return (
    <div>
      {/* 노드 렌더링 */}
      {nodes.map(node => (
        <MindMapNode
          key={node.id}
          node={node}
          isReadOnly={isReadOnly} // 읽기 전용 전달
          // ... 기타 props
        />
      ))}
    </div>
  );
}
```

### 3. MindMapNode에 ReadOnly 모드 추가

```typescript
// components/mindmap/MindMapNode.tsx
interface MindMapNodeProps {
  // ... 기존 props
  isReadOnly?: boolean;
}

export default function MindMapNode({
  // ... 기존 props
  isReadOnly = false,
}: MindMapNodeProps) {
  return (
    <div>
      {/* 노드 내용 */}
      <div>{node.label}</div>
      
      {/* 편집 버튼들 - 읽기 전용이면 숨김 */}
      {!isReadOnly && (isHovered || isSelected) && (
        <>
          {/* 추가 버튼 */}
          <button onClick={() => onAddChild(node.id, 'right')}>
            <Plus />
          </button>
          
          {/* 삭제 버튼 */}
          {canDelete && (
            <button onClick={() => onDelete(node.id)}>
              ×
            </button>
          )}
        </>
      )}
      
      {/* 읽기 전용일 때 편집 불가 표시 */}
      {isReadOnly && isHovered && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
          편집하려면 로그인하세요
        </div>
      )}
    </div>
  );
}
```

### 4. 로그인 후 리다이렉트 처리

```typescript
// app/login/page.tsx
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect'); // /share/[nodeId]
  
  const handleLoginSuccess = async (user: User) => {
    // 로그인 성공 후 리다이렉트
    if (redirect) {
      router.push(redirect);
    } else {
      router.push('/mindmaps');
    }
  };
  
  // ... 로그인 로직
}
```

### 5. 접근 로그 (선택적)

편집한 사람만 로그에 남기면 됨:

```typescript
// 편집 시에만 로그 저장
const handleNodesChange = async (newNodes: MindMapNode[]) => {
  if (!isAuthenticated || !user) return;
  
  // 노드 업데이트
  await updateNodes(newNodes);
  
  // 편집 로그 저장 (로그인한 사용자만)
  await logSharedNodeEdit(nodeId, {
    userId: user.id,
    userName: user.name,
    action: 'edit',
    timestamp: Date.now(),
  });
};
```

## UI/UX 개선

### 1. 읽기 전용 모드 시각적 표시

```typescript
// 읽기 전용일 때 전체 캔버스에 오버레이
{isReadOnly && (
  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
    <Card className="p-6 max-w-md">
      <h3 className="text-lg font-bold mb-2">읽기 전용 모드</h3>
      <p className="text-sm text-gray-600 mb-4">
        이 노드는 조회만 가능합니다. 편집하려면 로그인이 필요합니다.
      </p>
      <Button onClick={handleLogin} className="w-full">
        로그인하여 편집하기
      </Button>
    </Card>
  </div>
)}
```

### 2. 편집 버튼 비활성화 (더 나은 UX)

읽기 전용일 때 버튼을 완전히 숨기는 대신, 비활성화하고 툴팁 표시:

```typescript
{isReadOnly ? (
  <button
    disabled
    className="opacity-50 cursor-not-allowed"
    title="편집하려면 로그인하세요"
  >
    <Plus />
  </button>
) : (
  <button onClick={() => onAddChild(node.id)}>
    <Plus />
  </button>
)}
```

## 데이터베이스 스키마 (간소화)

```sql
-- 공유 노드 편집 로그 (로그인한 사용자만)
CREATE TABLE shared_node_edit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- 로그인한 사용자만
  user_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'edit', 'create', 'delete'
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX idx_shared_node_edit_node_id ON shared_node_edit_logs(node_id);
CREATE INDEX idx_shared_node_edit_user_id ON shared_node_edit_logs(user_id);
```

## 구현 단계

### Phase 1: 읽기 전용 모드 (기본)
- [ ] 공유 노드 페이지에 읽기 전용 모드 추가
- [ ] 로그인 상태 확인
- [ ] 편집 버튼 비활성화/숨김
- [ ] "로그인하여 편집하기" CTA 추가

### Phase 2: 로그인 후 편집
- [ ] 로그인 페이지에 리다이렉트 파라미터 처리
- [ ] 로그인 후 공유 노드 페이지로 리다이렉트
- [ ] 편집 모드 활성화
- [ ] YJS Provider 연결 (로그인한 경우만)

### Phase 3: 실시간 협업 (로그인한 사용자만)
- [ ] YJS Awareness 설정
- [ ] 현재 편집 중인 사용자 표시
- [ ] 커서 팔로잉
- [ ] 편집 로그 저장

### Phase 4: 편집 히스토리 (선택적)
- [ ] 편집 로그 조회 페이지
- [ ] 누가 언제 편집했는지 표시

## 보안 고려사항

1. **RLS 정책**: 공유된 노드는 읽기만 허용, 편집은 로그인한 사용자만
2. **권한 확인**: 편집 시 항상 사용자 인증 확인
3. **데이터 검증**: 클라이언트에서 전송하는 데이터 검증

## 결론

**이 방식의 장점:**
- ✅ 구현이 더 간단함
- ✅ 보안이 더 강함 (익명 편집 불가)
- ✅ 책임 추적이 명확함 (로그인한 사용자만 편집)
- ✅ 공유한 사람이 누가 편집했는지 명확히 알 수 있음
- ✅ 실시간 협업은 로그인한 사용자들끼리만 가능

**추천: 이 방식으로 구현**
