import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mockQuestions } from '../lib/mockData';

// .env.local 파일 로드
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateQuestions() {
  console.log('🚀 자기소개서 문항 데이터 마이그레이션 시작...\n');

  let successCount = 0;
  let errorCount = 0;

  // 문항을 배치로 나눠서 삽입 (한 번에 너무 많이 하면 타임아웃 가능)
  const batchSize = 20;
  for (let i = 0; i < mockQuestions.length; i += batchSize) {
    const batch = mockQuestions.slice(i, i + batchSize);
    
    for (const question of batch) {
      try {
        const { error } = await supabase
          .from('questions')
          .upsert({
            id: question.id,
            job_id: question.job_id,
            recruitment_id: question.recruitment_id,
            question_no: question.question_no,
            content: question.content,
            max_chars: question.max_chars,
            competency_type_id: question.competency_type_id,
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error(`  ❌ ${question.id} 삽입 실패:`, error.message);
          errorCount++;
        } else {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`  ✅ ${successCount}개 문항 삽입 완료...`);
          }
        }
      } catch (err: any) {
        console.error(`  ❌ ${question.id} 삽입 실패:`, err.message);
        errorCount++;
      }
    }
  }

  console.log(`\n🎉 문항 데이터 마이그레이션 완료!`);
  console.log(`  ✅ ${successCount}개 문항 삽입 완료`);
  if (errorCount > 0) {
    console.log(`  ❌ ${errorCount}개 문항 삽입 실패`);
  }
}

migrateQuestions()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

