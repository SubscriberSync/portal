'use client'

import { useState, useCallback } from 'react'
import { Check, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { INTAKE_ITEMS, IntakeSubmission, ClientOnboardingData, IntakeItemType } from '@/lib/intake-types'
import IntakeItem from './IntakeItem'

interface IntakeStep1Props {
  clientSlug: string
  submissions: IntakeSubmission[]
  onboardingData: ClientOnboardingData
  onSubmitItem: (item: IntakeItemType, value: string) => Promise<{ success: boolean; error?: string }>
  onRefresh: () => void
}

export default function IntakeStep1({ 
  clientSlug,
  submissions, 
  onboardingData,
  onSubmitItem,
  onRefresh
}: IntakeStep1Props) {
  const [isExpanded, setIsExpanded] = useState(!onboardingData.step1Complete)
  
  // Get submission for each item
  const getSubmission = (itemType: IntakeItemType): IntakeSubmission | undefined => {
    return submissions.find(s => s.item === itemType)
  }
  
  // Get Loom URL for each item type
  const getLoomUrl = (loomField: string | null): string | undefined => {
    if (!loomField) return undefined
    return (onboardingData as any)[loomField]
  }
  
  // Calculate progress
  const approvedCount = INTAKE_ITEMS.filter(item => 
    getSubmission(item.type)?.status === 'Approved'
  ).length
  const submittedCount = INTAKE_ITEMS.filter(item => 
    getSubmission(item.type)?.status === 'Submitted'
  ).length
  const totalCount = INTAKE_ITEMS.length
  
  const allApproved = approvedCount === totalCount
  const progressPercent = (approvedCount / totalCount) * 100
  
  // Handle submission
  const handleSubmit = useCallback(async (itemType: IntakeItemType, value: string) => {
    const result = await onSubmitItem(itemType, value)
    if (result.success) {
      onRefresh()
    }
    return result
  }, [onSubmitItem, onRefresh])
  
  // Completed state
  if (allApproved && !isExpanded) {
    return (
      <div className="bg-success/5 rounded-2xl border border-success/20 overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-5 flex items-center justify-between hover:bg-success/10 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground">Step 1: Connect Your Systems</h3>
              <p className="text-sm text-success">✓ All credentials approved</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-foreground-tertiary" />
        </button>
      </div>
    )
  }
  
  return (
    <div className="bg-background-secondary rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div
        className={`p-5 border-b border-border ${allApproved ? 'cursor-pointer hover:bg-background-elevated' : ''}`}
        onClick={allApproved ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              allApproved
                ? 'bg-success/20'
                : 'bg-accent/20'
            }`}>
              {allApproved ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Zap className="w-5 h-5 text-accent" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Step 1: Connect Your Systems</h3>
              <p className="text-sm text-foreground-secondary">
                {allApproved
                  ? 'All credentials approved'
                  : submittedCount > 0
                    ? `${approvedCount} approved, ${submittedCount} awaiting review`
                    : 'Submit your API keys and product info'
                }
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {INTAKE_ITEMS.map((item, i) => {
                const sub = getSubmission(item.type)
                return (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      sub?.status === 'Approved' ? 'bg-success' :
                      sub?.status === 'Submitted' ? 'bg-amber-500' :
                      sub?.status === 'Rejected' ? 'bg-red-500' :
                      'bg-foreground-tertiary/30'
                    }`}
                    title={`${item.title}: ${sub?.status || 'Pending'}`}
                  />
                )
              })}
            </div>
            {allApproved && (
              isExpanded ? (
                <ChevronUp className="w-5 h-5 text-foreground-tertiary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-foreground-tertiary" />
              )
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!allApproved && (
          <div className="mt-4 h-1.5 bg-background-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-amber-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-5 space-y-4">
          {INTAKE_ITEMS.map((item, index) => (
            <IntakeItem
              key={item.type}
              config={item}
              submission={getSubmission(item.type)}
              loomUrl={getLoomUrl(item.loomField)}
              onSubmit={(value) => handleSubmit(item.type, value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
