'use client'

import React from 'react'
import { AlertCircle, RefreshCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthError } from '@/lib/auth/auth-errors'

interface ErrorMessageProps {
  error: AuthError | string | null
  onRetry?: () => void
  onDismiss?: () => void
  showRetry?: boolean
  className?: string
}

export function ErrorMessage({
  error,
  onRetry,
  onDismiss,
  showRetry = false,
  className = ''
}: ErrorMessageProps) {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.userMessage
  const isRetryable = typeof error === 'object' && error.code &&
    ['NETWORK_ERROR', 'DATABASE_ERROR'].includes(error.code)

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="ml-3 flex-1">
          <p className="text-sm text-red-800 font-medium">
            {errorMessage}
          </p>

          {(showRetry || isRetryable) && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}