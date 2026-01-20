'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Info,
  ShieldAlert,
} from 'lucide-react'
import IntakeStep3Products from './IntakeStep3Products'
import IntakeStep4Customers from './IntakeStep4Customers'

interface MigrationStatus {
  steps: {
    scanComplete: boolean
    storiesCreated: boolean
    productsAssigned: boolean
    customersImported: boolean
    reviewComplete: boolean
    migrationComplete: boolean
  }
  variationStats: {
    total: number
    unassigned: number
    assigned: number
    ignored: number
    addons: number
  }
  customerStats: {
    total: number
    needsReview: number
    active: number
    completed: number
    churned: number
  }
  storiesCount: number
}

interface StoryMigrationCenterProps {
  organizationId: string
  clientSlug: string
}

export default function StoryMigrationCenter({
  organizationId,
  clientSlug,
}: StoryMigrationCenterProps) {
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationChecks, setConfirmationChecks] = useState({
    productsCorrect: false,
    episodesCorrect: false,
    understandImpact: false,
  })

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/migration/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error fetching migration status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleCompleteMigration = async () => {
    if (!allChecksConfirmed) return

    try {
      setIsCompleting(true)
      const response = await fetch('/api/migration/complete', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete migration')
      }

      // Refresh the page to show the main dashboard
      window.location.reload()
    } catch (error) {
      console.error('Error completing migration:', error)
      alert(error instanceof Error ? error.message : 'Failed to complete migration')
    } finally {
      setIsCompleting(false)
    }
  }

  // Step 1 is unlocked once Shopify is connected (which it must be to see this)
  const isStep1Unlocked = true

  // Step 2 is unlocked when all products are assigned
  const isStep2Unlocked = status?.steps.productsAssigned || false

  // Can show completion option when customers imported and reviewed
  const canShowComplete = status?.steps.customersImported && status?.steps.reviewComplete

  // All confirmation checks must be true
  const allChecksConfirmed = confirmationChecks.productsCorrect &&
                             confirmationChecks.episodesCorrect &&
                             confirmationChecks.understandImpact

  if (isLoading) {
    return (
      <div className="bg-background-secondary rounded-2xl border border-border p-8">
        <div className="flex items-center justify-center gap-3 text-foreground-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading migration status...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/20 p-6">
        <h2 className="text-xl font-bold text-foreground mb-2">
          Customer Migration Center
        </h2>
        <p className="text-foreground-secondary mb-4">
          This is the most important setup step. We need to understand your products and
          import your existing customers with their correct shipment positions.
        </p>

        {/* Why this matters callout */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-200">Why this matters</p>
              <p className="text-xs text-amber-300/80 mt-1">
                If products are mapped incorrectly or customers have wrong shipment numbers,
                they'll receive the wrong items. Take your time to get this right.
              </p>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            isStep2Unlocked ? 'bg-success text-white' : 'bg-accent text-white'
          }`}>
            {isStep2Unlocked ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`flex-1 h-1 rounded ${isStep2Unlocked ? 'bg-success' : 'bg-border'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            canShowComplete ? 'bg-success text-white' : isStep2Unlocked ? 'bg-accent text-white' : 'bg-border text-foreground-tertiary'
          }`}>
            {canShowComplete ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <div className={`flex-1 h-1 rounded ${canShowComplete ? 'bg-success' : 'bg-border'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-border text-foreground-tertiary`}>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-foreground-tertiary">
          <span>Map Products</span>
          <span>Import Customers</span>
          <span>Go Live</span>
        </div>
      </div>

      {/* Step 1: Map Products */}
      <IntakeStep3Products
        clientSlug={clientSlug}
        isUnlocked={isStep1Unlocked}
        onRefresh={fetchStatus}
        onComplete={fetchStatus}
      />

      {/* Step 2: Import Customers */}
      <IntakeStep4Customers
        clientSlug={clientSlug}
        isUnlocked={isStep2Unlocked}
        onRefresh={fetchStatus}
        onComplete={() => setShowConfirmation(true)}
      />

      {/* Ready to Complete Section - Only show when both steps are done */}
      {canShowComplete && !showConfirmation && (
        <div className="bg-background-secondary rounded-2xl border border-border p-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Ready to complete migration?
              </h3>
              <p className="text-sm text-foreground-secondary mb-4">
                You've mapped your products and imported customers. Before completing,
                please review everything carefully. Once completed, the system will start
                tracking customer episodes based on your configuration.
              </p>
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium"
              >
                Review and Complete Migration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Complete Migration Setup
                  </h3>
                  <p className="text-sm text-foreground-secondary">
                    Please confirm before proceeding
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Warning */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-200 font-medium mb-2">
                  This action will activate the subscription tracking system
                </p>
                <ul className="text-xs text-amber-300/80 space-y-1 list-disc list-inside">
                  <li>New orders will be processed based on your product mappings</li>
                  <li>Customers will be assigned shipment numbers based on imported data</li>
                  <li>Incorrect mappings could result in customers receiving the wrong items</li>
                </ul>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-background-elevated rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{status?.variationStats.assigned || 0}</p>
                  <p className="text-xs text-foreground-tertiary">Products Mapped</p>
                </div>
                <div className="p-3 bg-background-elevated rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{status?.customerStats.total || 0}</p>
                  <p className="text-xs text-foreground-tertiary">Customers Imported</p>
                </div>
              </div>

              {/* Confirmation Checkboxes */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Please confirm:</p>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-background-elevated cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmationChecks.productsCorrect}
                    onChange={(e) => setConfirmationChecks(prev => ({ ...prev, productsCorrect: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded border-foreground-tertiary"
                  />
                  <div>
                    <p className="text-sm text-foreground">Product mappings are correct</p>
                    <p className="text-xs text-foreground-tertiary">
                      I've verified that each product variation is assigned to the correct subscription and tier
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-background-elevated cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmationChecks.episodesCorrect}
                    onChange={(e) => setConfirmationChecks(prev => ({ ...prev, episodesCorrect: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded border-foreground-tertiary"
                  />
                  <div>
                    <p className="text-sm text-foreground">Customer shipment numbers are accurate</p>
                    <p className="text-xs text-foreground-tertiary">
                      I've reviewed customer shipment positions and made any necessary adjustments
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-background-elevated cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmationChecks.understandImpact}
                    onChange={(e) => setConfirmationChecks(prev => ({ ...prev, understandImpact: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded border-foreground-tertiary"
                  />
                  <div>
                    <p className="text-sm text-foreground">I understand this will activate the system</p>
                    <p className="text-xs text-foreground-tertiary">
                      New orders will be processed immediately and customers will receive shipments based on these settings
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  setConfirmationChecks({ productsCorrect: false, episodesCorrect: false, understandImpact: false })
                }}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background-elevated"
              >
                Go Back
              </button>
              <button
                onClick={handleCompleteMigration}
                disabled={!allChecksConfirmed || isCompleting}
                className="flex-1 px-4 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Migration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
