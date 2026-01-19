-- 직무 중심 구조에 맞는 Mockdata 생성 스크립트
-- 각 직무별로 여러 기업의 문항을 생성하여 최빈출 문항 분석이 가능하도록 함

-- ============================================
-- 1. 기업 데이터 생성 (필요한 경우)
-- ============================================
-- 기존 기업이 있으면 사용, 없으면 생성
INSERT INTO companies (id, name, industry, is_active, display_order) VALUES
('comp_tech_1', '테크기업 A', 'IT/소프트웨어', true, 1),
('comp_tech_2', '테크기업 B', 'IT/소프트웨어', true, 2),
('comp_tech_3', '테크기업 C', 'IT/소프트웨어', true, 3),
('comp_plan_1', '기획기업 A', '서비스', true, 4),
('comp_plan_2', '기획기업 B', '서비스', true, 5),
('comp_design_1', '디자인기업 A', '디자인', true, 6),
('comp_sales_1', '영업기업 A', '영업', true, 7),
('comp_hr_1', '인사기업 A', '인사', true, 8),
('comp_finance_1', '재무기업 A', '금융', true, 9)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. 역량 유형 확인 (기존 데이터 사용)
-- ============================================
-- ct1: 성장역량, ct2: 협업역량, ct3: 창의역량, ct4: 고객지향, ct5: 리더십, ct6: 전문성

-- ============================================
-- 3. 직군별 직무 생성 (여러 기업에 같은 직무명)
-- ============================================

-- IT/개발 직군
-- 백엔드 개발자
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_be_1', 'comp_tech_1', '백엔드 개발자', 'IT/개발', '개발팀', true, 1),
('job_be_2', 'comp_tech_2', '백엔드 개발자', 'IT/개발', '개발팀', true, 1),
('job_be_3', 'comp_tech_3', '백엔드 개발자', 'IT/개발', '개발팀', true, 1)
ON CONFLICT (id) DO NOTHING;

-- 프론트엔드 개발자
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_fe_1', 'comp_tech_1', '프론트엔드 개발자', 'IT/개발', '개발팀', true, 2),
('job_fe_2', 'comp_tech_2', '프론트엔드 개발자', 'IT/개발', '개발팀', true, 2),
('job_fe_3', 'comp_tech_3', '프론트엔드 개발자', 'IT/개발', '개발팀', true, 2)
ON CONFLICT (id) DO NOTHING;

-- 풀스택 개발자
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_fs_1', 'comp_tech_1', '풀스택 개발자', 'IT/개발', '개발팀', true, 3),
('job_fs_2', 'comp_tech_2', '풀스택 개발자', 'IT/개발', '개발팀', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 데이터 엔지니어
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_de_1', 'comp_tech_1', '데이터 엔지니어', 'IT/개발', '데이터팀', true, 4),
('job_de_2', 'comp_tech_2', '데이터 엔지니어', 'IT/개발', '데이터팀', true, 4)
ON CONFLICT (id) DO NOTHING;

-- DevOps 엔지니어
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_devops_1', 'comp_tech_1', 'DevOps 엔지니어', 'IT/개발', '인프라팀', true, 5),
('job_devops_2', 'comp_tech_2', 'DevOps 엔지니어', 'IT/개발', '인프라팀', true, 5)
ON CONFLICT (id) DO NOTHING;

-- 기획/마케팅 직군
-- 서비스 기획자
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_plan_1', 'comp_plan_1', '서비스 기획자', '기획/마케팅', '기획팀', true, 1),
('job_plan_2', 'comp_plan_2', '서비스 기획자', '기획/마케팅', '기획팀', true, 1)
ON CONFLICT (id) DO NOTHING;

-- 프로덕트 매니저
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_pm_1', 'comp_plan_1', '프로덕트 매니저', '기획/마케팅', '기획팀', true, 2),
('job_pm_2', 'comp_plan_2', '프로덕트 매니저', '기획/마케팅', '기획팀', true, 2)
ON CONFLICT (id) DO NOTHING;

-- 마케팅 전문가
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_marketing_1', 'comp_plan_1', '마케팅 전문가', '기획/마케팅', '마케팅팀', true, 3),
('job_marketing_2', 'comp_plan_2', '마케팅 전문가', '기획/마케팅', '마케팅팀', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 브랜드 매니저
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_brand_1', 'comp_plan_1', '브랜드 매니저', '기획/마케팅', '마케팅팀', true, 4)
ON CONFLICT (id) DO NOTHING;

-- 디자인 직군
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_uiux_1', 'comp_design_1', 'UI/UX 디자이너', '디자인', '디자인팀', true, 1),
('job_uiux_2', 'comp_design_1', 'UI/UX 디자이너', '디자인', '디자인팀', true, 1),
('job_graphic_1', 'comp_design_1', '그래픽 디자이너', '디자인', '디자인팀', true, 2),
('job_brand_design_1', 'comp_design_1', '브랜드 디자이너', '디자인', '디자인팀', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 영업/고객상담 직군
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_sales_1', 'comp_sales_1', '영업 담당자', '영업/고객상담', '영업팀', true, 1),
('job_sales_2', 'comp_sales_1', '영업 담당자', '영업/고객상담', '영업팀', true, 1),
('job_cs_1', 'comp_sales_1', '고객 성공 매니저', '영업/고객상담', 'CS팀', true, 2),
('job_cs_2', 'comp_sales_1', 'CS 담당자', '영업/고객상담', 'CS팀', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 인사/총무 직군
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_hr_1', 'comp_hr_1', '인사 담당자', '인사/총무', '인사팀', true, 1),
('job_recruit_1', 'comp_hr_1', '채용 담당자', '인사/총무', '인사팀', true, 2),
('job_admin_1', 'comp_hr_1', '총무 담당자', '인사/총무', '총무팀', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 회계/재무 직군
INSERT INTO jobs (id, company_id, job_title, category, department, is_active, display_order) VALUES
('job_accounting_1', 'comp_finance_1', '회계 담당자', '회계/재무', '회계팀', true, 1),
('job_finance_1', 'comp_finance_1', '재무 분석가', '회계/재무', '재무팀', true, 2),
('job_tax_1', 'comp_finance_1', '세무 담당자', '회계/재무', '회계팀', true, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. 각 직무별 최근 5개년 채용 공고 생성
-- ============================================

-- 백엔드 개발자 채용 공고 (2021-2025, 상반기/하반기)
INSERT INTO recruitments (id, company_id, year, half, start_date, end_date) VALUES
-- 2025년
('rec_be_2025_1', 'comp_tech_1', 2025, '상반기', '2025-01-01', '2025-03-31'),
('rec_be_2025_2', 'comp_tech_2', 2025, '상반기', '2025-01-01', '2025-03-31'),
('rec_be_2025_3', 'comp_tech_3', 2025, '상반기', '2025-01-01', '2025-03-31'),
-- 2024년
('rec_be_2024_1', 'comp_tech_1', 2024, '상반기', '2024-01-01', '2024-03-31'),
('rec_be_2024_2', 'comp_tech_1', 2024, '하반기', '2024-07-01', '2024-09-30'),
('rec_be_2024_3', 'comp_tech_2', 2024, '상반기', '2024-01-01', '2024-03-31'),
('rec_be_2024_4', 'comp_tech_2', 2024, '하반기', '2024-07-01', '2024-09-30'),
-- 2023년
('rec_be_2023_1', 'comp_tech_1', 2023, '상반기', '2023-01-01', '2023-03-31'),
('rec_be_2023_2', 'comp_tech_1', 2023, '하반기', '2023-07-01', '2023-09-30'),
('rec_be_2023_3', 'comp_tech_2', 2023, '상반기', '2023-01-01', '2023-03-31'),
-- 2022년
('rec_be_2022_1', 'comp_tech_1', 2022, '상반기', '2022-01-01', '2022-03-31'),
('rec_be_2022_2', 'comp_tech_1', 2022, '하반기', '2022-07-01', '2022-09-30'),
-- 2021년
('rec_be_2021_1', 'comp_tech_1', 2021, '상반기', '2021-01-01', '2021-03-31'),
('rec_be_2021_2', 'comp_tech_1', 2021, '하반기', '2021-07-01', '2021-09-30')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. 각 직무별 문항 생성 (최빈출 문항 우선)
-- ============================================

-- 백엔드 개발자 문항 (최빈출 문항 - 여러 기업에서 반복)
-- 문항 1: 지원 동기 및 목표 (가장 빈번)
INSERT INTO questions (id, job_id, recruitment_id, question_no, content, max_chars, competency_type_id) VALUES
('q_be_2025_1_1', 'job_be_1', 'rec_be_2025_1', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_be_2025_1_2', 'job_be_2', 'rec_be_2025_2', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_be_2024_1_1', 'job_be_1', 'rec_be_2024_1', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_be_2024_1_2', 'job_be_1', 'rec_be_2024_2', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_be_2024_1_3', 'job_be_2', 'rec_be_2024_3', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_be_2023_1_1', 'job_be_1', 'rec_be_2023_1', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_be_2023_1_2', 'job_be_1', 'rec_be_2023_2', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_be_2022_1_1', 'job_be_1', 'rec_be_2022_1', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_be_2021_1_1', 'job_be_1', 'rec_be_2021_1', 1, '본 회사 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1')
ON CONFLICT (id) DO NOTHING;

-- 문항 2: 기술 역량 및 경험 (두 번째로 빈번)
INSERT INTO questions (id, job_id, recruitment_id, question_no, content, max_chars, competency_type_id) VALUES
('q_be_2025_2_1', 'job_be_1', 'rec_be_2025_1', 2, '백엔드 개발자로서 보유한 기술 역량과 이를 활용한 프로젝트 경험을 구체적으로 기술해 주십시오.', 1200, 'ct6'),
('q_be_2025_2_2', 'job_be_2', 'rec_be_2025_2', 2, '백엔드 개발자로서 보유한 기술 역량과 이를 활용한 프로젝트 경험을 구체적으로 기술해 주십시오.', 1200, 'ct6'),
('q_be_2024_2_1', 'job_be_1', 'rec_be_2024_1', 2, '백엔드 개발자로서 보유한 기술 역량과 이를 활용한 프로젝트 경험을 구체적으로 기술해 주십시오.', 1200, 'ct6'),
('q_be_2024_2_2', 'job_be_1', 'rec_be_2024_2', 2, '백엔드 개발자로서 보유한 기술 역량과 이를 활용한 프로젝트 경험을 구체적으로 기술해 주십시오.', 1200, 'ct6'),
('q_be_2024_2_3', 'job_be_2', 'rec_be_2024_3', 2, '백엔드 개발자로서 보유한 기술 역량과 이를 활용한 프로젝트 경험을 구체적으로 기술해 주십시오.', 1200, 'ct6'),
('q_be_2023_2_1', 'job_be_1', 'rec_be_2023_1', 2, '백엔드 개발자로서 보유한 기술 역량과 이를 활용한 프로젝트 경험을 구체적으로 기술해 주십시오.', 1200, 'ct6'),
('q_be_2022_2_1', 'job_be_1', 'rec_be_2022_1', 2, '백엔드 개발자로서 보유한 기술 역량과 이를 활용한 프로젝트 경험을 구체적으로 기술해 주십시오.', 1200, 'ct6')
ON CONFLICT (id) DO NOTHING;

-- 문항 3: 문제 해결 경험 (세 번째로 빈번)
INSERT INTO questions (id, job_id, recruitment_id, question_no, content, max_chars, competency_type_id) VALUES
('q_be_2025_3_1', 'job_be_1', 'rec_be_2025_1', 3, '개발 과정에서 발생한 기술적 문제를 창의적으로 해결한 사례를 작성해 주십시오.', 1000, 'ct3'),
('q_be_2024_3_1', 'job_be_1', 'rec_be_2024_1', 3, '개발 과정에서 발생한 기술적 문제를 창의적으로 해결한 사례를 작성해 주십시오.', 1000, 'ct3'),
('q_be_2024_3_2', 'job_be_2', 'rec_be_2024_3', 3, '개발 과정에서 발생한 기술적 문제를 창의적으로 해결한 사례를 작성해 주십시오.', 1000, 'ct3'),
('q_be_2023_3_1', 'job_be_1', 'rec_be_2023_1', 3, '개발 과정에서 발생한 기술적 문제를 창의적으로 해결한 사례를 작성해 주십시오.', 1000, 'ct3')
ON CONFLICT (id) DO NOTHING;

-- 문항 4: 협업 경험
INSERT INTO questions (id, job_id, recruitment_id, question_no, content, max_chars, competency_type_id) VALUES
('q_be_2024_4_1', 'job_be_1', 'rec_be_2024_2', 2, '프론트엔드 개발자, 디자이너 등 다양한 역할과 협력하여 프로젝트를 완성한 경험을 작성해 주십시오.', 1000, 'ct2'),
('q_be_2023_4_1', 'job_be_1', 'rec_be_2023_2', 2, '프론트엔드 개발자, 디자이너 등 다양한 역할과 협력하여 프로젝트를 완성한 경험을 작성해 주십시오.', 1000, 'ct2')
ON CONFLICT (id) DO NOTHING;

-- 서비스 기획자 문항 (예시 - 다른 직무도 동일한 패턴으로 생성)
INSERT INTO recruitments (id, company_id, year, half, start_date, end_date) VALUES
('rec_plan_2025_1', 'comp_plan_1', 2025, '상반기', '2025-01-01', '2025-03-31'),
('rec_plan_2024_1', 'comp_plan_1', 2024, '상반기', '2024-01-01', '2024-03-31'),
('rec_plan_2024_2', 'comp_plan_1', 2024, '하반기', '2024-07-01', '2024-09-30'),
('rec_plan_2023_1', 'comp_plan_1', 2023, '상반기', '2023-01-01', '2023-03-31'),
('rec_plan_2022_1', 'comp_plan_1', 2022, '상반기', '2022-01-01', '2022-03-31'),
('rec_plan_2021_1', 'comp_plan_1', 2021, '상반기', '2021-01-01', '2021-03-31')
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, job_id, recruitment_id, question_no, content, max_chars, competency_type_id) VALUES
-- 서비스 기획자 최빈출 문항
('q_plan_2025_1_1', 'job_plan_1', 'rec_plan_2025_1', 1, '본 회사 지원 동기 및 서비스 기획자로서 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_plan_2024_1_1', 'job_plan_1', 'rec_plan_2024_1', 1, '본 회사 지원 동기 및 서비스 기획자로서 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_plan_2024_1_2', 'job_plan_1', 'rec_plan_2024_2', 1, '본 회사 지원 동기 및 서비스 기획자로서 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_plan_2023_1_1', 'job_plan_1', 'rec_plan_2023_1', 1, '본 회사 지원 동기 및 서비스 기획자로서 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_plan_2022_1_1', 'job_plan_1', 'rec_plan_2022_1', 1, '본 회사 지원 동기 및 서비스 기획자로서 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_plan_2021_1_1', 'job_plan_1', 'rec_plan_2021_1', 1, '본 회사 지원 동기 및 서비스 기획자로서 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', 1000, 'ct1'),
('q_plan_2025_2_1', 'job_plan_1', 'rec_plan_2025_1', 2, '서비스 기획 과정에서 사용자 니즈를 파악하고 이를 제품에 반영한 경험을 구체적으로 기술해 주십시오.', 1200, 'ct4'),
('q_plan_2024_2_1', 'job_plan_1', 'rec_plan_2024_1', 2, '서비스 기획 과정에서 사용자 니즈를 파악하고 이를 제품에 반영한 경험을 구체적으로 기술해 주십시오.', 1200, 'ct4'),
('q_plan_2024_2_2', 'job_plan_1', 'rec_plan_2024_2', 2, '서비스 기획 과정에서 사용자 니즈를 파악하고 이를 제품에 반영한 경험을 구체적으로 기술해 주십시오.', 1200, 'ct4'),
('q_plan_2023_2_1', 'job_plan_1', 'rec_plan_2023_1', 2, '서비스 기획 과정에서 사용자 니즈를 파악하고 이를 제품에 반영한 경험을 구체적으로 기술해 주십시오.', 1200, 'ct4'),
('q_plan_2024_3_1', 'job_plan_1', 'rec_plan_2024_1', 3, '데이터 분석을 통해 서비스 개선 방향을 도출한 경험을 작성해 주십시오.', 1000, 'ct3'),
('q_plan_2023_3_1', 'job_plan_1', 'rec_plan_2023_1', 3, '데이터 분석을 통해 서비스 개선 방향을 도출한 경험을 작성해 주십시오.', 1000, 'ct3')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 참고: 다른 직무들도 동일한 패턴으로 생성
-- 각 직무별로:
-- 1. 여러 기업에 같은 직무명 생성
-- 2. 최근 5개년 채용 공고 생성
-- 3. 최빈출 문항 우선으로 문항 생성 (같은 문항이 여러 기업/년도에 반복)
-- ============================================
