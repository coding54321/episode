# Yjs 구현 가이드

## 필요한 패키지 설치

### 1. 핵심 패키지

```bash
npm install yjs
```

### 2. Supabase 통합을 위한 패키지

Supabase와 Yjs를 통합하는 방법은 두 가지가 있습니다:

#### 옵션 A: 커스텀 Provider 구현 (권장)
- Supabase Realtime을 직접 사용하여 커스텀 Provider 구현
- 더 세밀한 제어 가능
- 추가 패키지 불필요

#### 옵션 B: y-indexeddb (오프라인 지원)
```bash
npm install y-indexeddb
```

### 3. 데이터 타입 (선택사항)

```bash
# Map 타입 (객체 구조)
# Array 타입 (배열 구조)
# Text 타입 (텍스트 편집)
# 이미 yjs에 포함되어 있음
```

## Supabase 설정

### 1. Realtime 활성화

Supabase Dashboard에서:
1. Project Settings → API
2. Realtime 섹션에서 `yjs_updates` 테이블에 대한 Realtime 활성화

### 2. RLS 정책 확인

`yjs_docs`와 `yjs_updates` 테이블에 대한 RLS 정책이 올바르게 설정되어 있는지 확인:

```sql
-- yjs_docs: 프로젝트 소유자만 접근
CREATE POLICY "Users can access own project yjs docs"
ON yjs_docs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = yjs_docs.project_id
    AND projects.user_id = auth.uid()
  )
);

-- yjs_updates: 프로젝트 소유자만 읽기/쓰기
CREATE POLICY "Users can manage own project yjs updates"
ON yjs_updates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = yjs_updates.project_id
    AND projects.user_id = auth.uid()
  )
);
```

### 3. Realtime 구독 설정

Supabase Dashboard에서:
1. Database → Replication
2. `yjs_updates` 테이블의 Replication 활성화

## 구현 구조

### 1. Yjs Provider 생성

`lib/yjs/supabase-provider.ts` 파일 생성 필요:
- Supabase Realtime을 사용하여 Yjs 업데이트 동기화
- `yjs_updates` 테이블에 업데이트 저장
- `yjs_docs` 테이블에 문서 상태 저장

### 2. 데이터 모델

마인드맵 노드 데이터를 Yjs Map으로 저장:
```typescript
const nodesMap = ydoc.getMap('nodes');
// 각 노드를 Map으로 저장
nodesMap.set(nodeId, nodeData);
```

### 3. 동기화 로직

1. **초기 로드**: `yjs_docs`에서 문서 상태 로드
2. **업데이트 전송**: 노드 변경 시 Yjs 업데이트 생성 → `yjs_updates`에 저장
3. **업데이트 수신**: Supabase Realtime으로 `yjs_updates` 변경 감지 → Yjs에 적용

## 현재 상태

✅ **완료된 것:**
- Supabase DB에 `yjs_docs`, `yjs_updates` 테이블 존재
- 테이블 스키마 정의 완료

❌ **필요한 것:**
1. `yjs` 패키지 설치
2. 커스텀 Supabase Provider 구현
3. 마인드맵 노드 데이터를 Yjs Map으로 변환
4. Realtime 구독 설정
5. RLS 정책 확인/설정

## 다음 단계

1. 패키지 설치: `npm install yjs`
2. Provider 구현: `lib/yjs/supabase-provider.ts` 생성
3. 마인드맵 통합: `app/mindmap/[projectId]/page.tsx`에 Yjs 통합
4. 테스트: 여러 클라이언트에서 동시 편집 테스트

