-- 온보딩 관련 필드 추가 마이그레이션
-- users 테이블에 job_group, job_role, onboarding_completed 컬럼 추가

-- 1. job_group 컬럼 추가 (직군)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS job_group TEXT;

-- 2. job_role 컬럼 추가 (직무)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS job_role TEXT;

-- 3. onboarding_completed 컬럼 추가 (온보딩 완료 여부)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 4. 기존 사용자들의 onboarding_completed를 FALSE로 설정 (NULL 방지)
UPDATE public.users 
SET onboarding_completed = FALSE 
WHERE onboarding_completed IS NULL;

-- 5. 스키마 확인 쿼리 (실행 후 확인용)
-- SELECT 
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'users'
-- ORDER BY ordinal_position;
