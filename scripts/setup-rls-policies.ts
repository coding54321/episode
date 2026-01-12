import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // 서비스 키가 필요합니다

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required for this script');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRLSPolicies() {
  console.log('Setting up RLS policies for users table...');

  try {
    // 1. users 테이블에 대한 RLS 정책 생성

    // INSERT 정책: 사용자가 자신의 레코드를 생성할 수 있도록 허용
    const insertPolicy = `
      CREATE POLICY "Users can insert their own record"
      ON users FOR INSERT
      WITH CHECK (auth.uid()::text = id);
    `;

    // SELECT 정책: 사용자가 자신의 레코드를 읽을 수 있도록 허용
    const selectPolicy = `
      CREATE POLICY "Users can read their own record"
      ON users FOR SELECT
      USING (auth.uid()::text = id);
    `;

    // UPDATE 정책: 사용자가 자신의 레코드를 업데이트할 수 있도록 허용
    const updatePolicy = `
      CREATE POLICY "Users can update their own record"
      ON users FOR UPDATE
      USING (auth.uid()::text = id);
    `;

    // RLS 활성화
    const enableRLS = `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`;

    console.log('Enabling RLS on users table...');
    const { error: rlsError } = await supabase.rpc('execute_sql', { sql: enableRLS });
    if (rlsError && !rlsError.message.includes('already')) {
      console.error('Error enabling RLS:', rlsError);
    } else {
      console.log('✓ RLS enabled on users table');
    }

    console.log('Creating INSERT policy...');
    const { error: insertError } = await supabase.rpc('execute_sql', { sql: insertPolicy });
    if (insertError && !insertError.message.includes('already exists')) {
      console.error('Error creating INSERT policy:', insertError);
    } else {
      console.log('✓ INSERT policy created');
    }

    console.log('Creating SELECT policy...');
    const { error: selectError } = await supabase.rpc('execute_sql', { sql: selectPolicy });
    if (selectError && !selectError.message.includes('already exists')) {
      console.error('Error creating SELECT policy:', selectError);
    } else {
      console.log('✓ SELECT policy created');
    }

    console.log('Creating UPDATE policy...');
    const { error: updateError } = await supabase.rpc('execute_sql', { sql: updatePolicy });
    if (updateError && !updateError.message.includes('already exists')) {
      console.error('Error creating UPDATE policy:', updateError);
    } else {
      console.log('✓ UPDATE policy created');
    }

    console.log('All RLS policies have been set up successfully!');

  } catch (error) {
    console.error('Error setting up RLS policies:', error);
  }
}

async function setupUserTrigger() {
  console.log('Setting up user registration trigger...');

  try {
    // 사용자 등록 함수 생성
    const createFunction = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.users (id, provider, provider_user_id, name, email)
        VALUES (
          NEW.id,
          COALESCE(NEW.app_metadata->>'provider', 'email'),
          NEW.id,
          COALESCE(
            NEW.user_metadata->>'name',
            NEW.user_metadata->>'full_name',
            NEW.user_metadata->>'nickname',
            split_part(NEW.email, '@', 1),
            'User'
          ),
          NEW.email
        )
        ON CONFLICT (id) DO UPDATE SET
          name = COALESCE(
            NEW.user_metadata->>'name',
            NEW.user_metadata->>'full_name',
            NEW.user_metadata->>'nickname',
            split_part(NEW.email, '@', 1),
            users.name
          ),
          email = COALESCE(NEW.email, users.email),
          updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // 트리거 생성
    const createTrigger = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;

    console.log('Creating user registration function...');
    const { error: functionError } = await supabase.rpc('execute_sql', { sql: createFunction });
    if (functionError) {
      console.error('Error creating function:', functionError);
    } else {
      console.log('✓ User registration function created');
    }

    console.log('Creating trigger...');
    const { error: triggerError } = await supabase.rpc('execute_sql', { sql: createTrigger });
    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
    } else {
      console.log('✓ User registration trigger created');
    }

    console.log('User registration trigger has been set up successfully!');

  } catch (error) {
    console.error('Error setting up user trigger:', error);
  }
}

async function main() {
  console.log('Setting up Supabase database policies and triggers...\n');

  // await setupRLSPolicies();
  // console.log('\n');
  await setupUserTrigger();

  console.log('\nSetup completed!');
  process.exit(0);
}

main().catch(console.error);