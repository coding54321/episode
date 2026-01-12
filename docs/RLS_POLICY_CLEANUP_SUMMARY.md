# RLS 정책 정리 요약

## 정리 완료 내역

### 제거된 중복 정책

#### projects 테이블
- ❌ "Users can view own projects" (SELECT) - 제거됨
- ❌ "Users can create own projects" (INSERT) - 제거됨  
- ❌ "Users can update own projects" (UPDATE) - 제거됨
- ❌ "Users can delete own projects" (DELETE) - 제거됨

**유지된 정책:**
- ✅ "Users can read their own projects" (SELECT)
- ✅ "Users can insert their own projects" (INSERT)
- ✅ "Users can update their own projects" (UPDATE)
- ✅ "Users can delete their own projects" (DELETE)

#### users 테이블
- ❌ "Users can view own profile" (SELECT) - 제거됨

**유지된 정책:**
- ✅ "Users can read their own record" (SELECT)
- ✅ "Users can insert their own record" (INSERT)
- ✅ "Users can update own profile" (UPDATE)

### nodes 테이블 정책 개선

모든 정책이 `is_project_owner()` 함수를 사용하도록 수정되어 무한 재귀 문제 해결:

- ✅ SELECT: `is_project_owner(project_id)` 사용
- ✅ INSERT: `is_project_owner(project_id)` 사용
- ✅ UPDATE: `is_project_owner(project_id)` 사용
- ✅ DELETE: `is_project_owner(project_id)` 사용

## 최종 정책 구조

### projects 테이블 (4개 정책)
각 작업당 1개씩:
- SELECT: 자신의 프로젝트만 조회
- INSERT: 자신의 프로젝트만 생성
- UPDATE: 자신의 프로젝트만 수정
- DELETE: 자신의 프로젝트만 삭제

### nodes 테이블 (4개 정책)
각 작업당 1개씩, 모두 함수 사용:
- SELECT: 프로젝트 소유자 또는 공유된 노드
- INSERT: 프로젝트 소유자 또는 공유된 노드 하위
- UPDATE: 프로젝트 소유자 또는 공유된 노드
- DELETE: 프로젝트 소유자 또는 공유된 노드

### users 테이블 (3개 정책)
- SELECT: 자신의 레코드만 조회
- INSERT: 자신의 레코드만 생성
- UPDATE: 자신의 프로필만 수정

### shared_nodes 테이블 (2개 정책)
- SELECT: 누구나 조회 가능
- ALL: 소유자 또는 프로젝트 소유자만 관리 가능

## 핵심 개선 사항

1. **중복 정책 제거**: 같은 작업에 대한 중복 정책 제거
2. **타입 일치**: `user_id`는 `uuid` 타입이므로 캐스팅 없는 버전 유지
3. **무한 재귀 방지**: `nodes` 정책이 모두 `is_project_owner()` 함수 사용
4. **정책 명확화**: 각 테이블당 작업별로 1개씩만 유지

## 현재 정책 상태

- ✅ 중복 없음
- ✅ 무한 재귀 위험 없음
- ✅ 타입 일치
- ✅ 명확한 구조

## 테스트 권장 사항

1. 프로젝트 목록 조회 테스트
2. 노드 추가/수정/삭제 테스트
3. 공유 노드 접근 테스트
4. 로그인하지 않은 사용자 접근 테스트
