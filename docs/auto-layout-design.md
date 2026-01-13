# 마인드맵 자동 레이아웃 시스템 구성안

## 1. 개요

현재 서비스는 노드의 x, y 좌표를 수동으로 지정하는 방식입니다. XMind 스타일의 자동 정렬 기능을 추가하여 노드 추가/삭제 시 자동으로 레이아웃이 조정되도록 구현합니다.

## 2. 데이터베이스 스키마 변경

### 2.1. `projects` 테이블에 추가할 필드

```sql
-- 레이아웃 타입 추가
ALTER TABLE projects 
ADD COLUMN layout_type TEXT DEFAULT 'radial' 
CHECK (layout_type IN ('radial', 'hierarchical', 'tree', 'force-directed'));

-- 레이아웃 설정 (JSONB로 유연하게 확장 가능)
ALTER TABLE projects 
ADD COLUMN layout_config JSONB DEFAULT '{}'::jsonb;
```

**레이아웃 타입 설명:**
- `radial`: 중심 노드를 기준으로 원형 배치 (기본값, XMind 스타일)
- `hierarchical`: 계층형 배치 (위에서 아래로)
- `tree`: 트리형 배치 (좌우 대칭)
- `force-directed`: 물리 시뮬레이션 기반 배치

**layout_config 예시:**
```json
{
  "spacing": {
    "horizontal": 200,
    "vertical": 150,
    "radial": 180
  },
  "autoLayout": true,
  "preserveManualPositions": false
}
```

### 2.2. `nodes` 테이블에 추가할 필드

```sql
-- 수동으로 위치를 조정했는지 여부
ALTER TABLE nodes 
ADD COLUMN is_manually_positioned BOOLEAN DEFAULT false;

-- 레이아웃 계산 시 사용할 임시 메타데이터 (선택적)
ALTER TABLE nodes 
ADD COLUMN layout_metadata JSONB DEFAULT '{}'::jsonb;
```

**is_manually_positioned 용도:**
- `true`: 사용자가 드래그로 위치를 변경한 노드 → 자동 레이아웃에서 제외
- `false`: 자동 레이아웃으로 배치된 노드 → 자동 재계산 대상

## 3. 레이아웃 알고리즘 설계

### 3.1. Radial Layout (기본, XMind 스타일)

**구현 로직:**
```typescript
function calculateRadialLayout(
  centerNode: MindMapNode,
  nodes: MindMapNode[],
  config: LayoutConfig
): MindMapNode[] {
  const centerX = 500; // 캔버스 중심
  const centerY = 300;
  
  // 레벨별로 노드 그룹화
  const nodesByLevel = groupNodesByLevel(nodes);
  
  // 각 레벨별로 원형 배치
  Object.entries(nodesByLevel).forEach(([level, levelNodes]) => {
    const levelNum = parseInt(level);
    if (levelNum === 0) {
      // 중심 노드는 고정
      centerNode.x = centerX;
      centerNode.y = centerY;
      return;
    }
    
    // 반경 계산 (레벨이 깊을수록 멀리)
    const radius = config.spacing.radial * levelNum;
    
    // 각도 계산 (노드 개수에 따라 균등 분배)
    const angleStep = (2 * Math.PI) / levelNodes.length;
    
    levelNodes.forEach((node, index) => {
      const angle = angleStep * index;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });
  });
  
  return nodes;
}
```

**특징:**
- 중심 노드 기준으로 자식 노드들이 원형으로 배치
- 레벨이 깊을수록 반경 증가
- 노드 개수에 따라 각도 자동 조정

### 3.2. Hierarchical Layout (계층형)

**구현 로직:**
```typescript
function calculateHierarchicalLayout(
  centerNode: MindMapNode,
  nodes: MindMapNode[],
  config: LayoutConfig
): MindMapNode[] {
  const startX = 500;
  const startY = 100;
  
  const nodesByLevel = groupNodesByLevel(nodes);
  
  Object.entries(nodesByLevel).forEach(([level, levelNodes]) => {
    const levelNum = parseInt(level);
    const y = startY + (levelNum * config.spacing.vertical);
    
    // 같은 레벨의 노드들을 가로로 배치
    const totalWidth = (levelNodes.length - 1) * config.spacing.horizontal;
    const startXForLevel = startX - (totalWidth / 2);
    
    levelNodes.forEach((node, index) => {
      node.x = startXForLevel + (index * config.spacing.horizontal);
      node.y = y;
    });
  });
  
  return nodes;
}
```

### 3.3. Tree Layout (트리형)

**구현 로직:**
- 부모 노드를 중심으로 자식 노드들을 좌우 대칭으로 배치
- 재귀적으로 서브트리 계산

### 3.4. Force-Directed Layout (물리 시뮬레이션)

**구현 로직:**
- D3.js의 force simulation 또는 유사 알고리즘 사용
- 노드 간 인력/반발력 계산
- 연결선 길이 최소화

## 4. 파일 구조

```
lib/
  layouts/
    index.ts                    # 레이아웃 타입 정의 및 팩토리
    radial-layout.ts            # Radial 레이아웃 알고리즘
    hierarchical-layout.ts      # Hierarchical 레이아웃 알고리즘
    tree-layout.ts              # Tree 레이아웃 알고리즘
    force-directed-layout.ts    # Force-Directed 레이아웃 알고리즘
    layout-utils.ts             # 공통 유틸리티 함수

components/
  mindmap/
    LayoutSelector.tsx           # 레이아웃 선택 UI 컴포넌트
    MindMapCanvas.tsx            # 자동 레이아웃 통합

hooks/
  useAutoLayout.ts              # 자동 레이아웃 훅
```

## 5. 구현 단계

### Phase 1: 데이터베이스 마이그레이션
1. `projects` 테이블에 `layout_type`, `layout_config` 추가
2. `nodes` 테이블에 `is_manually_positioned` 추가
3. 기존 데이터 마이그레이션 (기본값 설정)

### Phase 2: 레이아웃 알고리즘 구현
1. Radial Layout 구현 (기본)
2. 레이아웃 유틸리티 함수 구현
3. 노드 그룹화 및 계층 구조 분석 함수

### Phase 3: UI 통합
1. 레이아웃 선택 UI 컴포넌트 추가
2. MindMapCanvas에 자동 레이아웃 적용
3. 노드 추가/삭제 시 자동 재계산

### Phase 4: 수동 조정과 자동 레이아웃 병행
1. 드래그 시 `is_manually_positioned = true` 설정
2. 자동 레이아웃 실행 시 수동 조정된 노드 제외
3. "자동 정렬" 버튼으로 전체 재정렬 옵션 제공

### Phase 5: 추가 레이아웃 타입
1. Hierarchical Layout 구현
2. Tree Layout 구현
3. Force-Directed Layout 구현 (선택적)

## 6. API 변경사항

### 6.1. `updateProject` 함수 확장

```typescript
export async function updateProject(
  projectId: string,
  updates: {
    name?: string;
    description?: string;
    layout_type?: 'radial' | 'hierarchical' | 'tree' | 'force-directed';
    layout_config?: Record<string, any>;
  }
): Promise<boolean>
```

### 6.2. `updateNode` 함수 확장

```typescript
export async function updateNode(
  projectId: string,
  nodeId: string,
  updates: {
    x?: number;
    y?: number;
    is_manually_positioned?: boolean;
    // ... 기존 필드들
  }
): Promise<boolean>
```

## 7. 사용자 경험 (UX)

### 7.1. 레이아웃 선택 UI
- 프로젝트 설정 또는 캔버스 상단에 레이아웃 선택 드롭다운
- 레이아웃 변경 시 즉시 적용
- "자동 정렬" 버튼으로 현재 레이아웃 재계산

### 7.2. 자동 레이아웃 동작
- 노드 추가 시: 부모 노드 기준으로 자동 배치
- 노드 삭제 시: 남은 노드들 자동 재정렬
- 레이아웃 변경 시: 전체 노드 재배치

### 7.3. 수동 조정과의 병행
- 드래그로 노드 이동 시: 해당 노드는 수동 조정으로 표시
- 자동 레이아웃 실행 시: 수동 조정된 노드는 제외
- "전체 자동 정렬" 옵션: 수동 조정 무시하고 전체 재정렬

## 8. 성능 고려사항

1. **대량 노드 처리**
   - 노드가 100개 이상일 때 레이아웃 계산 최적화
   - Web Worker를 사용한 비동기 계산 (선택적)

2. **애니메이션**
   - 레이아웃 변경 시 부드러운 전환 애니메이션
   - Framer Motion 또는 CSS transition 활용

3. **캐싱**
   - 레이아웃 계산 결과 캐싱
   - 노드 변경 시에만 재계산

## 9. 마이그레이션 전략

### 9.1. 기존 데이터 처리
```sql
-- 기존 프로젝트는 모두 radial 레이아웃으로 설정
UPDATE projects 
SET layout_type = 'radial', 
    layout_config = '{"autoLayout": true}'::jsonb
WHERE layout_type IS NULL;

-- 기존 노드는 모두 자동 배치로 표시 (수동 조정 아님)
UPDATE nodes 
SET is_manually_positioned = false
WHERE is_manually_positioned IS NULL;
```

### 9.2. 점진적 롤아웃
1. Phase 1-2 완료 후 기본 레이아웃 적용
2. Phase 3에서 UI 추가
3. Phase 4에서 수동 조정 기능 추가
4. Phase 5에서 추가 레이아웃 타입 제공

## 10. 테스트 계획

1. **단위 테스트**
   - 각 레이아웃 알고리즘 테스트
   - 노드 그룹화 함수 테스트

2. **통합 테스트**
   - 노드 추가/삭제 시 자동 레이아웃 동작
   - 레이아웃 변경 시 전체 재배치

3. **성능 테스트**
   - 대량 노드(500개 이상) 처리 시간 측정
   - 메모리 사용량 모니터링

## 11. 향후 확장 가능성

1. **커스텀 레이아웃**
   - 사용자가 레이아웃 파라미터 직접 조정
   - 레이아웃 템플릿 저장/불러오기

2. **스마트 레이아웃**
   - 노드 내용 길이에 따른 동적 간격 조정
   - 노드 그룹 자동 인식 및 배치

3. **협업 기능**
   - 레이아웃 변경 시 실시간 동기화
   - 레이아웃 충돌 해결
