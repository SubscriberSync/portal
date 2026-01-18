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
      <div className="relative rounded-2xl bg-[#5CB87A]/5 border border-[#5CB87A]/15 overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#5CB87A]/30 to-transparent" />

        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-5 flex items-center justify-between hover:bg-[#5CB87A]/10 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#5CB87A]/15 border border-[#5CB87A]/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-[#5CB87A]" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-[#F5F0E8]">Step 1: Connect Your Systems</h3>
              <p className="text-sm text-[#5CB87A]">All credentials approved</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-[#6B6660]" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#C9A962]/25 to-transparent" />

      {/* Header */}
      <div
        className={`p-5 border-b border-[rgba(245,240,232,0.06)] ${allApproved ? 'cursor-pointer hover:bg-[#1A1A1A]' : ''}`}
        onClick={allApproved ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
              allApproved
                ? 'bg-[#5CB87A]/10 border-[#5CB87A]/20'
                : 'bg-[#C9A962]/10 border-[#C9A962]/20'
            }`}>
              {allApproved ? (
                <Check className="w-5 h-5 text-[#5CB87A]" />
              ) : (
                <Zap className="w-5 h-5 text-[#C9A962]" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-[#F5F0E8]">Step 1: Connect Your Systems</h3>
              <p className="text-sm text-[#6B6660]">
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
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      sub?.status === 'Approved' ? 'bg-[#5CB87A]' :
                      sub?.status === 'Submitted' ? 'bg-[#D4A853]' :
                      sub?.status === 'Rejected' ? 'bg-[#D47070]' :
                      'bg-[#4A4743]'
                    }`}
                    title={`${item.title}: ${sub?.status || 'Pending'}`}
                  />
                )
              })}
            </div>
            {allApproved && (
              isExpanded ? (
                <ChevronUp className="w-5 h-5 text-[#6B6660]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6B6660]" />
              )
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!allApproved && (
          <div className="mt-4 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#A8893F] to-[#C9A962] transition-all duration-500 rounded-full"
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
