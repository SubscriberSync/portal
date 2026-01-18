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
    color: 'text-[var(--foreground-tertiary)]',
    bg: 'bg-[var(--glass-bg)]',
    label: '',
  },
  Submitted: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-[#e07a42]',
    bg: 'bg-[rgba(224,122,66,0.15)]',
    label: 'Awaiting Review',
  },
  Approved: {
    icon: <Check className="w-4 h-4" />,
    color: 'text-[#5CB87A]',
    bg: 'bg-[rgba(92,184,122,0.15)]',
    label: 'Approved',
  },
  Rejected: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-[#ef4444]',
    bg: 'bg-[rgba(239,68,68,0.15)]',
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
      <div className="bg-[rgba(92,184,122,0.1)] rounded-xl p-4 border border-[rgba(92,184,122,0.2)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} flex items-center justify-center ${statusConfig.color}`}>
              {statusConfig.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{config.title}</p>
              <p className="text-xs text-[#5CB87A] font-mono">✓ {displayValue}</p>
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
      <div className="bg-[rgba(224,122,66,0.1)] rounded-xl p-5 border border-[rgba(224,122,66,0.2)]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} flex items-center justify-center ${statusConfig.color}`}>
              {statusConfig.icon || <Clock className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{config.title}</p>
              <p className="text-xs text-[#e07a42] mt-1">{statusConfig.label || 'Awaiting Review'}</p>
              <p className="text-xs text-[var(--foreground-tertiary)] mt-2 font-mono">{displayValue}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Pending or Rejected - editable
  return (
    <>
      <div className={`bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl p-5 border transition-colors shadow-[0_0_0_1px_var(--glass-inset)_inset,0_10px_20px_rgba(0,0,0,0.2)] ${
        status === 'Rejected' ? 'border-[rgba(239,68,68,0.3)]' : 'border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[var(--foreground)]">{config.title}</p>
              <button
                onClick={() => setShowHelp(true)}
                className="p-1 rounded-md hover:bg-[var(--glass-bg-hover)] text-[var(--foreground-tertiary)] hover:text-[var(--foreground)] transition-colors"
                title="Need help?"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--foreground-secondary)] mt-1">{config.description}</p>
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
          <div className="mb-4 p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]">
            <p className="text-xs text-[#ef4444]">{submission.rejectionNote}</p>
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
              className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 disabled:opacity-50 font-mono resize-none"
            />
          ) : (
            <div className="flex-1 relative">
              <input
                type={config.sensitive && !showPassword ? 'password' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={config.placeholder}
                disabled={disabled || isSubmitting}
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 disabled:opacity-50 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
              />
              {config.sensitive && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
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
            className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:bg-[var(--glass-bg)] disabled:text-[var(--foreground-muted)] text-[#0c0c0c] rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
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
          <p className="text-xs text-[#ef4444] mt-2">{error}</p>
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
