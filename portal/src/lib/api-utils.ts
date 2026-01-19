import { NextResponse } from 'next/server'

/**
 * Standardized error response for API routes
 * Provides type-safe error handling and consistent logging
 */
export function handleApiError(
  error: unknown,
  context: string,
  fallbackMessage = 'Internal server error'
): NextResponse {
  const message = error instanceof Error ? error.message : fallbackMessage
  console.error(`[${context}] Error:`, error instanceof Error ? error.message : error)
  
  return NextResponse.json(
    { error: message },
    { status: 500 }
  )
}

/**
 * Type guard for checking if a value is an Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}
