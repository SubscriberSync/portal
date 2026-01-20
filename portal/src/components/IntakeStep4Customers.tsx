'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Users,
  Loader2,
  Search,
  AlertCircle,
  RefreshCw,
  User,
  Calendar,
  ChevronRight,
  X,
  Edit2,
  History,
} from 'lucide-react'

interface Story {
  id: string
  name: string
  slug: string
  total_episodes: number | null
  installment_name: string
}

interface Tier {
  id: string
  name: string
}

interface EpisodeEvent {
  episode: number
  date: string
  order_id: string
  order_number: number
  tier_name: string | null
  product_name: string
}

interface Customer {
  id: string
  customer_email: string
  customer_name: string | null
  shopify_customer_ids: string[]
  story_id: string
  current_episode: number
  current_tier_id: string | null
  status: 'active' | 'paused' | 'completed' | 'churned'
  episode_history: EpisodeEvent[]
  needs_review: boolean
  review_reasons: string[]
  manually_adjusted: boolean
  adjusted_by: string | null
  adjustment_note: string | null
  story: Story | null
  tier: Tier | null
  created_at: string
  updated_at: string
}

interface IntakeStep4Props {
  clientSlug: string
  isUnlocked: boolean
  onRefresh: () => void
  onComplete?: () => void
}

export default function IntakeStep4Customers({
  clientSlug,
  isUnlocked,
  onRefresh,
  onComplete,
}: IntakeStep4Props) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterNeedsReview, setFilterNeedsReview] = useState(false)

  // Data
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState({
    total: 0,
    needsReview: 0,
    active: 0,
    completed: 0,
    churned: 0,
    paused: 0,
  })

  // Selected customer for detail view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editEpisode, setEditEpisode] = useState(0)
  const [editNote, setEditNote] = useState('')

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterNeedsReview) params.set('needsReview', 'true')

      const response = await fetch(`/api/migration/customers?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch customers')

      const data = await response.json()
      setCustomers(data.customers || [])
      setStats(data.stats || { total: 0, needsReview: 0, active: 0, completed: 0, churned: 0, paused: 0 })
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, filterNeedsReview])

  useEffect(() => {
    if (isUnlocked) {
      fetchCustomers()
    }
  }, [isUnlocked, fetchCustomers])

  const handleImportCustomers = async () => {
    try {
      setIsImporting(true)
      const response = await fetch(`/api/migration/import-customers`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import customers')
      }

      const result = await response.json()
      alert(`Imported ${result.imported} customers, updated ${result.updated}, ${result.flagged} need review`)
      await fetchCustomers()
    } catch (error) {
      console.error('Error importing customers:', error)
      alert(error instanceof Error ? error.message : 'Failed to import customers')
    } finally {
      setIsImporting(false)
    }
  }

  const handleUpdateCustomer = async (customerId: string, updates: {
    currentEpisode?: number
    status?: string
    clearReview?: boolean
    note?: string
  }) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/customers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          ...updates,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update customer')
      }

      setEditMode(false)
      setSelectedCustomer(null)
      await fetchCustomers()
    } catch (error) {
      console.error('Error updating customer:', error)
      alert(error instanceof Error ? error.message : 'Failed to update customer')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success bg-success/10'
      case 'completed':
        return 'text-blue-600 bg-blue-100'
      case 'churned':
        return 'text-red-600 bg-red-100'
      case 'paused':
        return 'text-amber-600 bg-amber-100'
      default:
        return 'text-foreground-secondary bg-background-elevated'
    }
  }

  const getReviewReasonLabel = (reason: string) => {
    switch (reason) {
      case 'tier_change':
        return 'Changed tiers mid-subscription'
      case 'gap_detected':
        return 'Missing episode in sequence'
      case 'multiple_subs':
        return 'Multiple active subscriptions'
      default:
        return reason
    }
  }

  const isComplete = stats.needsReview === 0 && stats.total > 0

  // Locked state
  if (!isUnlocked) {
    return (
      <div className="bg-background-elevated/50 rounded-2xl border border-border overflow-hidden opacity-60">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-foreground-tertiary/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-foreground-tertiary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground-tertiary">Step 2: Import Customers</h3>
                <p className="text-sm text-foreground-tertiary">Complete Step 1 to unlock</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-foreground-tertiary/20 text-xs text-foreground-tertiary">
              Locked
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${isComplete ? 'bg-success/5 border-success/20' : 'bg-background-secondary border-border'}`}>
      {/* Header */}
      <div
        className="p-5 border-b border-border cursor-pointer hover:bg-background-elevated transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-success/20' : 'bg-purple-100'}`}>
              {isComplete ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Users className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Step 2: Import Customers</h3>
              <p className="text-sm text-foreground-secondary">
                {isComplete
                  ? `${stats.total} customers imported`
                  : stats.total > 0
                    ? `${stats.needsReview} of ${stats.total} customers need review`
                    : 'Import customers from your order history'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.needsReview > 0 && (
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                {stats.needsReview} need review
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-foreground-tertiary" />
            ) : (
              <ChevronDown className="w-5 h-5 text-foreground-tertiary" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* No customers imported yet */}
          {stats.total === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
              <h4 className="font-medium text-foreground mb-2">No customers imported yet</h4>
              <p className="text-sm text-foreground-secondary mb-4">
                Import customers from your Shopify order history based on your product mappings
              </p>
              <button
                onClick={handleImportCustomers}
                disabled={isImporting}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Import Customers
                  </>
                )}
              </button>
            </div>
          )}

          {/* Customers list */}
          {stats.total > 0 && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-background-elevated rounded-lg text-center">
                  <p className="text-lg font-semibold text-foreground">{stats.total}</p>
                  <p className="text-xs text-foreground-tertiary">Total</p>
                </div>
                <div className="p-3 bg-success/10 rounded-lg text-center">
                  <p className="text-lg font-semibold text-success">{stats.active}</p>
                  <p className="text-xs text-success">Active</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg text-center">
                  <p className="text-lg font-semibold text-blue-600">{stats.completed}</p>
                  <p className="text-xs text-blue-600">Completed</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-lg text-center">
                  <p className="text-lg font-semibold text-amber-600">{stats.needsReview}</p>
                  <p className="text-xs text-amber-600">Needs Review</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg text-center">
                  <p className="text-lg font-semibold text-red-600">{stats.churned}</p>
                  <p className="text-xs text-red-600">Churned</p>
                </div>
              </div>

              {/* Search and filters */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by email or name..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={() => setFilterNeedsReview(!filterNeedsReview)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterNeedsReview
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-background border border-border text-foreground-secondary hover:border-border-strong'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Needs Review
                </button>
                <button
                  onClick={handleImportCustomers}
                  disabled={isImporting}
                  className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground-secondary hover:border-border-strong flex items-center gap-1"
                >
                  <RefreshCw className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
                  Re-import
                </button>
              </div>

              {/* Customer list */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground-tertiary" />
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8 text-foreground-tertiary">
                    No customers found
                  </div>
                ) : (
                  customers.map(customer => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        customer.needs_review
                          ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                          : 'border-border bg-background hover:bg-background-elevated'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-background-elevated flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-foreground-tertiary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">
                              {customer.customer_name || customer.customer_email}
                            </p>
                            {customer.needs_review && (
                              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )}
                            {customer.manually_adjusted && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                                Adjusted
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground-secondary truncate">
                            {customer.customer_email}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-medium text-foreground">
                            {customer.story?.installment_name || 'Episode'} {customer.current_episode}
                            {customer.story?.total_episodes && (
                              <span className="text-foreground-tertiary">
                                /{customer.story.total_episodes}
                              </span>
                            )}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(customer.status)}`}>
                            {customer.status}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-foreground-tertiary flex-shrink-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Complete Button */}
              {isComplete && onComplete && (
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={onComplete}
                    className="w-full px-4 py-2.5 bg-success hover:bg-success/90 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Complete Migration Setup
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
          <div className="bg-background w-full max-w-md h-full overflow-y-auto border-l border-border">
            {/* Header */}
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Customer Details</h3>
              <button
                onClick={() => {
                  setSelectedCustomer(null)
                  setEditMode(false)
                }}
                className="text-foreground-tertiary hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Customer Info */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-background-elevated flex items-center justify-center">
                    <User className="w-6 h-6 text-foreground-tertiary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedCustomer.customer_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-foreground-secondary">
                      {selectedCustomer.customer_email}
                    </p>
                  </div>
                </div>

                {/* Flags */}
                {selectedCustomer.needs_review && selectedCustomer.review_reasons.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <p className="text-sm font-medium text-amber-800 mb-1">Needs Review</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      {selectedCustomer.review_reasons.map((reason, i) => (
                        <li key={i}>• {getReviewReasonLabel(reason)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Current Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background-elevated rounded-lg">
                    <p className="text-xs text-foreground-tertiary mb-1">Current Episode</p>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedCustomer.current_episode}
                      {selectedCustomer.story?.total_episodes && (
                        <span className="text-foreground-tertiary text-sm">
                          /{selectedCustomer.story.total_episodes}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-background-elevated rounded-lg">
                    <p className="text-xs text-foreground-tertiary mb-1">Status</p>
                    <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(selectedCustomer.status)}`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                  <div className="p-3 bg-background-elevated rounded-lg">
                    <p className="text-xs text-foreground-tertiary mb-1">Current Tier</p>
                    <p className="font-medium text-foreground">
                      {selectedCustomer.tier?.name || 'None'}
                    </p>
                  </div>
                  <div className="p-3 bg-background-elevated rounded-lg">
                    <p className="text-xs text-foreground-tertiary mb-1">Story</p>
                    <p className="font-medium text-foreground">
                      {selectedCustomer.story?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Episode History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Episode History
                  </h4>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCustomer.episode_history.length === 0 ? (
                    <p className="text-sm text-foreground-tertiary">No history recorded</p>
                  ) : (
                    selectedCustomer.episode_history.map((event, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 bg-background-elevated rounded-lg text-sm"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-accent">{event.episode}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {event.product_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
                            <Calendar className="w-3 h-3" />
                            {formatDate(event.date)}
                            {event.tier_name && (
                              <>
                                <span>•</span>
                                <span>{event.tier_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Manual Adjustment Note */}
              {selectedCustomer.manually_adjusted && selectedCustomer.adjustment_note && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Adjustment Note</p>
                  <p className="text-sm text-blue-800">{selectedCustomer.adjustment_note}</p>
                </div>
              )}

              {/* Edit Mode */}
              {editMode ? (
                <div className="p-4 bg-background-elevated rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Set Episode Number
                    </label>
                    <input
                      type="number"
                      value={editEpisode}
                      onChange={e => setEditEpisode(parseInt(e.target.value) || 0)}
                      min={0}
                      max={selectedCustomer.story?.total_episodes || 100}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Note (optional)
                    </label>
                    <textarea
                      value={editNote}
                      onChange={e => setEditNote(e.target.value)}
                      placeholder="Why are you adjusting this?"
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-background"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateCustomer(selectedCustomer.id, {
                        currentEpisode: editEpisode,
                        note: editNote || undefined,
                        clearReview: true,
                      })}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditEpisode(selectedCustomer.current_episode)
                      setEditNote('')
                      setEditMode(true)
                    }}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-background-elevated flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Adjust Episode
                  </button>
                  {selectedCustomer.needs_review && (
                    <button
                      onClick={() => handleUpdateCustomer(selectedCustomer.id, { clearReview: true })}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 bg-success text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Mark Reviewed
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
