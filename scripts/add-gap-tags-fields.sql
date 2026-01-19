-- gap_tags 테이블에 직무 중심 진단 관련 필드 추가 마이그레이션
-- gap_tags 테이블에 job_group, job_role, diagnosis_result_id 컬럼 추가

-- 1. job_group 컬럼 추가 (직군)
ALTER TABLE public.gap_tags 
ADD COLUMN IF NOT EXISTS job_group TEXT;

-- 2. job_role 컬럼 추가 (직무)
ALTER TABLE public.gap_tags 
ADD COLUMN IF NOT EXISTS job_role TEXT;

-- 3. diagnosis_result_id 컬럼 추가 (진단 결과 ID)
ALTER TABLE public.gap_tags 
ADD COLUMN IF NOT EXISTS diagnosis_result_id TEXT;

-- 4. 스키마 확인 쿼리 (실행 후 확인용)
-- SELECT 
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'gap_tags'
-- ORDER BY ordinal_position;
