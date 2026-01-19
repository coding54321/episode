'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useUnifiedAuth } from '@/lib/auth/unified-auth-context';
import { supabase } from '@/lib/supabase/client';
import { Upload, X, Plus } from 'lucide-react';

export default function OnboardingExperienceStartPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUnifiedAuth();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.pdf', '.docx', '.txt', '.csv', '.xlsx', '.xls'];

    const validFiles: File[] = [];
    
    fileArray.forEach((file) => {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const isValidType = validTypes.includes(file.type) || validExtensions.includes(fileExtension);

      if (!isValidType) {
        alert(`${file.name}: PDF, DOCX, TXT, CSV, XLSX 파일만 업로드 가능합니다.`);
        return;
      }

      // 중복 파일 체크
      const isDuplicate = uploadedFiles.some(
        (existingFile) => existingFile.name === file.name && existingFile.size === file.size
      );

      if (!isDuplicate) {
        validFiles.push(file);
      } else {
        alert(`${file.name}: 이미 추가된 파일입니다.`);
      }
    });

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // 같은 파일을 다시 선택할 수 있도록 리셋
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0 || !user) return;

    try {
      // 모든 파일을 Supabase Storage에 업로드 (버킷이 없을 수 있으므로 에러 처리)
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const filePath = `onboarding/${fileName}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('user-files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.warn(`File upload error for ${file.name} (continuing anyway):`, uploadError);
            // Storage 버킷이 없어도 온보딩은 계속 진행
          }
        } catch (storageError) {
          console.warn(`Storage error for ${file.name} (continuing anyway):`, storageError);
          // Storage 에러가 있어도 온보딩은 계속 진행
        }
      }

      // 업로드 성공/실패와 관계없이 정리 중 페이지로 이동 (시뮬레이션)
      router.push('/onboarding/processing?hasFile=true');
    } catch (error) {
      console.error('Error uploading files:', error);
      // 에러가 발생해도 온보딩은 계속 진행 (시뮬레이션)
      router.push('/onboarding/processing?hasFile=true');
    }
  };

  const handleStartWithoutFile = () => {
    router.push('/badge-selection');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5B6EFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 진행 표시기 */}
      <div className="flex justify-center items-center pt-12 pb-8">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full ${
                step === 3 ? 'bg-[#5B6EFF]' : step < 3 ? 'bg-[#5B6EFF]' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            경험 정리를
            <br />
            함께 시작해봐요
          </h1>

          {/* 파일 업로드 섹션 */}
          <div className="mb-8">
            <p className="text-base text-gray-700 mb-4 text-center">
              기존에 정리해둔 경험이 있나요?
            </p>

            {uploadedFiles.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-[#5B6EFF] bg-blue-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                  multiple
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">파일 첨부하기</p>
                  <p className="text-xs text-gray-500">
                    PDF, DOCX, TXT, CSV, XLSX 파일을 드래그하거나 클릭하여 업로드
                  </p>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 업로드된 파일 목록 */}
                {uploadedFiles.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-gray-200 rounded-lg p-4 bg-white relative"
                  >
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="pr-8">
                      <p className="text-base font-semibold text-gray-900 mb-1">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* 파일 추가 버튼 */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isDragging
                      ? 'border-[#5B6EFF] bg-blue-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.csv,.xlsx,.xls"
                    onChange={handleFileInputChange}
                    multiple
                    className="hidden"
                    id="file-upload-add"
                  />
                  <label
                    htmlFor="file-upload-add"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Plus className="w-6 h-6 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">파일 추가하기</p>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 시작하기 버튼 */}
          <div className="space-y-3">
            {uploadedFiles.length > 0 ? (
              <Button
                onClick={handleUpload}
                className="w-full h-[56px] bg-[#5B6EFF] hover:bg-[#4A5EE8] text-white font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200"
              >
                업로드하고 시작하기 ({uploadedFiles.length}개)
              </Button>
            ) : (
              <>
                <p className="text-base text-gray-600 mb-4 text-center">
                  경험을 정리해두지 않았어도 괜찮아요
                </p>
                <Button
                  onClick={handleStartWithoutFile}
                  variant="outline"
                  className="w-full h-[56px] border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold text-base rounded-[12px] shadow-sm transition-all duration-200"
                >
                  episode와 함께 시작하기
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
