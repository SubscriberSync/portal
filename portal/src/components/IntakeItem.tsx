'use client'

import { useState } from 'react'
import { Check, AlertTriangle, Clock, HelpCircle, Loader2, Send, Eye, EyeOff } from 'lucide-react'
import { IntakeItemConfig, IntakeSubmission, IntakeStatus } from '@/lib/intake-types'
import HelpPanel from './HelpPanel'

interface IntakeItemProps {
  config: IntakeItemConfig
  submission?: IntakeSubmission
  loomUrl?: string
  onSubmit: (value: string) => Promise<{ success: boolean; error?: string }>
  disabled?: boolean
}

// Helper to mask sensitive values (show first 4 and last 4 chars)
function maskValue(value: string): string {
  if (!value || value.length <= 12) return '••••••••••••'
  return `${value.substring(0, 4)}${'•'.repeat(Math.min(value.length - 8, 16))}${value.substring(value.length - 4)}`
}

const STATUS_CONFIG: Record<IntakeStatus, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  Pending: {
    icon: null,
    color: 'text-foreground-tertiary',
    bg: 'bg-background-elevated',
    label: '',
  },
  Submitted: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    label: 'Awaiting Review',
  },
  Approved: {
    icon: <Check className="w-4 h-4" />,
    color: 'text-success',
    bg: 'bg-success/10',
    label: 'Approved',
  },
  Rejected: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-600',
    bg: 'bg-red-100',
    label: 'Needs Revision',
  },
}

export default function IntakeItem({
  config,
  submission,
  loomUrl,
  onSubmit,
  disabled = false
}: IntakeItemProps) {
  const [value, setValue] = useState(submission?.value || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const status: IntakeStatus = submission?.status || 'Pending'
  const statusConfig = STATUS_CONFIG[status]

  // Check if there's already a submitted value (even if status isn't set properly)
  const hasExistingValue = !!(submission?.value && submission.value.trim())
  const isReadOnly = status === 'Submitted' || status === 'Approved' || (hasExistingValue && status === 'Pending')

  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting || disabled || isReadOnly) return
    
    setIsSubmitting(true)
    setError(null)
    
    const result = await onSubmit(value.trim())
    
    setIsSubmitting(false)
    
    if (!result.success) {
      setError(result.error || 'Submission failed')
    }
  }

  // Help panel steps based on item type
  const getHelpSteps = (): string[] => {
    switch (config.type) {
      case 'Recharge API Key':
        return [
          'Log into your Recharge admin',
          'Go to Apps → API tokens',
          'Click "Create an API token"',
          'Give it a name like "SubscriberSync"',
          'Copy the token (starts with pk_)',
          'Paste it here and submit',
        ]
      case 'Klaviyo API Key':
        return [
          'Log into your Klaviyo account',
          'Click Settings (gear icon)',
          'Go to Account → API Keys',
          'Find or create a Private API Key',
          'Copy the key',
          'Paste it here and submit',
        ]
      case 'Shopify Product IDs':
        return [
          'Open your Shopify admin',
          'Go to Products',
          'Click on your subscription product',
          'Look at the URL in your browser',
          'Copy the number at the end (e.g., 8234567890123)',
          'Paste each product ID on a new line',
        ]
      case 'Installment Name':
        return [
          'Think about what you call each delivery',
          'Common names: Episodes, Boxes, Chapters, Installments',
          'This will appear in your dashboard and reports',
          'Pick what feels right for your brand',
        ]
      default:
        return []
    }
  }
  
  // Approved state - collapsed
  if (status === 'Approved') {
    const displayValue = config.sensitive
      ? maskValue(submission?.value || '')
      : `${submission?.value?.substring(0, 30)}${(submission?.value?.length || 0) > 30 ? '...' : ''}`

    return (
      <div className="bg-success/5 rounded-xl p-4 border border-success/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} flex items-center justify-center ${statusConfig.color}`}>
              {statusConfig.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{config.title}</p>
              <p className="text-xs text-success font-mono">✓ {displayValue}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Submitted state OR has existing value - show read-only waiting state
  if (status === 'Submitted' || (hasExistingValue && status !== 'Rejected')) {
    const displayValue = config.sensitive
      ? maskValue(submission?.value || '')
      : `${submission?.value?.substring(0, 40)}${(submission?.value?.length || 0) > 40 ? '...' : ''}`

    return (
      <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} flex items-center justify-center ${statusConfig.color}`}>
              {statusConfig.icon || <Clock className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{config.title}</p>
              <p className="text-xs text-amber-600 mt-1">{statusConfig.label || 'Awaiting Review'}</p>
              <p className="text-xs text-foreground-tertiary mt-2 font-mono">{displayValue}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Pending or Rejected - editable
  return (
    <>
      <div className={`bg-background-secondary rounded-xl p-5 border transition-colors ${
        status === 'Rejected' ? 'border-red-300' : 'border-border hover:border-border-strong'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{config.title}</p>
              <button
                onClick={() => setShowHelp(true)}
                className="p-1 rounded-md hover:bg-background-elevated text-foreground-tertiary hover:text-foreground transition-colors"
                title="Need help?"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-foreground-secondary mt-1">{config.description}</p>
          </div>

          {status === 'Rejected' && (
            <div className={`px-2 py-1 rounded-md ${statusConfig.bg} ${statusConfig.color} flex items-center gap-1.5`}>
              {statusConfig.icon}
              <span className="text-xs font-medium">{statusConfig.label}</span>
            </div>
          )}
        </div>

        {/* Rejection note */}
        {status === 'Rejected' && submission?.rejectionNote && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-700">{submission.rejectionNote}</p>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          {config.multiline ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.placeholder}
              disabled={disabled || isSubmitting}
              rows={3}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50 font-mono resize-none"
            />
          ) : (
            <div className="flex-1 relative">
              <input
                type={config.sensitive && !showPassword ? 'password' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={config.placeholder}
                disabled={disabled || isSubmitting}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
              />
              {config.sensitive && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-foreground-tertiary hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isSubmitting || disabled}
            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-background-elevated disabled:text-foreground-tertiary text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                {status === 'Rejected' ? 'Resubmit' : 'Submit'}
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}
      </div>
      
      {/* Help Panel */}
      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title={config.title}
        description={config.description}
        helpText={config.helpText}
        loomUrl={loomUrl}
        steps={getHelpSteps()}
      />
    </>
  )
}
