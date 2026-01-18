# Episode 프로덕트 IA (Information Architecture)

## 화면 구조도

| 화면 ID | Depth 1 | Depth 2 | Depth 3 | Depth 4 | Depth 5 | 화면 유형 구분 |
|---------|---------|---------|---------|---------|---------|----------------|
| HOME | 홈 | 랜딩 페이지 | - | - | - | Page |
| LOGIN | 인증 | 로그인 | - | - | - | Page |
| AUTH_CALLBACK | 인증 | OAuth 콜백 | - | - | - | Page |
| PROJECT_LIST | 프로젝트 관리 | 프로젝트 목록 | - | - | - | Page |
| PROJECT_TYPE_SELECT | 프로젝트 관리 | 프로젝트 생성 | 프로젝트 타입 선택 | - | - | Page |
| BADGE_SELECT | 프로젝트 관리 | 프로젝트 생성 | 배지 선택 | - | - | Page |
| MINDMAP_WORKSPACE | 마인드맵 | 마인드맵 워크스페이스 | - | - | - | Page |
| MINDMAP_CANVAS | 마인드맵 | 마인드맵 워크스페이스 | 마인드맵 캔버스 | - | - | layer |
| MINDMAP_TABS | 마인드맵 | 마인드맵 워크스페이스 | 탭 관리 | - | - | layer |
| NEW_TAB_PANEL | 마인드맵 | 마인드맵 워크스페이스 | 탭 관리 | 새 탭 패널 | - | layer modal |
| MINDMAP_TOOLBAR | 마인드맵 | 마인드맵 워크스페이스 | 툴바 | - | - | layer |
| MINDMAP_SIDEBAR | 마인드맵 | 마인드맵 워크스페이스 | 사이드바 | - | - | layer |
| SIDEBAR_GAP | 마인드맵 | 마인드맵 워크스페이스 | 사이드바 | 공백 진단 | - | layer |
| SIDEBAR_STAR | 마인드맵 | 마인드맵 워크스페이스 | 사이드바 | STAR 정리 | - | layer |
| GAP_INVENTORY | 마인드맵 | 마인드맵 워크스페이스 | 사이드바 | 공백 진단 | 추천 인벤토리 | layer |
| GAP_ANALYSIS | 마인드맵 | 마인드맵 워크스페이스 | 사이드바 | 공백 진단 | 분석 결과 | layer |
| NODE_CONTEXT_MENU | 마인드맵 | 마인드맵 워크스페이스 | 마인드맵 캔버스 | 노드 컨텍스트 메뉴 | - | layer modal |
| CANVAS_CONTEXT_MENU | 마인드맵 | 마인드맵 워크스페이스 | 마인드맵 캔버스 | 빈 공간 컨텍스트 메뉴 | - | layer modal |
| SEARCH_RESULTS | 마인드맵 | 마인드맵 워크스페이스 | 검색 결과 | - | - | layer modal |
| COMPETENCY_FILTER | 마인드맵 | 마인드맵 워크스페이스 | 역량 필터 | - | - | layer modal |
| SHARE_DIALOG | 마인드맵 | 마인드맵 워크스페이스 | 공유 다이얼로그 | - | - | system modal |
| SETTINGS_DIALOG | 마인드맵 | 마인드맵 워크스페이스 | 설정 다이얼로그 | - | - | system modal |
| ONBOARDING | 마인드맵 | 마인드맵 워크스페이스 | 온보딩 튜토리얼 | - | - | system modal |
| GAP_DIAGNOSIS_STANDALONE | 공백 진단 | 공백 진단 (독립) | - | - | - | Page |
| GAP_COMPANY | 공백 진단 | 공백 진단 (독립) | 기업 선택 | - | - | layer |
| GAP_JOB | 공백 진단 | 공백 진단 (독립) | 직무 선택 | - | - | layer |
| GAP_QUESTIONS | 공백 진단 | 공백 진단 (독립) | 질문 답변 | - | - | layer |
| GAP_RESULT | 공백 진단 | 공백 진단 (독립) | 진단 결과 | - | - | layer |
| ARCHIVE | 아카이브 | 에피소드 보관함 | - | - | - | Page |
| ARCHIVE_LIST | 아카이브 | 에피소드 보관함 | 목록 뷰 | - | - | layer |
| ARCHIVE_EDIT | 아카이브 | 에피소드 보관함 | 편집 뷰 | - | - | layer |
| ARCHIVE_EPISODE_LIST | 아카이브 | 에피소드 보관함 | 편집 뷰 | 에피소드 목록 | - | layer |
| ARCHIVE_STAR_EDITOR | 아카이브 | 에피소드 보관함 | 편집 뷰 | STAR 입력 | - | layer |
| ARCHIVE_TAG_MANAGER | 아카이브 | 에피소드 보관함 | 편집 뷰 | 태그 관리 | - | layer |
| ARCHIVE_TAG_DIALOG | 아카이브 | 에피소드 보관함 | 편집 뷰 | 태그 관리 | 태그 선택 다이얼로그 | system modal |
| ARCHIVE_DATE_PICKER | 아카이브 | 에피소드 보관함 | 편집 뷰 | 기간 편집 | 날짜 선택 | layer modal |
| SHARE_VIEW | 공유 | 공유 링크 뷰 | - | - | - | Page |
| SHARE_READONLY | 공유 | 공유 링크 뷰 | 읽기 전용 모드 | - | - | layer |
| EXPORT_IMAGE | 마인드맵 | 마인드맵 워크스페이스 | 내보내기 | 이미지 저장 | - | system modal |
| EXPORT_PDF | 마인드맵 | 마인드맵 워크스페이스 | 내보내기 | PDF 저장 | - | system modal |
| PROJECT_DELETE_CONFIRM | 프로젝트 관리 | 프로젝트 목록 | 프로젝트 삭제 확인 | - | - | system modal |
| PROJECT_EDIT | 프로젝트 관리 | 프로젝트 목록 | 프로젝트 제목 편집 | - | - | layer |
| NODE_INLINE_EDIT | 마인드맵 | 마인드맵 워크스페이스 | 마인드맵 캔버스 | 노드 인라인 편집 | - | layer |
| TAG_SELECT_DIALOG | 마인드맵 | 마인드맵 워크스페이스 | 사이드바 | STAR 정리 | 역량 태그 선택 | system modal |
| ACTIVE_EDITORS | 마인드맵 | 마인드맵 워크스페이스 | 실시간 편집자 표시 | - | - | layer |
| READONLY_BANNER | 마인드맵 | 마인드맵 워크스페이스 | 읽기 전용 배너 | - | - | layer |

---

## 화면 유형 구분 설명

### Page
- 전체 화면을 차지하는 독립적인 페이지
- URL 경로를 가지며 브라우저 히스토리에 기록됨
- 예: 랜딩 페이지, 로그인, 프로젝트 목록, 마인드맵 워크스페이스

### layer
- 페이지 내부에 존재하는 레이어 컴포넌트
- 다른 레이어와 함께 표시될 수 있음
- 예: 마인드맵 캔버스, 툴바, 사이드바, 탭

### layer modal
- 페이지 내부에 오버레이로 표시되는 모달
- 배경이 어두워지고 포커스가 모달로 이동
- 예: 새 탭 패널, 검색 결과, 노드 컨텍스트 메뉴

### system modal
- 시스템 레벨의 다이얼로그
- 전체 화면을 덮는 오버레이와 함께 표시
- 사용자 확인이 필요한 중요한 작업에 사용
- 예: 공유 다이얼로그, 설정 다이얼로그, 삭제 확인

---

## 화면 계층 구조 상세

### 1. 인증 (Authentication)
```
인증
├── 로그인 (LOGIN) [Page]
└── OAuth 콜백 (AUTH_CALLBACK) [Page]
```

### 2. 홈 (Home)
```
홈
└── 랜딩 페이지 (HOME) [Page]
```

### 3. 프로젝트 관리 (Project Management)
```
프로젝트 관리
├── 프로젝트 목록 (PROJECT_LIST) [Page]
│   ├── 프로젝트 제목 편집 (PROJECT_EDIT) [layer]
│   └── 프로젝트 삭제 확인 (PROJECT_DELETE_CONFIRM) [system modal]
└── 프로젝트 생성
    ├── 프로젝트 타입 선택 (PROJECT_TYPE_SELECT) [Page]
    └── 배지 선택 (BADGE_SELECT) [Page]
```

### 4. 마인드맵 (Mindmap)
```
마인드맵
└── 마인드맵 워크스페이스 (MINDMAP_WORKSPACE) [Page]
    ├── 탭 관리 (MINDMAP_TABS) [layer]
    │   └── 새 탭 패널 (NEW_TAB_PANEL) [layer modal]
    ├── 프로젝트 정보 헤더 [layer]
    ├── 마인드맵 캔버스 (MINDMAP_CANVAS) [layer]
    │   ├── 노드 컨텍스트 메뉴 (NODE_CONTEXT_MENU) [layer modal]
    │   ├── 빈 공간 컨텍스트 메뉴 (CANVAS_CONTEXT_MENU) [layer modal]
    │   ├── 노드 인라인 편집 (NODE_INLINE_EDIT) [layer]
    │   └── 검색 결과 (SEARCH_RESULTS) [layer modal]
    ├── 검색바 [layer]
    ├── 역량 필터 (COMPETENCY_FILTER) [layer modal]
    ├── 툴바 (MINDMAP_TOOLBAR) [layer]
    ├── 사이드바 (MINDMAP_SIDEBAR) [layer]
    │   ├── 공백 진단 (SIDEBAR_GAP) [layer]
    │   │   ├── 추천 인벤토리 (GAP_INVENTORY) [layer]
    │   │   └── 분석 결과 (GAP_ANALYSIS) [layer]
    │   └── STAR 정리 (SIDEBAR_STAR) [layer]
    │       └── 역량 태그 선택 (TAG_SELECT_DIALOG) [system modal]
    ├── 공유 다이얼로그 (SHARE_DIALOG) [system modal]
    ├── 설정 다이얼로그 (SETTINGS_DIALOG) [system modal]
    ├── 온보딩 튜토리얼 (ONBOARDING) [system modal]
    ├── 실시간 편집자 표시 (ACTIVE_EDITORS) [layer]
    ├── 읽기 전용 배너 (READONLY_BANNER) [layer]
    └── 내보내기
        ├── 이미지 저장 (EXPORT_IMAGE) [system modal]
        └── PDF 저장 (EXPORT_PDF) [system modal]
```

### 5. 공백 진단 (Gap Diagnosis)
```
공백 진단
└── 공백 진단 (독립) (GAP_DIAGNOSIS_STANDALONE) [Page]
    ├── 기업 선택 (GAP_COMPANY) [layer]
    ├── 직무 선택 (GAP_JOB) [layer]
    ├── 질문 답변 (GAP_QUESTIONS) [layer]
    └── 진단 결과 (GAP_RESULT) [layer]
```

### 6. 아카이브 (Archive)
```
아카이브
└── 에피소드 보관함 (ARCHIVE) [Page]
    ├── 목록 뷰 (ARCHIVE_LIST) [layer]
    └── 편집 뷰 (ARCHIVE_EDIT) [layer]
        ├── 에피소드 목록 (ARCHIVE_EPISODE_LIST) [layer]
        ├── STAR 입력 (ARCHIVE_STAR_EDITOR) [layer]
        ├── 태그 관리 (ARCHIVE_TAG_MANAGER) [layer]
        │   └── 태그 선택 다이얼로그 (ARCHIVE_TAG_DIALOG) [system modal]
        └── 기간 편집 (ARCHIVE_DATE_PICKER) [layer modal]
```

### 7. 공유 (Share)
```
공유
└── 공유 링크 뷰 (SHARE_VIEW) [Page]
    └── 읽기 전용 모드 (SHARE_READONLY) [layer]
```

---

## 화면 간 네비게이션 플로우

### 신규 사용자 플로우
```
HOME → LOGIN → AUTH_CALLBACK → PROJECT_TYPE_SELECT → BADGE_SELECT → MINDMAP_WORKSPACE
```

### 기존 사용자 플로우
```
HOME → PROJECT_LIST → MINDMAP_WORKSPACE
```

### 공백 진단 플로우
```
HOME → GAP_DIAGNOSIS_STANDALONE → GAP_COMPANY → GAP_JOB → GAP_QUESTIONS → GAP_RESULT → PROJECT_TYPE_SELECT
```

### 아카이브 플로우
```
HOME → ARCHIVE → ARCHIVE_EDIT → ARCHIVE_TAG_DIALOG / ARCHIVE_DATE_PICKER
```

### 공유 링크 플로우
```
SHARE_VIEW (외부 링크) → SHARE_READONLY → (로그인 시) MINDMAP_WORKSPACE
```

---

## 모달/다이얼로그 분류

### System Modal (시스템 모달)
- 전체 화면을 덮는 오버레이
- 중요한 작업 확인 또는 설정 변경에 사용
- ESC 키 또는 배경 클릭으로 닫기 가능
- 예: SHARE_DIALOG, SETTINGS_DIALOG, ONBOARDING, EXPORT_IMAGE, EXPORT_PDF, PROJECT_DELETE_CONFIRM, TAG_SELECT_DIALOG, ARCHIVE_TAG_DIALOG

### Layer Modal (레이어 모달)
- 특정 레이어 위에 표시되는 모달
- 배경이 어두워지지만 전체 화면을 덮지 않음
- 예: NEW_TAB_PANEL, NODE_CONTEXT_MENU, CANVAS_CONTEXT_MENU, SEARCH_RESULTS, COMPETENCY_FILTER, ARCHIVE_DATE_PICKER

---

## 참고 사항

1. **탭 관리**: MINDMAP_WORKSPACE 내에서 여러 프로젝트를 탭으로 관리
2. **실시간 협업**: ACTIVE_EDITORS는 팀 마인드맵에서만 표시
3. **읽기 전용 모드**: SHARE_VIEW와 비로그인 사용자에게 READONLY_BANNER 표시
4. **온보딩**: 최초 마인드맵 생성 시 ONBOARDING 자동 표시
5. **사이드바**: SIDEBAR_GAP와 SIDEBAR_STAR는 탭으로 전환 가능
6. **인라인 편집**: NODE_INLINE_EDIT는 더블클릭 시 노드 위에 직접 표시

---

**작성일**: 2024년 1월 1일  
**최종 수정일**: 2024년 1월 1일
