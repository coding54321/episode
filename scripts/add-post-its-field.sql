-- projects 테이블에 post_its 컬럼 추가 마이그레이션
-- 포스트잇 데이터를 JSONB 형식으로 저장

-- 1. post_its 컬럼 추가 (JSONB 타입)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS post_its JSONB DEFAULT '[]'::jsonb;

-- 2. 인덱스 추가 (포스트잇 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_projects_post_its_gin ON public.projects USING GIN (post_its);

-- 3. 기존 데이터에 빈 배열 기본값 설정
UPDATE public.projects 
SET post_its = '[]'::jsonb 
WHERE post_its IS NULL;

-- 4. 컬럼에 NOT NULL 제약 조건 추가 (기본값이 있으므로 안전)
ALTER TABLE public.projects 
ALTER COLUMN post_its SET NOT NULL;

-- 5. 컬럼 설명 추가
COMMENT ON COLUMN public.projects.post_its IS '포스트잇 목록 (JSONB 배열)';
