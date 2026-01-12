# 공유 링크 localhost 문제 분석

## 문제 현상

공유 링크가 `localhost:3000` 기준으로 생성되어, 배포 환경에서도 로컬호스트로 연결되는 문제가 발생합니다.

## 원인 분석

### 핵심 문제: `window.location.origin` 사용

**문제가 발생하는 코드:**

```typescript
// app/mindmap/[projectId]/page.tsx:531
const updatedNodes = nodes.map(n => 
  n.id === nodeId 
    ? { ...n, isShared: true, sharedLink: `${window.location.origin}/share/${nodeId}` }
    : n
);

// app/mindmap/[projectId]/page.tsx:537
const shareUrl = `${window.location.origin}/share/${nodeId}`;
```

### 문제 발생 시나리오

#### 시나리오 1: 로컬에서 공유 링크 생성

1. **로컬 환경 (`localhost:3000`)에서 노드 공유:**
   - `window.location.origin` = `http://localhost:3000`
   - 생성된 링크: `http://localhost:3000/share/nodeId`
   - DB에 저장: `shared_link = 'http://localhost:3000/share/nodeId'`

2. **배포 환경에서 노드 로드:**
   - DB에서 노드 데이터 로드
   - `sharedLink` 필드에 `http://localhost:3000/share/nodeId` 저장됨
   - UI에 표시되는 링크: `http://localhost:3000/share/nodeId` (잘못된 링크)

#### 시나리오 2: 배포 환경에서 공유 링크 생성

1. **배포 환경에서 노드 공유:**
   - `window.location.origin` = `https://yourdomain.com`
   - 생성된 링크: `https://yourdomain.com/share/nodeId`
   - DB에 저장: `shared_link = 'https://yourdomain.com/share/nodeId'`

2. **로컬 환경에서 노드 로드:**
   - DB에서 노드 데이터 로드
   - `sharedLink` 필드에 `https://yourdomain.com/share/nodeId` 저장됨
   - UI에 표시되는 링크: `https://yourdomain.com/share/nodeId` (로컬에서는 작동하지 않음)

### 근본 원인

1. **클라이언트 사이드 URL 생성**
   - `window.location.origin`은 클라이언트에서 실행되는 시점의 origin을 사용
   - 환경에 따라 다른 값이 생성됨

2. **DB에 절대 URL 저장**
   - 공유 링크를 절대 URL로 DB에 저장
   - 생성 시점의 환경에 따라 고정됨

3. **환경 변수 미사용**
   - 다른 코드에서는 `process.env.NEXT_PUBLIC_SITE_URL`을 사용하는 패턴이 있음
   - 하지만 공유 링크 생성에는 사용하지 않음

## 코드 분석

### 현재 구현

```typescript
// app/mindmap/[projectId]/page.tsx:528-537
const handleNodeShare = async (nodeId: string) => {
  // ...
  
  // 6. 노드의 isShared 상태 업데이트 및 DB 저장
  const updatedNodes = nodes.map(n => 
    n.id === nodeId 
      ? { ...n, isShared: true, sharedLink: `${window.location.origin}/share/${nodeId}` }
      : n
  );
  handleNodesChange(updatedNodes);

  // 8. 공유 링크 복사 및 토스트 표시
  const shareUrl = `${window.location.origin}/share/${nodeId}`;
  // ...
}
```

**문제점:**
- `window.location.origin`은 실행 시점의 origin 사용
- 로컬에서 생성하면 `localhost:3000`으로 저장
- 배포 환경에서 생성하면 배포 URL로 저장
- 하지만 이미 저장된 링크는 변경되지 않음

### 다른 코드의 패턴

```typescript
// lib/auth/unified-auth-context.tsx:282-284
const redirectTo = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
  : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`
```

**차이점:**
- 서버 사이드에서는 `process.env.NEXT_PUBLIC_SITE_URL` 사용
- 클라이언트 사이드에서는 `window.location.origin` 사용
- 하지만 공유 링크는 항상 클라이언트에서 생성되므로 환경 변수를 사용하지 않음

## 영향 범위

### 직접 영향

1. **로컬에서 생성한 공유 링크**
   - 배포 환경에서 접근 불가
   - `localhost:3000`으로 연결 시도 → 실패

2. **배포 환경에서 생성한 공유 링크**
   - 로컬에서 접근 불가
   - 배포 URL로 연결 시도 → 로컬에서는 작동하지 않음

3. **링크 복사 기능**
   - 복사된 링크가 잘못된 URL일 수 있음
   - 사용자가 공유 링크를 다른 사람에게 전달할 때 문제 발생

### 간접 영향

- 공유 기능의 신뢰성 저하
- 사용자 경험 저하

## 해결 방안 (제안)

### 방안 1: 환경 변수 사용 (권장)

```typescript
// 환경 변수로 BASE_URL 설정
const getBaseUrl = () => {
  // 서버 사이드
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || '';
  }
  // 클라이언트 사이드
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
};

const shareUrl = `${getBaseUrl()}/share/${nodeId}`;
```

**장점:**
- 환경에 따라 올바른 URL 생성
- 배포 시 환경 변수만 설정하면 됨

**단점:**
- 환경 변수 설정 필요

### 방안 2: 상대 경로 저장 (가장 안전)

```typescript
// 절대 URL 대신 상대 경로만 저장
const shareUrl = `/share/${nodeId}`;

// DB에 저장할 때도 상대 경로만 저장
const updatedNodes = nodes.map(n => 
  n.id === nodeId 
    ? { ...n, isShared: true, sharedLink: `/share/${nodeId}` }
    : n
);
```

**장점:**
- 환경에 관계없이 작동
- 가장 간단한 해결책

**단점:**
- 링크 복사 시 전체 URL이 필요할 수 있음

### 방안 3: 링크 생성 시점에 동적으로 생성

```typescript
// DB에는 저장하지 않고, 사용 시점에 동적으로 생성
const getShareUrl = (nodeId: string) => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/share/${nodeId}`;
  }
  return `${process.env.NEXT_PUBLIC_SITE_URL || ''}/share/${nodeId}`;
};

// DB에는 isShared만 저장하고, sharedLink는 저장하지 않음
// 또는 sharedLink를 null로 저장하고, 사용 시점에 생성
```

**장점:**
- 항상 현재 환경의 올바른 URL 사용
- DB에 잘못된 URL 저장 방지

**단점:**
- 기존 코드 수정 필요

### 방안 4: 환경 변수 + window.location.origin 조합

```typescript
const getShareUrl = (nodeId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  return `${baseUrl}/share/${nodeId}`;
};
```

**장점:**
- 환경 변수가 있으면 사용, 없으면 현재 origin 사용
- 유연함

**단점:**
- 환경 변수 설정 필요

## 권장 해결 방안

**방안 2 (상대 경로 저장)** 또는 **방안 3 (동적 생성)**을 권장합니다:

1. **상대 경로 저장**: DB에 `/share/${nodeId}`만 저장
2. **링크 복사 시**: `window.location.origin`과 결합하여 전체 URL 생성
3. **표시 시**: 필요시에만 전체 URL 생성

이렇게 하면:
- DB에 환경별 URL이 저장되지 않음
- 항상 현재 환경의 올바른 URL 사용
- 가장 안전하고 간단함

## 추가 고려사항

### 기존 데이터 마이그레이션

이미 DB에 저장된 `localhost:3000` 링크들을 수정해야 할 수 있습니다:

```sql
-- 기존 localhost 링크를 상대 경로로 변경
UPDATE nodes 
SET shared_link = REPLACE(shared_link, 'http://localhost:3000', '')
WHERE shared_link LIKE 'http://localhost:3000%';

-- 또는 환경 변수에 맞게 변경
UPDATE nodes 
SET shared_link = REPLACE(shared_link, 'http://localhost:3000', 'https://yourdomain.com')
WHERE shared_link LIKE 'http://localhost:3000%';
```

## 결론

**핵심 문제:**
- `window.location.origin`을 사용하여 생성 시점의 환경에 따라 다른 URL이 생성됨
- DB에 절대 URL로 저장되어 환경이 바뀌어도 변경되지 않음

**해결 방향:**
- 상대 경로 저장 또는 환경 변수 사용
- 링크 사용 시점에 동적으로 생성
