/**
 * 기업 정보 DB 조회 함수
 * Supabase에서 기업/직무/문항 데이터를 조회하는 헬퍼 함수
 */

import { supabase } from './client';
import type { Company, Job, Question, Recruitment, CompetencyType } from '@/types';

// 기업 목록 조회
export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('기업 목록 조회 실패:', error);
    return [];
  }

  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    logo_url: c.logo_url || undefined,
  }));
}

// 기업 ID로 조회
export async function getCompanyById(id: string): Promise<Company | undefined> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('기업 조회 실패:', error);
    return undefined;
  }

  if (!data) return undefined;

  return {
    id: data.id,
    name: data.name,
    industry: data.industry,
    logo_url: data.logo_url || undefined,
  };
}

// 기업별 채용 공고 조회
export async function getRecruitmentsByCompany(companyId: string): Promise<Recruitment[]> {
  const { data, error } = await supabase
    .from('recruitments')
    .select('*')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('half', { ascending: false });

  if (error) {
    console.error('채용 공고 조회 실패:', error);
    return [];
  }

  return (data || []).map(r => ({
    id: r.id,
    company_id: r.company_id,
    year: r.year,
    half: r.half as '상반기' | '하반기',
    start_date: r.start_date,
    end_date: r.end_date,
  }));
}

// 기업별 직무 조회
export async function getJobsByCompany(companyId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('job_title', { ascending: true });

  if (error) {
    console.error('직무 조회 실패:', error);
    return [];
  }

  return (data || []).map(j => ({
    id: j.id,
    company_id: j.company_id,
    job_title: j.job_title,
    department: j.department || '',
    category: j.category || undefined,
  }));
}

// 직무를 카테고리별로 그룹화
export async function getJobsByCategory(companyId: string): Promise<Record<string, Job[]>> {
  const jobs = await getJobsByCompany(companyId);
  return jobs.reduce((acc, job) => {
    const category = job.category || '기타';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(job);
    return acc;
  }, {} as Record<string, Job[]>);
}

// 직무 ID로 문항 조회
export async function getQuestionsByJob(jobId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      recruitments!inner(year, half)
    `)
    .eq('job_id', jobId)
    .order('question_no', { ascending: true });

  if (error) {
    console.error('문항 조회 실패:', error);
    return [];
  }

  return (data || []).map(q => ({
    id: q.id,
    job_id: q.job_id,
    recruitment_id: q.recruitment_id,
    question_no: q.question_no,
    content: q.content,
    max_chars: q.max_chars || 0,
    competency_type_id: q.competency_type_id || '',
  }));
}

// 직무명으로 문항 조회 (같은 직무명을 가진 모든 직무의 문항)
// recruitment 정보를 포함한 Question 배열 반환
export async function getQuestionsByJobTitle(companyId: string, jobTitle: string): Promise<Array<Question & { recruitment?: Recruitment }>> {
  // 1. 해당 기업의 해당 직무명을 가진 모든 job 찾기
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id')
    .eq('company_id', companyId)
    .eq('job_title', jobTitle)
    .eq('is_active', true);

  if (jobsError || !jobs || jobs.length === 0) {
    return [];
  }

  const jobIds = jobs.map(j => j.id);

  // 2. 해당 job들의 문항 가져오기 (recruitment 정보 포함)
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select(`
      *,
      recruitments!inner(id, year, half, company_id, start_date, end_date)
    `)
    .in('job_id', jobIds)
    .order('question_no', { ascending: true });

  if (questionsError) {
    console.error('문항 조회 실패:', questionsError);
    return [];
  }

  // 3. recruitment 정보로 정렬 (최신 순)
  const questionsWithRecruitment = (questions || []).map((q: any) => {
    const recruitment = q.recruitments;
    return {
      id: q.id,
      job_id: q.job_id,
      recruitment_id: q.recruitment_id,
      question_no: q.question_no,
      content: q.content,
      max_chars: q.max_chars || 0,
      competency_type_id: q.competency_type_id || '',
      recruitment: recruitment ? {
        id: recruitment.id,
        company_id: recruitment.company_id,
        year: recruitment.year,
        half: recruitment.half as '상반기' | '하반기',
        start_date: recruitment.start_date,
        end_date: recruitment.end_date,
      } : undefined,
      _recruitment: recruitment, // 정렬용
    };
  });

  return questionsWithRecruitment
    .sort((a, b) => {
      const aRec = a._recruitment;
      const bRec = b._recruitment;
      if (!aRec || !bRec) return 0;
      
      if (aRec.year !== bRec.year) {
        return bRec.year - aRec.year; // 최신년도 우선
      }
      return aRec.half === '하반기' ? -1 : 1; // 하반기 우선
    })
    .map(({ _recruitment, ...q }) => q); // _recruitment 제거
}

// 문항과 함께 recruitment 정보를 포함하여 조회 (GapDiagnosis용)
export async function getQuestionsWithRecruitment(jobId: string): Promise<Array<Question & { recruitment?: Recruitment }>> {
  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      recruitments!inner(id, year, half, company_id, start_date, end_date)
    `)
    .eq('job_id', jobId)
    .order('question_no', { ascending: true });

  if (error) {
    console.error('문항 조회 실패:', error);
    return [];
  }

  return (data || []).map((q: any) => ({
    id: q.id,
    job_id: q.job_id,
    recruitment_id: q.recruitment_id,
    question_no: q.question_no,
    content: q.content,
    max_chars: q.max_chars || 0,
    competency_type_id: q.competency_type_id || '',
    recruitment: q.recruitments ? {
      id: q.recruitments.id,
      company_id: q.recruitments.company_id,
      year: q.recruitments.year,
      half: q.recruitments.half as '상반기' | '하반기',
      start_date: q.recruitments.start_date,
      end_date: q.recruitments.end_date,
    } : undefined,
  }));
}

// 역량 유형 조회
export async function getCompetencyTypes(): Promise<CompetencyType[]> {
  const { data, error } = await supabase
    .from('competency_types')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('역량 유형 조회 실패:', error);
    return [];
  }

  return (data || []).map(ct => ({
    id: ct.id,
    label: ct.label,
    description: ct.description || undefined,
  }));
}

// 역량 유형 ID로 조회
export async function getCompetencyTypeById(id: string): Promise<CompetencyType | undefined> {
  const { data, error } = await supabase
    .from('competency_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('역량 유형 조회 실패:', error);
    return undefined;
  }

  if (!data) return undefined;

  return {
    id: data.id,
    label: data.label,
    description: data.description || undefined,
  };
}

