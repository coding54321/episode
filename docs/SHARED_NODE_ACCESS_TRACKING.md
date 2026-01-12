# 공유 노드 접근자 추적 시스템

## 문제점
익명 세션만으로는 공유한 사람이 누가 접근했는지 알기 어렵습니다.

## 해결 방안

### 1. 접근자 추적 시스템

#### 접근 로그 저장
```typescript
// lib/shared-access-log.ts
export interface SharedNodeAccess {
  id: string;
  nodeId: string;
  sessionId: string; // 익명 세션 ID
  userId?: string; // 로그인한 경우
  nickname: string; // 사용자가 입력한 닉네임
  color: string; // 커서 색상
  action: 'view' | 'edit' | 'create' | 'delete';
  accessedAt: number;
  lastActiveAt: number;
  ipAddress?: string; // 선택적 (개인정보 고려)
}

// 접근 로그 저장
export async function logSharedNodeAccess(
  nodeId: string,
  session: AnonymousSession,
  action: 'view' | 'edit' | 'create' | 'delete'
) {
  await supabase.from('shared_node_access_logs').insert({
    node_id: nodeId,
    session_id: session.sessionId,
    nickname: session.nickname,
    color: session.color,
    action,
    accessed_at: Date.now(),
    last_active_at: Date.now(),
  });
}
```

### 2. 닉네임 필수 입력 (최소 식별)

공유 링크 접근 시 **닉네임을 필수로 입력**하게 하여 최소한의 식별 가능:

```typescript
// components/shared/NicknameDialog.tsx
export function NicknameDialog({
  onConfirm,
}: {
  onConfirm: (nickname: string) => void;
}) {
  const [nickname, setNickname] = useState('');
  const [isOpen, setIsOpen] = useState(true); // 처음엔 항상 열림
  
  const handleConfirm = () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요');
      return;
    }
    onConfirm(nickname.trim());
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}> {/* 닫기 불가 */}
      <DialogContent>
        <DialogTitle>닉네임을 입력하세요</DialogTitle>
        <p className="text-sm text-gray-600 mb-4">
          공유된 노드에 참여하기 위해 닉네임이 필요합니다.
        </p>
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
          autoFocus
        />
        <Button onClick={handleConfirm} disabled={!nickname.trim()}>
          시작하기
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. 실시간 참여자 목록 (YJS Awareness)

공유한 사람이 **현재 접속 중인 사람들을 실시간으로** 볼 수 있게:

```typescript
// components/shared/ActiveParticipants.tsx
export function ActiveParticipants({
  awareness,
  isOwner,
}: {
  awareness: Y.Awareness;
  isOwner: boolean; // 공유한 사람인지
}) {
  const [participants, setParticipants] = useState<Map<number, any>>(new Map());
  
  useEffect(() => {
    const updateParticipants = () => {
      const states = awareness.getStates();
      setParticipants(new Map(states));
    };
    
    awareness.on('change', updateParticipants);
    updateParticipants();
    
    return () => awareness.off('change', updateParticipants);
  }, [awareness]);
  
  if (!isOwner) return null; // 공유한 사람만 볼 수 있음
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        현재 참여 중 ({participants.size}명)
      </h3>
      <div className="space-y-2">
        {Array.from(participants.values()).map((state, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: state.user?.color }}
            />
            <span className="text-sm font-medium text-gray-700">
              {state.user?.nickname || '익명'}
            </span>
            {state.user?.userId && (
              <span className="text-xs text-gray-500">(로그인)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. 접근 로그 대시보드

공유한 사람이 **누가 언제 접근했는지** 볼 수 있는 페이지:

```typescript
// app/mindmap/[projectId]/shared/[nodeId]/analytics/page.tsx
export default function SharedNodeAnalytics() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  const [accessLogs, setAccessLogs] = useState<SharedNodeAccess[]>([]);
  
  useEffect(() => {
    loadAccessLogs(nodeId).then(setAccessLogs);
  }, [nodeId]);
  
  // 세션별로 그룹화 (같은 사람이 여러 번 접근한 경우)
  const sessions = useMemo(() => {
    const sessionMap = new Map<string, SharedNodeAccess[]>();
    accessLogs.forEach(log => {
      const existing = sessionMap.get(log.sessionId) || [];
      sessionMap.set(log.sessionId, [...existing, log]);
    });
    return Array.from(sessionMap.entries()).map(([sessionId, logs]) => ({
      sessionId,
      nickname: logs[0].nickname,
      color: logs[0].color,
      userId: logs[0].userId,
      firstAccess: Math.min(...logs.map(l => l.accessedAt)),
      lastAccess: Math.max(...logs.map(l => l.lastActiveAt)),
      accessCount: logs.length,
      actions: logs.map(l => l.action),
    }));
  }, [accessLogs]);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">접근 로그</h1>
      
      <div className="space-y-4">
        {sessions.map((session) => (
          <Card key={session.sessionId} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: session.color }}
                />
                <div>
                  <p className="font-semibold">{session.nickname}</p>
                  {session.userId && (
                    <p className="text-xs text-gray-500">로그인 사용자</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {new Date(session.firstAccess).toLocaleString('ko-KR')}
                </p>
                <p className="text-xs text-gray-500">
                  {session.accessCount}회 접근
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {session.actions.map((action, i) => (
                <Badge key={i} variant="outline">
                  {action === 'view' && '조회'}
                  {action === 'edit' && '편집'}
                  {action === 'create' && '생성'}
                  {action === 'delete' && '삭제'}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 5. 공유 노드 관리 페이지

공유한 사람이 **공유된 노드 목록과 접근 통계**를 볼 수 있는 페이지:

```typescript
// app/mindmap/[projectId]/shared/page.tsx
export default function SharedNodesPage() {
  const [sharedNodes, setSharedNodes] = useState<SharedNodeData[]>([]);
  const [accessStats, setAccessStats] = useState<Map<string, any>>(new Map());
  
  useEffect(() => {
    loadSharedNodes().then(setSharedNodes);
  }, []);
  
  useEffect(() => {
    // 각 공유 노드의 접근 통계 로드
    sharedNodes.forEach(node => {
      loadAccessStats(node.nodeId).then(stats => {
        setAccessStats(prev => new Map(prev).set(node.nodeId, stats));
      });
    });
  }, [sharedNodes]);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">공유된 노드</h1>
      
      <div className="space-y-4">
        {sharedNodes.map(node => {
          const stats = accessStats.get(node.nodeId);
          return (
            <Card key={node.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{node.node.label}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(node.createdAt).toLocaleDateString('ko-KR')} 공유
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {stats?.totalAccess || 0}회 접근
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats?.uniqueVisitors || 0}명의 방문자
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/share/${node.nodeId}`}>
                  <Button variant="outline" size="sm">
                    링크 열기
                  </Button>
                </Link>
                <Link href={`/mindmap/${node.projectId}/shared/${node.nodeId}/analytics`}>
                  <Button variant="outline" size="sm">
                    접근 로그 보기
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

## 개선된 접근 방식

### 옵션 A: 닉네임 필수 + 접근 로그 (추천)
- ✅ **닉네임 필수 입력**: 최소한의 식별 가능
- ✅ **접근 로그 저장**: 누가 언제 접근했는지 기록
- ✅ **실시간 참여자 목록**: 현재 접속 중인 사람들 표시
- ✅ **접근 통계 대시보드**: 공유한 사람이 통계 확인 가능

### 옵션 B: 선택적 로그인
- 로그인하면 이름 표시, 안 하면 익명
- 공유한 사람은 로그인한 사람만 볼 수 있게 설정 가능

### 옵션 C: 완전 익명 (기존)
- ❌ 접근자 추적 불가
- ❌ 통계 확인 불가

## 데이터베이스 스키마

```sql
-- 공유 노드 접근 로그
CREATE TABLE shared_node_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id TEXT NOT NULL,
  session_id TEXT NOT NULL, -- 익명 세션 ID
  user_id TEXT, -- 로그인한 경우 (선택적)
  nickname TEXT NOT NULL, -- 사용자가 입력한 닉네임
  color TEXT, -- 커서 색상
  action TEXT NOT NULL, -- 'view', 'edit', 'create', 'delete'
  accessed_at BIGINT NOT NULL,
  last_active_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- 인덱스 추가
CREATE INDEX idx_shared_node_access_node_id ON shared_node_access_logs(node_id);
CREATE INDEX idx_shared_node_access_session_id ON shared_node_access_logs(session_id);
CREATE INDEX idx_shared_node_access_accessed_at ON shared_node_access_logs(accessed_at DESC);

-- 접근 통계 뷰 (선택적)
CREATE VIEW shared_node_access_stats AS
SELECT 
  node_id,
  COUNT(DISTINCT session_id) as unique_visitors,
  COUNT(*) as total_access,
  COUNT(DISTINCT CASE WHEN action = 'edit' THEN session_id END) as editors,
  MAX(accessed_at) as last_access
FROM shared_node_access_logs
GROUP BY node_id;
```

## 구현 우선순위

1. **Phase 1**: 닉네임 필수 입력 + 기본 접근 로그
2. **Phase 2**: 실시간 참여자 목록 (YJS Awareness)
3. **Phase 3**: 접근 통계 대시보드
4. **Phase 4**: 고급 통계 (시간대별, 액션별 분석)

## 결론

**추천: 옵션 A (닉네임 필수 + 접근 로그)**
- 공유한 사람이 누가 접근했는지 알 수 있음
- 최소한의 식별 정보 (닉네임) 제공
- 실시간 참여자 확인 가능
- 접근 통계 및 로그 확인 가능

이렇게 하면 익명성의 장점(로그인 없이 바로 사용)을 유지하면서도, 공유한 사람이 접근자를 추적할 수 있습니다.
