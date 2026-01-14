import { Suspense } from 'react';
import BadgeSelectionClient from './BadgeSelectionClient';

export default function BadgeSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-[#a0a0a0]">로딩 중...</p>
          </div>
        </div>
      }
    >
      <BadgeSelectionClient />
    </Suspense>
  );
}

