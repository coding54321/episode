# 공유 노드 협업 기능 설계

## 목표
- 공유 링크를 받은 사용자가 **로그인 없이** 바로 CRUD 가능
- 피그마처럼 **실시간 커서 팔로잉** 및 **사용자 표시** 기능
- 나중에 로그인하면 세션 연결 가능

## 해결 방안

### 1. 익명 세션 시스템

#### 접근 방식
공유 링크 접근 시 자동으로 **임시 세션 ID** 생성:
- `localStorage`에 `anonymous_session_${nodeId}` 저장
- 세션 ID 형식: `anon_${timestamp}_${random}`
- 세션 정보: `{ sessionId, nickname, color, joinedAt }`

#### 구현 예시
```typescript
// lib/shared-session.ts
export interface AnonymousSession {
  sessionId: string;
  nickname: string;
  color: string; // 커서 색상
  joinedAt: number;
}

export function getOrCreateAnonymousSession(nodeId: string): AnonymousSession {
  const key = `anonymous_session_${nodeId}`;
  const existing = localStorage.getItem(key);
  
  if (existing) {
    return JSON.parse(existing);
  }
  
  const session: AnonymousSession = {
    sessionId: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nickname: `게스트 ${Math.floor(Math.random() * 1000)}`,
    color: generateRandomColor(),
    joinedAt: Date.now(),
  };
  
  localStorage.setItem(key, JSON.stringify(session));
  return session;
}
```

### 2. YJS Awareness 활용

YJS의 **Awareness** 기능을 사용하여 실시간 사용자 정보 동기화:

```typescript
// lib/yjs/shared-provider.ts
import * as Y from 'yjs';
import { SupabaseProvider } from './supabase-provider';

export class SharedNodeProvider extends SupabaseProvider {
  private awareness: Y.Awareness;
  private session: AnonymousSession;
  
  constructor(ydoc: Y.Doc, options: { projectId: string; nodeId: string; session: AnonymousSession }) {
    super(ydoc, { projectId: options.projectId });
    this.session = options.session;
    this.awareness = new Y.Awareness(ydoc);
    
    // Awareness 상태 설정
    this.awareness.setLocalStateField('user', {
      sessionId: this.session.sessionId,
      nickname: this.session.nickname,
      color: this.session.color,
      cursor: null, // { x, y } - 마우스 위치
      selection: null, // 선택한 노드 ID
    });
    
    // 마우스 이동 감지
    this.setupCursorTracking();
    
    // 다른 사용자의 Awareness 변경 감지
    this.awareness.on('change', this.handleAwarenessChange);
  }
  
  private setupCursorTracking() {
    // 마우스 이동 시 커서 위치 업데이트
    document.addEventListener('mousemove', (e) => {
      const canvas = document.querySelector('.mindmap-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        this.awareness.setLocalStateField('user', {
          ...this.awareness.getLocalState()?.user,
          cursor: {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          },
        });
      }
    });
  }
  
  private handleAwarenessChange = (changes: any) => {
    // 다른 사용자의 커서/선택 상태 변경 감지
    // UI에 표시 (커서, 아바타 등)
  };
}
```

### 3. UI 컴포넌트

#### 사용자 목록 표시
```typescript
// components/shared/ActiveUsers.tsx
export function ActiveUsers({ awareness }: { awareness: Y.Awareness }) {
  const [users, setUsers] = useState<Map<number, any>>(new Map());
  
  useEffect(() => {
    const updateUsers = () => {
      const states = awareness.getStates();
      setUsers(new Map(states));
    };
    
    awareness.on('change', updateUsers);
    updateUsers();
    
    return () => awareness.off('change', updateUsers);
  }, [awareness]);
  
  return (
    <div className="flex items-center gap-2">
      {Array.from(users.values()).map((user, index) => (
        <div
          key={index}
          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: user.color }}
          />
          <span className="text-sm font-medium text-gray-700">
            {user.nickname}
          </span>
        </div>
      ))}
    </div>
  );
}
```

#### 커서 표시
```typescript
// components/shared/RemoteCursors.tsx
export function RemoteCursors({ awareness }: { awareness: Y.Awareness }) {
  const [cursors, setCursors] = useState<Map<number, any>>(new Map());
  
  useEffect(() => {
    const updateCursors = () => {
      const states = awareness.getStates();
      const cursorMap = new Map();
      
      states.forEach((state, clientId) => {
        if (state.user?.cursor) {
          cursorMap.set(clientId, {
            ...state.user,
            clientId,
          });
        }
      });
      
      setCursors(cursorMap);
    };
    
    awareness.on('change', updateCursors);
    updateCursors();
    
    return () => awareness.off('change', updateCursors);
  }, [awareness]);
  
  return (
    <>
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.clientId}
          className="fixed pointer-events-none z-50"
          style={{
            left: cursor.cursor.x,
            top: cursor.cursor.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: cursor.color }}
          />
          <div
            className="absolute top-5 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap"
          >
            {cursor.nickname}
          </div>
        </div>
      ))}
    </>
  );
}
```

### 4. 공유 노드 페이지 수정

```typescript
// app/share/[nodeId]/page.tsx 수정
export default function SharePage() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  const [session, setSession] = useState<AnonymousSession | null>(null);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Y.Awareness | null>(null);
  const [provider, setProvider] = useState<SharedNodeProvider | null>(null);
  
  useEffect(() => {
    // 1. 익명 세션 생성/로드
    const session = getOrCreateAnonymousSession(nodeId);
    setSession(session);
    
    // 2. YJS 문서 초기화
    const ydoc = new Y.Doc();
    setYdoc(ydoc);
    
    // 3. 공유 노드 데이터 로드
    loadSharedNodeData(nodeId).then((sharedData) => {
      // YJS Map에 노드 데이터 설정
      nodesToYjsMap(ydoc, [sharedData.node, ...sharedData.descendants]);
    });
    
    // 4. Provider 생성 (Awareness 포함)
    const provider = new SharedNodeProvider(ydoc, {
      projectId: sharedData.projectId,
      nodeId,
      session,
    });
    setProvider(provider);
    setAwareness(provider.awareness);
    
    return () => {
      provider.destroy();
    };
  }, [nodeId]);
  
  // ... 나머지 코드
}
```

### 5. 닉네임 변경 기능 (선택적)

```typescript
// components/shared/NicknameDialog.tsx
export function NicknameDialog({
  session,
  onUpdate,
}: {
  session: AnonymousSession;
  onUpdate: (nickname: string) => void;
}) {
  const [nickname, setNickname] = useState(session.nickname);
  const [isOpen, setIsOpen] = useState(!session.nickname.startsWith('게스트'));
  
  const handleSave = () => {
    const updated = { ...session, nickname };
    localStorage.setItem(`anonymous_session_${session.nodeId}`, JSON.stringify(updated));
    onUpdate(nickname);
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogTitle>닉네임 설정</DialogTitle>
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임을 입력하세요"
        />
        <Button onClick={handleSave}>저장</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. 나중에 로그인 연결

```typescript
// 로그인 후 익명 세션을 계정에 연결
export async function linkAnonymousSessionToAccount(
  userId: string,
  nodeId: string
) {
  const session = getOrCreateAnonymousSession(nodeId);
  
  // Supabase에 세션 연결 정보 저장
  await supabase.from('anonymous_sessions').upsert({
    session_id: session.sessionId,
    user_id: userId,
    node_id: nodeId,
    linked_at: Date.now(),
  });
  
  // localStorage에서 제거 (선택적)
  localStorage.removeItem(`anonymous_session_${nodeId}`);
}
```

## 구현 단계

### Phase 1: 기본 CRUD (현재)
- ✅ 공유 링크로 접근 가능
- ✅ 읽기 전용 뷰

### Phase 2: 익명 CRUD
- [ ] 익명 세션 생성
- [ ] YJS Provider를 공유 노드에 연결
- [ ] CRUD 기능 활성화
- [ ] Supabase RLS 정책 수정 (공유 노드는 읽기/쓰기 허용)

### Phase 3: Awareness 기본
- [ ] YJS Awareness 설정
- [ ] 사용자 목록 표시
- [ ] 기본 커서 표시

### Phase 4: 고급 기능
- [ ] 커서 팔로잉 (선택한 사용자 따라가기)
- [ ] 선택한 노드 하이라이트
- [ ] 실시간 편집 표시 (누가 편집 중인지)
- [ ] 닉네임 변경
- [ ] 색상 선택

### Phase 5: 계정 연결
- [ ] 로그인 후 익명 세션 연결
- [ ] 편집 히스토리 저장

## 보안 고려사항

1. **RLS 정책**: 공유된 노드는 읽기/쓰기 허용, 하지만 프로젝트 전체는 보호
2. **Rate Limiting**: 익명 사용자도 과도한 요청 방지
3. **스팸 방지**: IP 기반 또는 세션 기반 제한
4. **데이터 검증**: 클라이언트에서 전송하는 데이터 검증

## 데이터베이스 스키마 추가

```sql
-- 익명 세션 테이블 (선택적, 추적용)
CREATE TABLE anonymous_sessions (
  session_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  user_id TEXT, -- 나중에 로그인하면 연결
  nickname TEXT,
  color TEXT,
  joined_at BIGINT,
  last_active_at BIGINT,
  linked_at BIGINT, -- 계정 연결 시각
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- 공유 노드 접근 로그 (선택적)
CREATE TABLE shared_node_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id TEXT NOT NULL,
  session_id TEXT,
  user_id TEXT,
  action TEXT, -- 'view', 'edit', 'create', 'delete'
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);
```

## 결론

**추천 접근 방식:**
1. **즉시 구현**: 익명 세션 + YJS Awareness 기본 기능
2. **점진적 개선**: 커서 팔로잉, 고급 UI는 나중에
3. **로그인은 선택적**: 나중에 계정 연결 기능 추가

이렇게 하면 **로그인 없이도 바로 협업 가능**하면서, **나중에 피그마 같은 기능**도 추가할 수 있습니다.
