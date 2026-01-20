'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Package,
  Loader2,
  Plus,
  Search,
  Tag,
  X,
  FolderPlus,
  Layers,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react'

interface Story {
  id: string
  name: string
  slug: string
  story_type: 'sequential' | 'recurring'
  total_episodes: number | null
  installment_name: string
  tiers: Tier[]
}

interface Tier {
  id: string
  story_id: string
  name: string
  description: string | null
  is_default: boolean
  sort_order: number
}

interface ProductVariation {
  id: string
  product_name: string
  variant_title: string | null
  sku: string | null
  order_count: number
  first_seen: string
  last_seen: string
  variation_type: 'subscription' | 'addon' | 'ignored'
  story_id: string | null
  tier_id: string | null
  story: { id: string; name: string; slug: string } | null
  tier: { id: string; name: string } | null
  sample_order_numbers: number[] | null
}

interface IntakeStep3Props {
  clientSlug: string
  isUnlocked: boolean
  onRefresh: () => void
  onComplete?: () => void
}

export default function IntakeStep3Products({
  clientSlug,
  isUnlocked,
  onRefresh,
  onComplete,
}: IntakeStep3Props) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showIgnored, setShowIgnored] = useState(false)

  // Data
  const [variations, setVariations] = useState<ProductVariation[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [stats, setStats] = useState({
    total: 0,
    unassigned: 0,
    assigned: 0,
    ignored: 0,
    addons: 0,
  })

  // Selection
  const [selectedVariations, setSelectedVariations] = useState<Set<string>>(new Set())

  // Modals
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [showCreateTier, setShowCreateTier] = useState<string | null>(null) // story ID

  // Form state for creating story
  const [newStoryName, setNewStoryName] = useState('')
  const [newStoryType, setNewStoryType] = useState<'sequential' | 'recurring'>('sequential')
  const [newStoryEpisodes, setNewStoryEpisodes] = useState(12)
  const [newStoryInstallment, setNewStoryInstallment] = useState('Episode')
  const [newStoryTiers, setNewStoryTiers] = useState<string[]>(['Standard'])

  // Form state for creating tier
  const [newTierName, setNewTierName] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/products`)
      if (!response.ok) throw new Error('Failed to fetch products')

      const data = await response.json()
      setVariations(data.variations || [])
      setStories(data.stories || [])
      setStats(data.stats || { total: 0, unassigned: 0, assigned: 0, ignored: 0, addons: 0 })
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isUnlocked) {
      fetchProducts()
    }
  }, [isUnlocked, fetchProducts])

  const handleScanProducts = async () => {
    try {
      setIsScanning(true)
      const response = await fetch(`/api/migration/scan-products`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to scan products')
      }

      await fetchProducts()
    } catch (error) {
      console.error('Error scanning products:', error)
      alert(error instanceof Error ? error.message : 'Failed to scan products')
    } finally {
      setIsScanning(false)
    }
  }

  const handleCreateStory = async () => {
    if (!newStoryName.trim()) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStoryName.trim(),
          storyType: newStoryType,
          totalEpisodes: newStoryType === 'sequential' ? newStoryEpisodes : null,
          installmentName: newStoryInstallment,
          tiers: newStoryTiers.filter(t => t.trim()).map(t => ({ name: t.trim() })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create story')
      }

      setShowCreateStory(false)
      setNewStoryName('')
      setNewStoryTiers(['Standard'])
      await fetchProducts()
    } catch (error) {
      console.error('Error creating story:', error)
      alert(error instanceof Error ? error.message : 'Failed to create story')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTier = async (storyId: string) => {
    if (!newTierName.trim()) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/stories/${storyId}/tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTierName.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create tier')
      }

      setShowCreateTier(null)
      setNewTierName('')
      await fetchProducts()
    } catch (error) {
      console.error('Error creating tier:', error)
      alert(error instanceof Error ? error.message : 'Failed to create tier')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignVariations = async (storyId: string, tierId?: string) => {
    if (selectedVariations.size === 0) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variationIds: Array.from(selectedVariations),
          storyId,
          tierId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign variations')
      }

      setSelectedVariations(new Set())
      await fetchProducts()
    } catch (error) {
      console.error('Error assigning variations:', error)
      alert(error instanceof Error ? error.message : 'Failed to assign variations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAs = async (type: 'subscription' | 'addon' | 'ignored') => {
    if (selectedVariations.size === 0) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variationIds: Array.from(selectedVariations),
          variationType: type,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update variations')
      }

      setSelectedVariations(new Set())
      await fetchProducts()
    } catch (error) {
      console.error('Error updating variations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedVariations)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedVariations(newSelection)
  }

  const selectAll = (filtered: ProductVariation[]) => {
    const newSelection = new Set(filtered.map(v => v.id))
    setSelectedVariations(newSelection)
  }

  const clearSelection = () => {
    setSelectedVariations(new Set())
  }

  // Filter variations
  const filteredVariations = variations.filter(v => {
    // Filter by search
    const matchesSearch =
      !searchQuery ||
      v.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.variant_title?.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter ignored
    const matchesIgnored = showIgnored || v.variation_type !== 'ignored'

    return matchesSearch && matchesIgnored
  })

  // Group by assignment status
  const unassignedVariations = filteredVariations.filter(
    v => !v.story_id && v.variation_type === 'subscription'
  )
  const assignedVariations = filteredVariations.filter(v => v.story_id)
  const ignoredVariations = filteredVariations.filter(v => v.variation_type === 'ignored')

  const isComplete = stats.unassigned === 0 && stats.assigned > 0

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
                <h3 className="font-semibold text-foreground-tertiary">Step 1: Map Your Products</h3>
                <p className="text-sm text-foreground-tertiary">Complete previous steps to unlock</p>
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-success/20' : 'bg-blue-100'}`}>
              {isComplete ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <Package className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Step 1: Map Your Products</h3>
              <p className="text-sm text-foreground-secondary">
                {isComplete
                  ? `${stats.assigned} products mapped`
                  : stats.total > 0
                    ? `${stats.unassigned} of ${stats.total} products need mapping`
                    : 'Scan your Shopify orders to find products'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.unassigned > 0 && (
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                {stats.unassigned} unassigned
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
          {/* No products scanned yet */}
          {stats.total === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
              <h4 className="font-medium text-foreground mb-2">No products found yet</h4>
              <p className="text-sm text-foreground-secondary mb-4">
                Scan your Shopify order history to find all product variations
              </p>
              <button
                onClick={handleScanProducts}
                disabled={isScanning}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Scan Shopify Orders
                  </>
                )}
              </button>
            </div>
          )}

          {/* Products found */}
          {stats.total > 0 && (
            <>
              {/* Stories Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Your Stories
                  </h4>
                  <button
                    onClick={() => setShowCreateStory(true)}
                    className="px-3 py-1.5 text-sm text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Create Story
                  </button>
                </div>

                {stories.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-800 font-medium">Create a story first</p>
                        <p className="text-xs text-amber-700 mt-1">
                          A story represents your subscription product (e.g., "Echoes of the Crucible").
                          Create one to start assigning products.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stories.map(story => (
                      <div
                        key={story.id}
                        className="p-4 bg-background-elevated rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-foreground">{story.name}</h5>
                            <p className="text-xs text-foreground-tertiary">
                              {story.story_type === 'sequential'
                                ? `${story.total_episodes} ${story.installment_name.toLowerCase()}s`
                                : 'Recurring'}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowCreateTier(story.id)}
                            className="text-xs text-foreground-tertiary hover:text-foreground flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Tier
                          </button>
                        </div>

                        {/* Tiers */}
                        <div className="flex flex-wrap gap-2">
                          {story.tiers.map(tier => (
                            <button
                              key={tier.id}
                              onClick={() => selectedVariations.size > 0 && handleAssignVariations(story.id, tier.id)}
                              disabled={selectedVariations.size === 0}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                selectedVariations.size > 0
                                  ? 'bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer'
                                  : 'bg-background text-foreground-secondary cursor-default'
                              }`}
                            >
                              {tier.name}
                              {tier.is_default && (
                                <span className="ml-1 text-xs opacity-60">(default)</span>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Show create tier form */}
                        {showCreateTier === story.id && (
                          <div className="mt-3 pt-3 border-t border-border flex gap-2">
                            <input
                              type="text"
                              value={newTierName}
                              onChange={e => setNewTierName(e.target.value)}
                              placeholder="Tier name (e.g., Premium)"
                              className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-accent"
                              onKeyDown={e => e.key === 'Enter' && handleCreateTier(story.id)}
                            />
                            <button
                              onClick={() => handleCreateTier(story.id)}
                              disabled={!newTierName.trim() || isLoading}
                              className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm disabled:opacity-50"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setShowCreateTier(null)
                                setNewTierName('')
                              }}
                              className="px-2 py-1.5 text-foreground-tertiary hover:text-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Variations Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Product Variations ({stats.total})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowIgnored(!showIgnored)}
                      className="text-xs text-foreground-tertiary hover:text-foreground flex items-center gap-1"
                    >
                      {showIgnored ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showIgnored ? 'Hide' : 'Show'} ignored ({stats.ignored})
                    </button>
                    <button
                      onClick={handleScanProducts}
                      disabled={isScanning}
                      className="text-xs text-foreground-tertiary hover:text-foreground flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                      Rescan
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Selection Actions */}
                {selectedVariations.size > 0 && (
                  <div className="flex items-center gap-2 mb-3 p-3 bg-accent/10 rounded-lg">
                    <span className="text-sm font-medium text-accent">
                      {selectedVariations.size} selected
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleMarkAs('ignored')}
                      className="px-2 py-1 text-xs text-foreground-tertiary hover:text-foreground"
                    >
                      Mark as Ignored
                    </button>
                    <button
                      onClick={() => handleMarkAs('addon')}
                      className="px-2 py-1 text-xs text-foreground-tertiary hover:text-foreground"
                    >
                      Mark as Addon
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-2 py-1 text-xs text-foreground-tertiary hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Unassigned Products */}
                {unassignedVariations.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Needs Assignment ({unassignedVariations.length})
                      </h5>
                      <button
                        onClick={() => selectAll(unassignedVariations)}
                        className="text-xs text-foreground-tertiary hover:text-foreground"
                      >
                        Select all
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {unassignedVariations.map(v => (
                        <VariationRow
                          key={v.id}
                          variation={v}
                          isSelected={selectedVariations.has(v.id)}
                          onToggle={() => toggleSelection(v.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Products */}
                {assignedVariations.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-success flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Assigned ({assignedVariations.length})
                      </h5>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {assignedVariations.map(v => (
                        <VariationRow
                          key={v.id}
                          variation={v}
                          isSelected={selectedVariations.has(v.id)}
                          onToggle={() => toggleSelection(v.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Ignored Products */}
                {showIgnored && ignoredVariations.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-foreground-tertiary mb-2">
                      Ignored ({ignoredVariations.length})
                    </h5>
                    <div className="space-y-2 max-h-32 overflow-y-auto opacity-60">
                      {ignoredVariations.map(v => (
                        <VariationRow
                          key={v.id}
                          variation={v}
                          isSelected={selectedVariations.has(v.id)}
                          onToggle={() => toggleSelection(v.id)}
                        />
                      ))}
                    </div>
                  </div>
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
                    Continue to Customer Import
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateStory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                Create Story
              </h3>
              <button
                onClick={() => setShowCreateStory(false)}
                className="text-foreground-tertiary hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Story Name
                </label>
                <input
                  type="text"
                  value={newStoryName}
                  onChange={e => setNewStoryName(e.target.value)}
                  placeholder="e.g., Echoes of the Crucible"
                  className="w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Story Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewStoryType('sequential')}
                    className={`p-3 rounded-lg border text-left ${
                      newStoryType === 'sequential'
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <p className="font-medium text-sm">Sequential</p>
                    <p className="text-xs text-foreground-tertiary">Ends after N episodes</p>
                  </button>
                  <button
                    onClick={() => setNewStoryType('recurring')}
                    className={`p-3 rounded-lg border text-left ${
                      newStoryType === 'recurring'
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <p className="font-medium text-sm">Recurring</p>
                    <p className="text-xs text-foreground-tertiary">Continues forever</p>
                  </button>
                </div>
              </div>

              {newStoryType === 'sequential' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Total Episodes
                    </label>
                    <input
                      type="number"
                      value={newStoryEpisodes}
                      onChange={e => setNewStoryEpisodes(parseInt(e.target.value) || 12)}
                      min={1}
                      max={100}
                      className="w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Installment Name
                    </label>
                    <input
                      type="text"
                      value={newStoryInstallment}
                      onChange={e => setNewStoryInstallment(e.target.value)}
                      placeholder="Episode"
                      className="w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Pricing Tiers
                </label>
                <p className="text-xs text-foreground-tertiary mb-2">
                  Add tiers if you have different pricing levels (e.g., Standard, Premium)
                </p>
                <div className="space-y-2">
                  {newStoryTiers.map((tier, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={tier}
                        onChange={e => {
                          const updated = [...newStoryTiers]
                          updated[index] = e.target.value
                          setNewStoryTiers(updated)
                        }}
                        placeholder="Tier name"
                        className="flex-1 px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                      />
                      {newStoryTiers.length > 1 && (
                        <button
                          onClick={() => setNewStoryTiers(newStoryTiers.filter((_, i) => i !== index))}
                          className="px-2 text-foreground-tertiary hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setNewStoryTiers([...newStoryTiers, ''])}
                    className="text-sm text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Tier
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateStory(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background-elevated"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStory}
                  disabled={!newStoryName.trim() || isLoading}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Create Story
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Product variation row component
function VariationRow({
  variation,
  isSelected,
  onToggle,
}: {
  variation: ProductVariation
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-accent bg-accent/5'
          : 'border-border hover:border-border-strong bg-background'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isSelected ? 'border-accent bg-accent' : 'border-foreground-tertiary'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {variation.product_name}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {variation.variant_title && (
              <span className="text-xs text-foreground-secondary">
                {variation.variant_title}
              </span>
            )}
            {variation.sku && (
              <span className="text-xs text-foreground-tertiary font-mono bg-background-elevated px-1.5 py-0.5 rounded">
                {variation.sku}
              </span>
            )}
            <span className="text-xs text-foreground-tertiary">
              {variation.order_count} orders
            </span>
          </div>
          {variation.story && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-success font-medium">
                {variation.story.name}
              </span>
              {variation.tier && (
                <span className="text-xs text-foreground-tertiary">
                  · {variation.tier.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
