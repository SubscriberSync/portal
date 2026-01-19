'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'An unexpected error occurred'

  // Decode URL-encoded message
  const decodedMessage = decodeURIComponent(message).replace(/\+/g, ' ')

  // Map common error messages to user-friendly descriptions
  const getErrorDetails = (msg: string) => {
    const lowerMsg = msg.toLowerCase()
    
    if (lowerMsg.includes('invalid state') || lowerMsg.includes('state mismatch')) {
      return {
        title: 'Session Expired',
        description: 'Your authentication session has expired. Please try connecting again.',
        suggestion: 'This usually happens if you waited too long or opened the link in a different browser.',
      }
    }
    
    if (lowerMsg.includes('missing parameters') || lowerMsg.includes('missing')) {
      return {
        title: 'Missing Information',
        description: 'The authentication process did not complete properly.',
        suggestion: 'Please try the connection process again from the beginning.',
      }
    }
    
    if (lowerMsg.includes('session expired')) {
      return {
        title: 'Session Expired',
        description: 'Your session has expired.',
        suggestion: 'Please sign in again and retry your action.',
      }
    }
    
    if (lowerMsg.includes('internal error') || lowerMsg.includes('internal')) {
      return {
        title: 'Server Error',
        description: 'Something went wrong on our end.',
        suggestion: 'Please try again in a few moments. If the problem persists, contact support.',
      }
    }
    
    if (lowerMsg.includes('unauthorized') || lowerMsg.includes('auth')) {
      return {
        title: 'Authentication Required',
        description: 'You need to be signed in to perform this action.',
        suggestion: 'Please sign in and try again.',
      }
    }

    return {
      title: 'Something Went Wrong',
      description: decodedMessage,
      suggestion: 'Please try again or contact support if the problem continues.',
    }
  }

  const errorDetails = getErrorDetails(decodedMessage)

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-8">
          {/* Error Icon */}
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            {errorDetails.title}
          </h1>

          {/* Error Description */}
          <p className="text-[#a1a1aa] text-center mb-4">
            {errorDetails.description}
          </p>

          {/* Suggestion */}
          <div className="bg-[#0c0c0c] rounded-xl p-4 mb-8">
            <p className="text-sm text-[#666] text-center">
              {errorDetails.suggestion}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#252525] text-white font-medium rounded-xl hover:bg-[#333] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#e07a42] text-white font-semibold rounded-xl hover:bg-[#c86a35] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Start Over
            </Link>
          </div>

          {/* Support Link */}
          <p className="text-xs text-[#666] text-center mt-6">
            Need help?{' '}
            <a
              href="mailto:support@subscribersync.com"
              className="text-[#e07a42] hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <div className="text-[#a1a1aa]">Loading...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
