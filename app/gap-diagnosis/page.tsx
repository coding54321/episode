'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userStorage } from '@/lib/storage';
import GapDiagnosis from '@/components/gap/GapDiagnosis';
import FloatingHeader from '@/components/FloatingHeader';

export default function GapDiagnosisPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 로그인 확인
      const user = await userStorage.load();
      if (!user) {
        router.push('/login');
        return;
      }

      // 페이지 로드 시 모달 열기
      setIsOpen(true);
    };

    checkAuth();
  }, [router]);

  const handleResultButtonClick = () => {
    // 공백 진단 완료 후 새 마인드맵 생성 페이지로 이동
    router.push('/project-type-selection');
  };

  const handleClose = () => {
    // 모달 닫기 시 마인드맵 페이지로 이동
    router.push('/mindmaps');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <FloatingHeader />
      <GapDiagnosis
        isOpen={isOpen}
        onClose={handleClose}
        resultButtonText="경험 정리하러 가기"
        onResultButtonClick={handleResultButtonClick}
      />
    </div>
  );
}
