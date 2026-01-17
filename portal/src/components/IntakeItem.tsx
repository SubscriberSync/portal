'use client'

import { useState } from 'react'
import { Check, AlertTriangle, Clock, HelpCircle, Loader2, Send } from 'lucide-react'
import { IntakeItemConfig, IntakeSubmission, IntakeStatus } from '@/lib/intake-types'
import HelpPanel from './HelpPanel'

interface IntakeItemProps {
  config: IntakeItemConfig
  submission?: IntakeSubmission
  loomUrl?: string
  onSubmit: (value: string) => Promise<{ success: boolean; error?: string }>
  disabled?: boolean
}

const STATUS_CONFIG: Record<IntakeStatus, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  Pending: {
    icon: null,
    color: 'text-slate-400',
    bg: 'bg-slate-700/50',
    label: '',
  },
  Submitted: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    label: 'Awaiting Review',
  },
  Approved: {
    icon: <Check className="w-4 h-4" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Approved',
  },
  Rejected: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
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
  
  const status: IntakeStatus = submission?.status || 'Pending'
  const statusConfig = STATUS_CONFIG[status]
  
  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting || disabled) return
    
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
    return (
      <div className="bg-slate-800/30 rounded-xl p-4 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} flex items-center justify-center ${statusConfig.color}`}>
              {statusConfig.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{config.title}</p>
              <p className="text-xs text-emerald-400">✓ {submission?.value?.substring(0, 30)}{(submission?.value?.length || 0) > 30 ? '...' : ''}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Submitted state - waiting
  if (status === 'Submitted') {
    return (
      <div className="bg-slate-800/50 rounded-xl p-5 border border-amber-500/20">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} flex items-center justify-center ${statusConfig.color}`}>
              {statusConfig.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{config.title}</p>
              <p className="text-xs text-amber-400 mt-1">{statusConfig.label}</p>
              <p className="text-xs text-slate-500 mt-2 font-mono">{submission?.value?.substring(0, 40)}{(submission?.value?.length || 0) > 40 ? '...' : ''}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Pending or Rejected - editable
  return (
    <>
      <div className={`bg-slate-800/50 rounded-xl p-5 border transition-colors ${
        status === 'Rejected' ? 'border-red-500/30' : 'border-slate-700/50 hover:border-slate-600/50'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-200">{config.title}</p>
              <button
                onClick={() => setShowHelp(true)}
                className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                title="Need help?"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">{config.description}</p>
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
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-300">{submission.rejectionNote}</p>
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
              className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-copper/50 focus:ring-1 focus:ring-copper/30 disabled:opacity-50 font-mono resize-none"
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.placeholder}
              disabled={disabled || isSubmitting}
              className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-copper/50 focus:ring-1 focus:ring-copper/30 disabled:opacity-50 font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit()
              }}
            />
          )}
          
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isSubmitting || disabled}
            className="px-4 py-2 bg-copper hover:bg-copper/90 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
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
          <p className="text-xs text-red-400 mt-2">{error}</p>
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
