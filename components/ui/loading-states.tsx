'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = '로딩 중...' }: PageLoadingProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-blue-600 dark:text-blue-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>
      </div>
    </div>
  )
}

interface AuthLoadingProps {
  message?: string
}

export function AuthLoading({ message = '인증 확인 중...' }: AuthLoadingProps) {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-blue-600 dark:text-blue-400 mx-auto mb-3" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  )
}

interface ButtonLoadingProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export function ButtonWithLoading({
  loading,
  children,
  loadingText,
  disabled,
  className = '',
  onClick,
  ...props
}: ButtonLoadingProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          {loadingText || '처리 중...'}
        </>
      ) : (
        children
      )}
    </button>
  )
}