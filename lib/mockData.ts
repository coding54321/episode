import { Company, Recruitment, Job, Question, CompetencyType } from '@/types';

// 목업 데이터 - 국내 상위 10개 기업
export const mockCompanies: Company[] = [
  { id: 'c2', name: '현대자동차', industry: '모빌리티', logo_url: '/logo/hyundai.svg' },
  { id: 'c2_1', name: 'KIA', industry: '모빌리티', logo_url: '/logo/kia.png' },
  { id: 'c1', name: '삼성전자', industry: '전자/반도체', logo_url: '/logo/samsung.png' },
  { id: 'c3', name: 'SK하이닉스', industry: '반도체', logo_url: '/logo/sk hynix.png' },
  { id: 'c4', name: 'LG전자', industry: '전자/가전', logo_url: '/logo/lg.png' },
  { id: 'c5', name: '네이버', industry: 'IT/플랫폼', logo_url: '/logo/naver.png' },
  { id: 'c6', name: '카카오', industry: 'IT/플랫폼', logo_url: '/logo/kakao.png' },
  { id: 'c7', name: '포스코', industry: '철강/소재', logo_url: '/logo/posco.svg' },
  { id: 'c8', name: 'KB국민은행', industry: '금융', logo_url: '/logo/kbbank.png' },
  { id: 'c9', name: 'CJ제일제당', industry: '식품/바이오', logo_url: '/logo/cj.png' },
];

// 지난 5년간 채용 공고 (2021-2025)
export const mockRecruitments: Recruitment[] = [
  // 현대자동차
  { id: 'r11', company_id: 'c2', year: 2025, half: '상반기', start_date: '2025-04-01', end_date: '2025-04-30' },
  { id: 'r12', company_id: 'c2', year: 2024, half: '하반기', start_date: '2024-09-01', end_date: '2024-09-30' },
  { id: 'r13', company_id: 'c2', year: 2024, half: '상반기', start_date: '2024-04-01', end_date: '2024-04-30' },
  { id: 'r14', company_id: 'c2', year: 2023, half: '하반기', start_date: '2023-09-01', end_date: '2023-09-30' },
  { id: 'r15', company_id: 'c2', year: 2023, half: '상반기', start_date: '2023-04-01', end_date: '2023-04-30' },
  
  // KIA
  { id: 'r16', company_id: 'c2_1', year: 2025, half: '상반기', start_date: '2025-04-01', end_date: '2025-04-30' },
  { id: 'r17', company_id: 'c2_1', year: 2024, half: '하반기', start_date: '2024-09-01', end_date: '2024-09-30' },
  { id: 'r18', company_id: 'c2_1', year: 2024, half: '상반기', start_date: '2024-04-01', end_date: '2024-04-30' },
  { id: 'r19', company_id: 'c2_1', year: 2023, half: '하반기', start_date: '2023-09-01', end_date: '2023-09-30' },
  { id: 'r20', company_id: 'c2_1', year: 2023, half: '상반기', start_date: '2023-04-01', end_date: '2023-04-30' },
  
  // 삼성전자
  { id: 'r1', company_id: 'c1', year: 2025, half: '상반기', start_date: '2025-05-01', end_date: '2025-05-31' },
  { id: 'r2', company_id: 'c1', year: 2024, half: '하반기', start_date: '2024-10-01', end_date: '2024-10-31' },
  { id: 'r3', company_id: 'c1', year: 2024, half: '상반기', start_date: '2024-05-01', end_date: '2024-05-31' },
  { id: 'r4', company_id: 'c1', year: 2023, half: '하반기', start_date: '2023-10-01', end_date: '2023-10-31' },
  { id: 'r5', company_id: 'c1', year: 2023, half: '상반기', start_date: '2023-05-01', end_date: '2023-05-31' },
];

// 직무 (기업별로 다양한 직무)
export const mockJobs: Job[] = [
  // 현대자동차
  { id: 'j11', company_id: 'c2', job_title: '연구개발', department: '연구개발본부', category: '개발' },
  { id: 'j12', company_id: 'c2', job_title: '생산기술', department: '생산본부', category: '엔지니어링' },
  { id: 'j13', company_id: 'c2', job_title: '자율주행개발', department: '자율주행센터', category: '개발' },
  { id: 'j14', company_id: 'c2', job_title: '상품기획', department: '상품전략본부', category: '기획' },
  { id: 'j15', company_id: 'c2', job_title: '디자인', department: '디자인센터', category: '디자인' },
  { id: 'j16', company_id: 'c2', job_title: '구매관리', department: '구매본부', category: '경영지원' },
  
  // KIA
  { id: 'j21', company_id: 'c2_1', job_title: '서비스기획', department: 'DS부문', category: '기획' },
  { id: 'j22', company_id: 'c2_1', job_title: 'SW개발', department: 'IT부문', category: '개발' },
  { id: 'j23', company_id: 'c2_1', job_title: '차량개발', department: '연구소', category: '개발' },
  { id: 'j24', company_id: 'c2_1', job_title: '전동화개발', department: '전동화사업부', category: '개발' },
  { id: 'j25', company_id: 'c2_1', job_title: '마케팅', department: '마케팅본부', category: '마케팅' },
  { id: 'j26', company_id: 'c2_1', job_title: '디자인', department: '디자인센터', category: '디자인' },
  
  // 삼성전자
  { id: 'j1', company_id: 'c1', job_title: 'SW개발', department: 'DS부문', category: '개발' },
  { id: 'j2', company_id: 'c1', job_title: '하드웨어개발', department: 'DX부문', category: '개발' },
  { id: 'j3', company_id: 'c1', job_title: '반도체공정', department: 'DS부문', category: '엔지니어링' },
  { id: 'j4', company_id: 'c1', job_title: '제품기획', department: 'MX사업부', category: '기획' },
  { id: 'j5', company_id: 'c1', job_title: '마케팅', department: '글로벌마케팅', category: '마케팅' },
];

// 자기소개서 문항
export const mockQuestions: Question[] = [
  // ========== 현대자동차 - 연구개발 ==========
  // 2025 상반기
  { id: 'hd_rd_2025_1_1', job_id: 'j11', recruitment_id: 'r11', question_no: 1, content: '현대자동차 지원 동기 및 입사 후 직무를 통해 달성하고자 하는 목표를 구체적으로 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_rd_2025_1_2', job_id: 'j11', recruitment_id: 'r11', question_no: 2, content: '미래 모빌리티 기술 발전을 위해 본인이 기여할 수 있는 역량과 경험을 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct6' },
  { id: 'hd_rd_2025_1_3', job_id: 'j11', recruitment_id: 'r11', question_no: 3, content: '연구개발 과정에서 예상치 못한 문제를 창의적으로 해결한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  // 2024 하반기
  { id: 'hd_rd_2024_2_1', job_id: 'j11', recruitment_id: 'r12', question_no: 1, content: '기술 개발 과정에서 실패를 극복하고 성공으로 이끈 경험을 구체적으로 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_rd_2024_2_2', job_id: 'j11', recruitment_id: 'r12', question_no: 2, content: '다양한 부서와 협력하여 시너지를 창출한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'hd_rd_2024_1_1', job_id: 'j11', recruitment_id: 'r13', question_no: 1, content: '자동차 산업의 변화 트렌드에 대한 본인의 견해와 이에 대응하기 위한 역량을 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct3' },
  { id: 'hd_rd_2024_1_2', job_id: 'j11', recruitment_id: 'r13', question_no: 2, content: '전문 지식을 활용하여 혁신적인 결과를 도출한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  // 2023 하반기
  { id: 'hd_rd_2023_2_1', job_id: 'j11', recruitment_id: 'r14', question_no: 1, content: '고객 만족도 향상을 위해 노력했던 경험을 구체적으로 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  { id: 'hd_rd_2023_2_2', job_id: 'j11', recruitment_id: 'r14', question_no: 2, content: '복잡한 기술적 문제를 분석하고 해결책을 찾아낸 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 상반기
  { id: 'hd_rd_2023_1_1', job_id: 'j11', recruitment_id: 'r15', question_no: 1, content: '팀을 이끌어 어려운 프로젝트를 성공적으로 완수한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'hd_rd_2023_1_2', job_id: 'j11', recruitment_id: 'r15', question_no: 2, content: '새로운 아이디어를 제안하고 실행하여 긍정적인 변화를 이끌어낸 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },

  // ========== 현대자동차 - 생산기술 ==========
  // 2025 상반기
  { id: 'hd_pt_2025_1_1', job_id: 'j12', recruitment_id: 'r11', question_no: 1, content: '생산 공정 개선을 통해 효율성을 높인 경험을 구체적으로 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_pt_2025_1_2', job_id: 'j12', recruitment_id: 'r11', question_no: 2, content: '품질 문제를 발견하고 해결한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2024 하반기
  { id: 'hd_pt_2024_2_1', job_id: 'j12', recruitment_id: 'r12', question_no: 1, content: '생산 현장에서 안전사고를 예방하기 위해 노력한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_pt_2024_2_2', job_id: 'j12', recruitment_id: 'r12', question_no: 2, content: '현장 직원들과 협력하여 문제를 해결한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'hd_pt_2024_1_1', job_id: 'j12', recruitment_id: 'r13', question_no: 1, content: '새로운 생산 기술을 도입하여 성과를 낸 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'hd_pt_2024_1_2', job_id: 'j12', recruitment_id: 'r13', question_no: 2, content: '데이터 분석을 통해 생산성을 향상시킨 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'hd_pt_2023_2_1', job_id: 'j12', recruitment_id: 'r14', question_no: 1, content: '제조 원가를 절감하기 위한 개선 활동 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_pt_2023_2_2', job_id: 'j12', recruitment_id: 'r14', question_no: 2, content: '설비 고장을 신속하게 대응하여 생산 차질을 최소화한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 상반기
  { id: 'hd_pt_2023_1_1', job_id: 'j12', recruitment_id: 'r15', question_no: 1, content: '생산 라인 개선 프로젝트를 주도한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'hd_pt_2023_1_2', job_id: 'j12', recruitment_id: 'r15', question_no: 2, content: '혁신적인 방법으로 생산 프로세스를 개선한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },

  // ========== 현대자동차 - 자율주행개발 ==========
  // 2025 상반기
  { id: 'hd_ad_2025_1_1', job_id: 'j13', recruitment_id: 'r11', question_no: 1, content: '자율주행 기술에 대한 본인의 이해와 관련 프로젝트 경험을 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct6' },
  { id: 'hd_ad_2025_1_2', job_id: 'j13', recruitment_id: 'r11', question_no: 2, content: '복잡한 기술적 문제를 분석하고 해결한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2024 하반기
  { id: 'hd_ad_2024_2_1', job_id: 'j13', recruitment_id: 'r12', question_no: 1, content: 'AI/ML 기술을 활용한 프로젝트 경험을 구체적으로 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct6' },
  { id: 'hd_ad_2024_2_2', job_id: 'j13', recruitment_id: 'r12', question_no: 2, content: '센서 데이터를 처리하고 분석한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  // 2024 상반기
  { id: 'hd_ad_2024_1_1', job_id: 'j13', recruitment_id: 'r13', question_no: 1, content: '자율주행 시스템의 안전성을 높이기 위한 노력을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_ad_2024_1_2', job_id: 'j13', recruitment_id: 'r13', question_no: 2, content: '타 부서와 협업하여 자율주행 기능을 개발한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2023 하반기
  { id: 'hd_ad_2023_2_1', job_id: 'j13', recruitment_id: 'r14', question_no: 1, content: '자율주행 알고리즘을 최적화한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  { id: 'hd_ad_2023_2_2', job_id: 'j13', recruitment_id: 'r14', question_no: 2, content: '실제 도로 테스트를 통해 얻은 인사이트를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 상반기
  { id: 'hd_ad_2023_1_1', job_id: 'j13', recruitment_id: 'r15', question_no: 1, content: '자율주행 프로젝트를 리딩한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'hd_ad_2023_1_2', job_id: 'j13', recruitment_id: 'r15', question_no: 2, content: '혁신적인 접근으로 자율주행 기술을 개선한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },

  // ========== 현대자동차 - 상품기획 ==========
  // 2025 상반기
  { id: 'hd_pp_2025_1_1', job_id: 'j14', recruitment_id: 'r11', question_no: 1, content: '고객 니즈를 분석하여 신차 기획에 반영한 경험을 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct4' },
  { id: 'hd_pp_2025_1_2', job_id: 'j14', recruitment_id: 'r11', question_no: 2, content: '시장 조사를 통해 경쟁력 있는 상품 전략을 수립한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2024 하반기
  { id: 'hd_pp_2024_2_1', job_id: 'j14', recruitment_id: 'r12', question_no: 1, content: '사용자 경험을 개선하기 위한 상품 기획 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  { id: 'hd_pp_2024_2_2', job_id: 'j14', recruitment_id: 'r12', question_no: 2, content: '다양한 이해관계자와 협력하여 기획을 완성한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'hd_pp_2024_1_1', job_id: 'j14', recruitment_id: 'r13', question_no: 1, content: '창의적인 아이디어로 새로운 상품 컨셉을 제안한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'hd_pp_2024_1_2', job_id: 'j14', recruitment_id: 'r13', question_no: 2, content: '데이터 기반으로 상품 전략을 수립한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'hd_pp_2023_2_1', job_id: 'j14', recruitment_id: 'r14', question_no: 1, content: '고객 피드백을 반영하여 상품을 개선한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  { id: 'hd_pp_2023_2_2', job_id: 'j14', recruitment_id: 'r14', question_no: 2, content: '상품 개발 과정에서 발생한 문제를 해결한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 상반기
  { id: 'hd_pp_2023_1_1', job_id: 'j14', recruitment_id: 'r15', question_no: 1, content: '상품 기획 프로젝트를 주도한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'hd_pp_2023_1_2', job_id: 'j14', recruitment_id: 'r15', question_no: 2, content: '혁신적인 상품 전략으로 시장 성과를 낸 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },

  // ========== 현대자동차 - 디자인 ==========
  // 2025 상반기
  { id: 'hd_ds_2025_1_1', job_id: 'j15', recruitment_id: 'r11', question_no: 1, content: '자동차 디자인에 대한 본인의 철학과 창의적인 디자인 경험을 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct3' },
  { id: 'hd_ds_2025_1_2', job_id: 'j15', recruitment_id: 'r11', question_no: 2, content: '사용자 중심의 디자인을 통해 만족도를 높인 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  // 2024 하반기
  { id: 'hd_ds_2024_2_1', job_id: 'j15', recruitment_id: 'r12', question_no: 1, content: '디자인 트렌드를 분석하고 이를 프로젝트에 적용한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_ds_2024_2_2', job_id: 'j15', recruitment_id: 'r12', question_no: 2, content: '엔지니어링 팀과 협업하여 디자인을 구현한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'hd_ds_2024_1_1', job_id: 'j15', recruitment_id: 'r13', question_no: 1, content: '혁신적인 디자인 컨셉으로 높은 평가를 받은 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'hd_ds_2024_1_2', job_id: 'j15', recruitment_id: 'r13', question_no: 2, content: '디자인 문제를 창의적으로 해결한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  // 2023 하반기
  { id: 'hd_ds_2023_2_1', job_id: 'j15', recruitment_id: 'r14', question_no: 1, content: '고객 리서치를 통해 디자인 방향을 설정한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  { id: 'hd_ds_2023_2_2', job_id: 'j15', recruitment_id: 'r14', question_no: 2, content: '제약 조건 속에서 최적의 디자인을 도출한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 상반기
  { id: 'hd_ds_2023_1_1', job_id: 'j15', recruitment_id: 'r15', question_no: 1, content: '디자인 프로젝트를 리딩한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'hd_ds_2023_1_2', job_id: 'j15', recruitment_id: 'r15', question_no: 2, content: '독창적인 아이디어로 디자인 가치를 높인 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },

  // ========== 현대자동차 - 구매관리 ==========
  // 2025 상반기
  { id: 'hd_pm_2025_1_1', job_id: 'j16', recruitment_id: 'r11', question_no: 1, content: '공급업체와의 협상을 통해 원가를 절감한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_pm_2025_1_2', job_id: 'j16', recruitment_id: 'r11', question_no: 2, content: '공급망 리스크를 관리하고 대응한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2024 하반기
  { id: 'hd_pm_2024_2_1', job_id: 'j16', recruitment_id: 'r12', question_no: 1, content: '전략적 소싱을 통해 구매 효율성을 높인 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_pm_2024_2_2', job_id: 'j16', recruitment_id: 'r12', question_no: 2, content: '공급업체와 협력하여 품질을 개선한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'hd_pm_2024_1_1', job_id: 'j16', recruitment_id: 'r13', question_no: 1, content: '새로운 구매 전략을 도입하여 성과를 낸 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'hd_pm_2024_1_2', job_id: 'j16', recruitment_id: 'r13', question_no: 2, content: '데이터 분석을 통해 구매 의사결정을 한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'hd_pm_2023_2_1', job_id: 'j16', recruitment_id: 'r14', question_no: 1, content: '긴급 상황에서 대체 공급처를 확보한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'hd_pm_2023_2_2', job_id: 'j16', recruitment_id: 'r14', question_no: 2, content: '글로벌 공급업체와의 협업 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2023 상반기
  { id: 'hd_pm_2023_1_1', job_id: 'j16', recruitment_id: 'r15', question_no: 1, content: '구매 프로세스 개선 프로젝트를 주도한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'hd_pm_2023_1_2', job_id: 'j16', recruitment_id: 'r15', question_no: 2, content: '혁신적인 방법으로 구매 업무를 개선한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },

  // ========== KIA - 서비스기획 ==========
  // 2025 상반기
  { id: 'kia_sp_2025_1_1', job_id: 'j21', recruitment_id: 'r16', question_no: 1, content: 'KIA 지원 동기와 입사 후 이루고 싶은 목표를 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'kia_sp_2025_1_2', job_id: 'j21', recruitment_id: 'r16', question_no: 2, content: '고객 경험을 개선하기 위해 서비스를 기획하고 실행한 경험을 작성해 주십시오.', max_chars: 1200, competency_type_id: 'ct4' },
  { id: 'kia_sp_2025_1_3', job_id: 'j21', recruitment_id: 'r16', question_no: 3, content: '데이터를 활용하여 문제를 분석하고 해결한 사례를 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2024 하반기
  { id: 'kia_sp_2024_2_1', job_id: 'j21', recruitment_id: 'r17', question_no: 1, content: '모빌리티 서비스에 대한 본인의 이해와 기획 경험을 작성해 주십시오.', max_chars: 1200, competency_type_id: 'ct6' },
  { id: 'kia_sp_2024_2_2', job_id: 'j21', recruitment_id: 'r17', question_no: 2, content: '팀과 협업하여 프로젝트를 성공적으로 완수한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  { id: 'kia_sp_2024_2_3', job_id: 'j21', recruitment_id: 'r17', question_no: 3, content: '창의적인 아이디어로 새로운 가치를 창출한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  // 2024 상반기
  { id: 'kia_sp_2024_1_1', job_id: 'j21', recruitment_id: 'r18', question_no: 1, content: '사용자 니즈를 파악하고 이를 서비스에 반영한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  { id: 'kia_sp_2024_1_2', job_id: 'j21', recruitment_id: 'r18', question_no: 2, content: '복잡한 문제를 단순화하여 해결한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'kia_sp_2023_2_1', job_id: 'j21', recruitment_id: 'r19', question_no: 1, content: '프로젝트를 주도적으로 이끌어 성과를 낸 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'kia_sp_2023_2_2', job_id: 'j21', recruitment_id: 'r19', question_no: 2, content: '다양한 이해관계자와 소통하며 협업한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2023 상반기
  { id: 'kia_sp_2023_1_1', job_id: 'j21', recruitment_id: 'r20', question_no: 1, content: '혁신적인 방법으로 업무 프로세스를 개선한 사례를 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'kia_sp_2023_1_2', job_id: 'j21', recruitment_id: 'r20', question_no: 2, content: '한정된 자원으로 최대의 성과를 달성한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },

  // ========== KIA - SW개발 ==========
  // 2025 상반기
  { id: 'kia_sw_2025_1_1', job_id: 'j22', recruitment_id: 'r16', question_no: 1, content: '소프트웨어 개발 과정에서 기술적 문제를 해결한 경험을 구체적으로 작성해 주십시오.', max_chars: 1200, competency_type_id: 'ct1' },
  { id: 'kia_sw_2025_1_2', job_id: 'j22', recruitment_id: 'r16', question_no: 2, content: '최신 기술을 활용하여 프로젝트를 완수한 사례를 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  { id: 'kia_sw_2025_1_3', job_id: 'j22', recruitment_id: 'r16', question_no: 3, content: '팀과 협업하여 성과를 낸 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 하반기
  { id: 'kia_sw_2024_2_1', job_id: 'j22', recruitment_id: 'r17', question_no: 1, content: '코드 품질 개선이나 시스템 최적화를 통해 성과를 낸 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  { id: 'kia_sw_2024_2_2', job_id: 'j22', recruitment_id: 'r17', question_no: 2, content: '타 직군과 협업하여 서비스를 개발한 사례를 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'kia_sw_2024_1_1', job_id: 'j22', recruitment_id: 'r18', question_no: 1, content: '신규 기능을 개발하여 사용자 만족도를 높인 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  { id: 'kia_sw_2024_1_2', job_id: 'j22', recruitment_id: 'r18', question_no: 2, content: '복잡한 버그를 디버깅하고 해결한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'kia_sw_2023_2_1', job_id: 'j22', recruitment_id: 'r19', question_no: 1, content: '개발 프로젝트를 리딩한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'kia_sw_2023_2_2', job_id: 'j22', recruitment_id: 'r19', question_no: 2, content: '기술 부채를 해소하여 시스템을 개선한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 상반기
  { id: 'kia_sw_2023_1_1', job_id: 'j22', recruitment_id: 'r20', question_no: 1, content: '혁신적인 기술로 개발 생산성을 높인 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'kia_sw_2023_1_2', job_id: 'j22', recruitment_id: 'r20', question_no: 2, content: '오픈소스를 활용하여 프로젝트를 성공시킨 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },

  // ========== KIA - 차량개발 ==========
  // 2025 상반기
  { id: 'kia_vd_2025_1_1', job_id: 'j23', recruitment_id: 'r16', question_no: 1, content: '차량 개발 프로젝트에서 본인의 역할과 기여도를 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct6' },
  { id: 'kia_vd_2025_1_2', job_id: 'j23', recruitment_id: 'r16', question_no: 2, content: '차량 성능 개선을 위한 기술적 해결책을 제시한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2024 하반기
  { id: 'kia_vd_2024_2_1', job_id: 'j23', recruitment_id: 'r17', question_no: 1, content: '차량 테스트를 통해 문제를 발견하고 개선한 사례를 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'kia_vd_2024_2_2', job_id: 'j23', recruitment_id: 'r17', question_no: 2, content: '다양한 부서와 협력하여 차량 개발을 완료한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'kia_vd_2024_1_1', job_id: 'j23', recruitment_id: 'r18', question_no: 1, content: '친환경 차량 기술 개발 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  { id: 'kia_vd_2024_1_2', job_id: 'j23', recruitment_id: 'r18', question_no: 2, content: '차량 안전성을 높이기 위한 노력을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'kia_vd_2023_2_1', job_id: 'j23', recruitment_id: 'r19', question_no: 1, content: '차량 개발 프로젝트를 주도한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'kia_vd_2023_2_2', job_id: 'j23', recruitment_id: 'r19', question_no: 2, content: '혁신적인 차량 기술을 도입한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  // 2023 상반기
  { id: 'kia_vd_2023_1_1', job_id: 'j23', recruitment_id: 'r20', question_no: 1, content: '차량 개발 일정을 단축한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'kia_vd_2023_1_2', job_id: 'j23', recruitment_id: 'r20', question_no: 2, content: '글로벌 팀과 협업하여 차량을 개발한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },

  // ========== KIA - 전동화개발 ==========
  // 2025 상반기
  { id: 'kia_ev_2025_1_1', job_id: 'j24', recruitment_id: 'r16', question_no: 1, content: '전기차 또는 수소차 기술 개발 경험을 구체적으로 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct6' },
  { id: 'kia_ev_2025_1_2', job_id: 'j24', recruitment_id: 'r16', question_no: 2, content: '배터리 성능 최적화를 위한 연구 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  // 2024 하반기
  { id: 'kia_ev_2024_2_1', job_id: 'j24', recruitment_id: 'r17', question_no: 1, content: '전동화 시스템의 효율을 높인 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  { id: 'kia_ev_2024_2_2', job_id: 'j24', recruitment_id: 'r17', question_no: 2, content: '충전 인프라 관련 프로젝트 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  // 2024 상반기
  { id: 'kia_ev_2024_1_1', job_id: 'j24', recruitment_id: 'r18', question_no: 1, content: '전동화 부품 개발 및 검증 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct6' },
  { id: 'kia_ev_2024_1_2', job_id: 'j24', recruitment_id: 'r18', question_no: 2, content: '전동화 기술 문제를 해결한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'kia_ev_2023_2_1', job_id: 'j24', recruitment_id: 'r19', question_no: 1, content: '전동화 프로젝트를 리딩한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'kia_ev_2023_2_2', job_id: 'j24', recruitment_id: 'r19', question_no: 2, content: '타 부서와 협업하여 전동화 기술을 개발한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2023 상반기
  { id: 'kia_ev_2023_1_1', job_id: 'j24', recruitment_id: 'r20', question_no: 1, content: '혁신적인 전동화 기술을 제안한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'kia_ev_2023_1_2', job_id: 'j24', recruitment_id: 'r20', question_no: 2, content: '전동화 기술의 안전성을 높인 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },

  // ========== KIA - 마케팅 ==========
  // 2025 상반기
  { id: 'kia_mk_2025_1_1', job_id: 'j25', recruitment_id: 'r16', question_no: 1, content: '브랜드 인지도를 높이기 위한 마케팅 전략을 수립하고 실행한 경험을 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct3' },
  { id: 'kia_mk_2025_1_2', job_id: 'j25', recruitment_id: 'r16', question_no: 2, content: '고객 데이터를 분석하여 마케팅 성과를 개선한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2024 하반기
  { id: 'kia_mk_2024_2_1', job_id: 'j25', recruitment_id: 'r17', question_no: 1, content: '디지털 마케팅 캠페인을 기획하고 실행한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'kia_mk_2024_2_2', job_id: 'j25', recruitment_id: 'r17', question_no: 2, content: '다양한 채널을 활용하여 고객과 소통한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'kia_mk_2024_1_1', job_id: 'j25', recruitment_id: 'r18', question_no: 1, content: '고객 니즈를 파악하고 타겟 마케팅을 한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  { id: 'kia_mk_2024_1_2', job_id: 'j25', recruitment_id: 'r18', question_no: 2, content: 'ROI를 극대화한 마케팅 전략을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'kia_mk_2023_2_1', job_id: 'j25', recruitment_id: 'r19', question_no: 1, content: '마케팅 캠페인을 주도한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'kia_mk_2023_2_2', job_id: 'j25', recruitment_id: 'r19', question_no: 2, content: '브랜드 이미지를 개선한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  // 2023 상반기
  { id: 'kia_mk_2023_1_1', job_id: 'j25', recruitment_id: 'r20', question_no: 1, content: '혁신적인 마케팅 방법으로 성과를 낸 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'kia_mk_2023_1_2', job_id: 'j25', recruitment_id: 'r20', question_no: 2, content: '고객 만족도를 높인 마케팅 활동을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },

  // ========== KIA - 디자인 ==========
  // 2025 상반기
  { id: 'kia_ds_2025_1_1', job_id: 'j26', recruitment_id: 'r16', question_no: 1, content: 'KIA 디자인 철학에 대한 이해와 본인의 디자인 경험을 기술해 주십시오.', max_chars: 1200, competency_type_id: 'ct3' },
  { id: 'kia_ds_2025_1_2', job_id: 'j26', recruitment_id: 'r16', question_no: 2, content: '사용자 경험을 고려한 디자인을 한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  // 2024 하반기
  { id: 'kia_ds_2024_2_1', job_id: 'j26', recruitment_id: 'r17', question_no: 1, content: '트렌드를 반영한 디자인 프로젝트 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'kia_ds_2024_2_2', job_id: 'j26', recruitment_id: 'r17', question_no: 2, content: '다양한 팀과 협업하여 디자인을 완성한 경험을 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct2' },
  // 2024 상반기
  { id: 'kia_ds_2024_1_1', job_id: 'j26', recruitment_id: 'r18', question_no: 1, content: '독창적인 디자인 아이디어를 제안한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'kia_ds_2024_1_2', job_id: 'j26', recruitment_id: 'r18', question_no: 2, content: '디자인 제약 조건을 극복한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct1' },
  // 2023 하반기
  { id: 'kia_ds_2023_2_1', job_id: 'j26', recruitment_id: 'r19', question_no: 1, content: '디자인 프로젝트를 리딩한 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct5' },
  { id: 'kia_ds_2023_2_2', job_id: 'j26', recruitment_id: 'r19', question_no: 2, content: '고객 피드백을 반영하여 디자인을 개선한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct4' },
  // 2023 상반기
  { id: 'kia_ds_2023_1_1', job_id: 'j26', recruitment_id: 'r20', question_no: 1, content: '혁신적인 디자인으로 높은 평가를 받은 경험을 기술해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
  { id: 'kia_ds_2023_1_2', job_id: 'j26', recruitment_id: 'r20', question_no: 2, content: '브랜드 아이덴티티를 강화하는 디자인을 한 사례를 작성해 주십시오.', max_chars: 1000, competency_type_id: 'ct3' },
];

export const mockCompetencyTypes: CompetencyType[] = [
  { id: 'ct1', label: '문제해결', description: '복잡한 문제를 분석하고 효과적인 해결책을 찾는 능력' },
  { id: 'ct2', label: '협업/소통', description: '다양한 사람들과 효과적으로 협력하고 의사소통하는 능력' },
  { id: 'ct3', label: '창의성', description: '새로운 아이디어를 제안하고 혁신적인 방법으로 접근하는 능력' },
  { id: 'ct4', label: '고객지향', description: '고객 니즈를 이해하고 고객 중심으로 사고하는 능력' },
  { id: 'ct5', label: '리더십', description: '팀을 이끌고 구성원에게 긍정적인 영향을 주는 능력' },
  { id: 'ct6', label: '전문성', description: '직무 관련 전문 지식과 기술을 보유하고 활용하는 능력' },
];

// 헬퍼 함수
export function getCompanyById(id: string): Company | undefined {
  return mockCompanies.find(c => c.id === id);
}

export function getRecruitmentsByCompany(companyId: string): Recruitment[] {
  return mockRecruitments.filter(r => r.company_id === companyId)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return a.half === '하반기' ? -1 : 1;
    });
}

export function getJobsByCompany(companyId: string): Job[] {
  return mockJobs.filter(j => j.company_id === companyId);
}

export function getQuestionsByJob(jobId: string): Question[] {
  return mockQuestions.filter(q => q.job_id === jobId)
    .sort((a, b) => a.question_no - b.question_no);
}

// 직무별로 최근 5년간의 모든 문항을 가져오는 함수 (년도/반기 정보 포함)
export function getQuestionsByJobTitle(companyId: string, jobTitle: string): Question[] {
  // 해당 기업의 해당 직무명을 가진 모든 job 찾기
  const jobs = mockJobs.filter(j => j.company_id === companyId && j.job_title === jobTitle);
  const jobIds = jobs.map(j => j.id);
  
  // 해당 job들의 문항만 가져오기
  const questions = mockQuestions.filter(q => jobIds.includes(q.job_id));
  
  // recruitment_id로 정렬 (최신 순)
  return questions.sort((a, b) => {
    if (!a.recruitment_id || !b.recruitment_id) return 0;
    const aRecruitment = mockRecruitments.find(r => r.id === a.recruitment_id);
    const bRecruitment = mockRecruitments.find(r => r.id === b.recruitment_id);
    if (!aRecruitment || !bRecruitment) return 0;
    
    if (aRecruitment.year !== bRecruitment.year) {
      return bRecruitment.year - aRecruitment.year; // 최신년도 우선
    }
    return aRecruitment.half === '하반기' ? -1 : 1; // 하반기 우선
  });
}

export function getCompetencyTypeById(id: string): CompetencyType | undefined {
  return mockCompetencyTypes.find(ct => ct.id === id);
}

// 기업의 직무를 카테고리별로 그룹화
export function getJobsByCategory(companyId: string): Record<string, Job[]> {
  const jobs = getJobsByCompany(companyId);
  return jobs.reduce((acc, job) => {
    const category = job.category || '기타';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(job);
    return acc;
  }, {} as Record<string, Job[]>);
}
