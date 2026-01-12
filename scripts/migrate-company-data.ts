/**
 * 기업 정보 데이터 마이그레이션 스크립트
 * lib/mockData.ts의 데이터를 Supabase DB로 이전
 * 
 * 실행 방법:
 * npx tsx scripts/migrate-company-data.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';
import {
  mockCompanies,
  mockRecruitments,
  mockJobs,
  mockQuestions,
  mockCompetencyTypes,
} from '../lib/mockData';

// .env.local 파일 로드 (프로젝트 루트 기준)
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('환경 변수 확인:');
console.log('SUPABASE_URL:', supabaseUrl ? '설정됨' : '없음');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '설정됨' : '없음');
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

async function migrateCompanyData() {
  console.log('🚀 기업 정보 데이터 마이그레이션 시작...\n');

  try {
    // 1. 역량 유형 먼저 삽입
    console.log('1️⃣ 역량 유형 삽입 중...');
    for (const ct of mockCompetencyTypes) {
      const { error } = await supabase.from('competency_types').upsert({
        id: ct.id,
        label: ct.label,
        description: ct.description,
        display_order: parseInt(ct.id.replace('ct', '')) || 0,
      }, {
        onConflict: 'id',
      });

      if (error) {
        console.error(`  ❌ ${ct.label} 삽입 실패:`, error.message);
      } else {
        console.log(`  ✅ ${ct.label} 삽입 완료`);
      }
    }
    console.log('');

    // 2. 기업 정보 삽입
    console.log('2️⃣ 기업 정보 삽입 중...');
    for (const company of mockCompanies) {
      const { error } = await supabase.from('companies').upsert({
        id: company.id,
        name: company.name,
        industry: company.industry,
        logo_url: company.logo_url,
        is_active: true,
        display_order: 0,
      }, {
        onConflict: 'id',
      });

      if (error) {
        console.error(`  ❌ ${company.name} 삽입 실패:`, error.message);
      } else {
        console.log(`  ✅ ${company.name} 삽입 완료`);
      }
    }
    console.log('');

    // 3. 채용 공고 삽입
    console.log('3️⃣ 채용 공고 삽입 중...');
    for (const recruitment of mockRecruitments) {
      const { error } = await supabase.from('recruitments').upsert({
        id: recruitment.id,
        company_id: recruitment.company_id,
        year: recruitment.year,
        half: recruitment.half,
        start_date: recruitment.start_date,
        end_date: recruitment.end_date,
      }, {
        onConflict: 'id',
      });

      if (error) {
        console.error(`  ❌ ${recruitment.id} 삽입 실패:`, error.message);
      } else {
        console.log(`  ✅ ${recruitment.id} 삽입 완료`);
      }
    }
    console.log('');

    // 4. 직무 삽입
    console.log('4️⃣ 직무 정보 삽입 중...');
    for (const job of mockJobs) {
      const { error } = await supabase.from('jobs').upsert({
        id: job.id,
        company_id: job.company_id,
        job_title: job.job_title,
        department: job.department,
        category: job.category,
        is_active: true,
        display_order: 0,
      }, {
        onConflict: 'id',
      });

      if (error) {
        console.error(`  ❌ ${job.job_title} 삽입 실패:`, error.message);
      } else {
        console.log(`  ✅ ${job.job_title} 삽입 완료`);
      }
    }
    console.log('');

    // 5. 문항 삽입
    console.log('5️⃣ 자기소개서 문항 삽입 중...');
    let successCount = 0;
    let errorCount = 0;

    for (const question of mockQuestions) {
      if (!question.recruitment_id) {
        console.warn(`  ⚠️ ${question.id}: recruitment_id가 없어 건너뜁니다.`);
        errorCount++;
        continue;
      }

      const { error } = await supabase.from('questions').upsert({
        id: question.id,
        job_id: question.job_id,
        recruitment_id: question.recruitment_id,
        question_no: question.question_no,
        content: question.content,
        max_chars: question.max_chars,
        competency_type_id: question.competency_type_id,
      }, {
        onConflict: 'id',
      });

      if (error) {
        console.error(`  ❌ ${question.id} 삽입 실패:`, error.message);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`  ✅ ${successCount}개 문항 삽입 완료`);
    if (errorCount > 0) {
      console.log(`  ⚠️ ${errorCount}개 문항 삽입 실패`);
    }
    console.log('');

    console.log('🎉 모든 데이터 마이그레이션 완료!');

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
migrateCompanyData()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

