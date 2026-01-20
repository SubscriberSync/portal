'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  Loader2,
  ArrowRight,
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

  // Can complete when all customers are imported and reviewed
  const canComplete = status?.steps.reviewComplete || false

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
      {/* Header */}
      <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/20 p-6">
        <h2 className="text-xl font-bold text-foreground mb-2">
          Customer Migration Center
        </h2>
        <p className="text-foreground-secondary">
          Set up your subscription tracking by mapping products and importing customers.
        </p>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            isStep2Unlocked ? 'bg-success text-white' : 'bg-accent text-white'
          }`}>
            {isStep2Unlocked ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`flex-1 h-1 rounded ${isStep2Unlocked ? 'bg-success' : 'bg-border'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            canComplete ? 'bg-success text-white' : isStep2Unlocked ? 'bg-accent text-white' : 'bg-border text-foreground-tertiary'
          }`}>
            {canComplete ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <div className={`flex-1 h-1 rounded ${canComplete ? 'bg-success' : 'bg-border'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            canComplete ? 'bg-accent text-white' : 'bg-border text-foreground-tertiary'
          }`}>
            <ArrowRight className="w-4 h-4" />
          </div>
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
        onComplete={canComplete ? handleCompleteMigration : undefined}
      />

      {/* Complete Migration Button */}
      {canComplete && (
        <div className="bg-success/10 rounded-2xl border border-success/20 p-6 text-center">
          <Check className="w-12 h-12 text-success mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Migration Setup Complete!
          </h3>
          <p className="text-foreground-secondary mb-4">
            All products are mapped and customers are imported. Click below to finish setup.
          </p>
          <button
            onClick={handleCompleteMigration}
            disabled={isCompleting}
            className="px-6 py-3 bg-success hover:bg-success/90 text-white rounded-xl font-medium flex items-center gap-2 mx-auto"
          >
            {isCompleting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Complete Migration
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
