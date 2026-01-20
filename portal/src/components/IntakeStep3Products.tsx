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
  ArrowRight,
  HelpCircle,
  Undo2,
  Pencil,
  Trash2,
  MoreVertical,
  Sparkles,
  ShoppingBag,
  EyeOffIcon,
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

interface AISuggestion {
  id: string
  category: 'subscription' | 'addon' | 'ignored'
  confidence: number
  reasoning: string
  suggested_tier?: string
}

interface AIAnalysisResult {
  suggestions: AISuggestion[]
  summary: {
    subscription: number
    addon: number
    ignored: number
  }
  tierGroups: Record<string, string[]>
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

  // State for editing tier
  const [editingTier, setEditingTier] = useState<{ storyId: string; tierId: string; name: string } | null>(null)
  const [tierMenuOpen, setTierMenuOpen] = useState<string | null>(null) // tier ID

  // AI Assist state
  const [isAIAvailable, setIsAIAvailable] = useState(false)
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false)
  const [showAIResults, setShowAIResults] = useState(false)
  const [aiResults, setAIResults] = useState<AIAnalysisResult | null>(null)
  const [aiSelectionsToApply, setAISelectionsToApply] = useState<{
    subscription: Set<string>
    addon: Set<string>
    ignored: Set<string>
  }>({ subscription: new Set(), addon: new Set(), ignored: new Set() })

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

  // Check if AI is available
  useEffect(() => {
    const checkAI = async () => {
      try {
        const response = await fetch('/api/migration/ai-categorize')
        const data = await response.json()
        setIsAIAvailable(data.available)
      } catch {
        setIsAIAvailable(false)
      }
    }
    checkAI()
  }, [])

  // AI Analysis function
  const handleAIAnalyze = async () => {
    if (!isAIAvailable) return

    try {
      setIsAIAnalyzing(true)

      // Get story and tier info for context
      const storyName = stories.length > 0 ? stories[0].name : undefined
      const tierNames = stories.length > 0 ? stories[0].tiers.map(t => t.name) : undefined

      const response = await fetch('/api/migration/ai-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyName, tierNames }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'AI analysis failed')
      }

      const results: AIAnalysisResult = await response.json()
      setAIResults(results)

      // Pre-select all suggestions by default
      const subscriptionIds = new Set(results.suggestions.filter(s => s.category === 'subscription').map(s => s.id))
      const addonIds = new Set(results.suggestions.filter(s => s.category === 'addon').map(s => s.id))
      const ignoredIds = new Set(results.suggestions.filter(s => s.category === 'ignored').map(s => s.id))

      setAISelectionsToApply({ subscription: subscriptionIds, addon: addonIds, ignored: ignoredIds })
      setShowAIResults(true)
    } catch (error) {
      console.error('AI analysis error:', error)
      alert(error instanceof Error ? error.message : 'AI analysis failed')
    } finally {
      setIsAIAnalyzing(false)
    }
  }

  // Apply AI suggestions
  const handleApplyAISuggestions = async () => {
    if (!aiResults) return

    try {
      setIsLoading(true)

      // Apply addon categorization
      if (aiSelectionsToApply.addon.size > 0) {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: Array.from(aiSelectionsToApply.addon),
            variationType: 'addon',
          }),
        })
      }

      // Apply ignored categorization
      if (aiSelectionsToApply.ignored.size > 0) {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: Array.from(aiSelectionsToApply.ignored),
            variationType: 'ignored',
          }),
        })
      }

      // Subscription products stay as-is for now (user will assign to tiers manually)
      // But we could auto-assign to default tier if one exists

      setShowAIResults(false)
      setAIResults(null)
      await fetchProducts()
    } catch (error) {
      console.error('Error applying AI suggestions:', error)
      alert('Failed to apply some suggestions')
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle AI selection
  const toggleAISelection = (id: string, category: 'subscription' | 'addon' | 'ignored') => {
    setAISelectionsToApply(prev => {
      const newSet = new Set(prev[category])
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return { ...prev, [category]: newSet }
    })
  }

  // Toggle all in category
  const toggleAllInCategory = (category: 'subscription' | 'addon' | 'ignored', select: boolean) => {
    if (!aiResults) return
    const ids = aiResults.suggestions.filter(s => s.category === category).map(s => s.id)
    setAISelectionsToApply(prev => ({
      ...prev,
      [category]: select ? new Set(ids) : new Set(),
    }))
  }

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

  const handleEditTier = async (storyId: string, tierId: string, newName: string) => {
    if (!newName.trim()) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/stories/${storyId}/tiers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId,
          name: newName.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update tier')
      }

      setEditingTier(null)
      await fetchProducts()
    } catch (error) {
      console.error('Error updating tier:', error)
      alert(error instanceof Error ? error.message : 'Failed to update tier')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTier = async (storyId: string, tierId: string, tierName: string) => {
    // Check if any products are assigned to this tier
    const assignedProducts = variations.filter(v => v.tier_id === tierId)

    if (assignedProducts.length > 0) {
      const confirmed = window.confirm(
        `"${tierName}" has ${assignedProducts.length} product(s) assigned to it. ` +
        `Deleting this tier will unassign those products. Continue?`
      )
      if (!confirmed) return
    } else {
      const confirmed = window.confirm(`Delete the "${tierName}" tier?`)
      if (!confirmed) return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/stories/${storyId}/tiers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete tier')
      }

      setTierMenuOpen(null)
      await fetchProducts()
    } catch (error) {
      console.error('Error deleting tier:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete tier')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStory = async (storyId: string, storyName: string) => {
    // Check if any products are assigned to this story
    const assignedProducts = variations.filter(v => v.story_id === storyId)

    if (assignedProducts.length > 0) {
      const confirmed = window.confirm(
        `"${storyName}" has ${assignedProducts.length} product(s) assigned to it. ` +
        `Deleting this subscription will unassign those products. Continue?`
      )
      if (!confirmed) return
    } else {
      const confirmed = window.confirm(`Delete the "${storyName}" subscription?`)
      if (!confirmed) return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/stories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete subscription')
      }

      await fetchProducts()
    } catch (error) {
      console.error('Error deleting story:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete subscription')
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

  const handleUnassign = async () => {
    if (selectedVariations.size === 0) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/migration/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variationIds: Array.from(selectedVariations),
          storyId: null,
          tierId: null,
          variationType: 'subscription', // Reset to subscription so it shows in unassigned
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unassign variations')
      }

      setSelectedVariations(new Set())
      await fetchProducts()
    } catch (error) {
      console.error('Error unassigning variations:', error)
      alert(error instanceof Error ? error.message : 'Failed to unassign variations')
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
  const addonVariations = filteredVariations.filter(v => v.variation_type === 'addon')
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
              {/* AI Assist Banner - Show prominently when AI is available and there are unassigned products */}
              {isAIAvailable && stats.unassigned > 0 && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-900 font-medium">AI can help categorize your products</p>
                        <p className="text-xs text-purple-700 mt-0.5">
                          Automatically identify subscription items, one-time purchases, and items to ignore
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleAIAnalyze}
                      disabled={isAIAnalyzing}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                      {isAIAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          AI Assist
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* How It Works - Instructional Guide */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium mb-2">How to map your products:</p>
                    <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                      <li><strong>Create a Subscription</strong> - Define your subscription product (e.g., "Monthly Box", "VIP Membership")</li>
                      <li><strong>Select products below</strong> - Click checkboxes next to products that belong to this subscription</li>
                      <li><strong>Click a tier button</strong> - Assign selected products to a tier (e.g., "Basic", "Standard", "Premium")</li>
                      <li><strong>Repeat</strong> until all subscription products are assigned</li>
                    </ol>
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                      <Undo2 className="w-3 h-3" />
                      Made a mistake? Select the product and click "Unassign" to remove it.
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscriptions Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Your Subscriptions
                  </h4>
                  <button
                    onClick={() => setShowCreateStory(true)}
                    className="px-3 py-1.5 text-sm text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Create Subscription
                  </button>
                </div>

                {stories.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-800 font-medium">Step 1: Create a subscription first</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Click "+ Create Subscription" above to define your subscription product.
                          Then you can assign the products below to it.
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowCreateTier(story.id)}
                              className="text-xs text-foreground-tertiary hover:text-foreground flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add Tier
                            </button>
                            <button
                              onClick={() => handleDeleteStory(story.id, story.name)}
                              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                              title="Delete subscription"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Tiers */}
                        <div className="flex flex-wrap gap-2">
                          {story.tiers.map(tier => (
                            <div key={tier.id} className="relative group">
                              {/* Editing mode */}
                              {editingTier?.tierId === tier.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingTier.name}
                                    onChange={e => setEditingTier({ ...editingTier, name: e.target.value })}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleEditTier(story.id, tier.id, editingTier.name)
                                      if (e.key === 'Escape') setEditingTier(null)
                                    }}
                                    className="px-2 py-1 text-sm bg-background border border-accent rounded focus:outline-none w-24"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleEditTier(story.id, tier.id, editingTier.name)}
                                    className="p-1 text-success hover:bg-success/10 rounded"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingTier(null)}
                                    className="p-1 text-foreground-tertiary hover:bg-background-elevated rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {/* Normal tier button */}
                                  <button
                                    onClick={() => selectedVariations.size > 0 && handleAssignVariations(story.id, tier.id)}
                                    disabled={selectedVariations.size === 0}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                      selectedVariations.size > 0
                                        ? 'bg-accent text-white hover:bg-accent-hover cursor-pointer shadow-sm animate-pulse-subtle'
                                        : 'bg-background text-foreground-secondary cursor-default'
                                    }`}
                                  >
                                    {selectedVariations.size > 0 && (
                                      <Plus className="w-3 h-3 inline mr-1" />
                                    )}
                                    {tier.name}
                                    {tier.is_default && selectedVariations.size === 0 && (
                                      <span className="ml-1 text-xs opacity-60">(default)</span>
                                    )}
                                  </button>

                                  {/* Edit/Delete menu - only show when not in selection mode */}
                                  {selectedVariations.size === 0 && (
                                    <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setTierMenuOpen(tierMenuOpen === tier.id ? null : tier.id)
                                        }}
                                        className="p-0.5 bg-background border border-border rounded-full shadow-sm hover:bg-background-elevated"
                                      >
                                        <MoreVertical className="w-3 h-3 text-foreground-tertiary" />
                                      </button>

                                      {/* Dropdown menu */}
                                      {tierMenuOpen === tier.id && (
                                        <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 py-1 min-w-[100px]">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setEditingTier({ storyId: story.id, tierId: tier.id, name: tier.name })
                                              setTierMenuOpen(null)
                                            }}
                                            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-elevated flex items-center gap-2"
                                          >
                                            <Pencil className="w-3 h-3" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteTier(story.id, tier.id, tier.name)
                                            }}
                                            className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        {selectedVariations.size > 0 && (
                          <p className="text-xs text-accent mt-2 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" />
                            Click a tier to assign {selectedVariations.size} selected product{selectedVariations.size > 1 ? 's' : ''}
                          </p>
                        )}

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
                  <div className="mb-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-accent">
                        {selectedVariations.size} product{selectedVariations.size > 1 ? 's' : ''} selected
                      </span>
                      <ArrowRight className="w-4 h-4 text-accent" />
                      <span className="text-sm text-accent">
                        Click a tier above to assign
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={clearSelection}
                        className="px-2 py-1 text-xs text-foreground-tertiary hover:text-foreground"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-foreground-tertiary">Or:</span>
                      <button
                        onClick={() => handleUnassign()}
                        className="px-2 py-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                      >
                        Unassign
                      </button>
                      <button
                        onClick={() => handleMarkAs('ignored')}
                        className="px-2 py-1 text-foreground-tertiary hover:text-foreground hover:bg-background-elevated rounded"
                        title="Hide products that aren't relevant (like test orders or discontinued items)"
                      >
                        Mark as Ignored
                      </button>
                      <button
                        onClick={() => handleMarkAs('addon')}
                        className="px-2 py-1 text-foreground-tertiary hover:text-foreground hover:bg-background-elevated rounded"
                        title="One-time purchases that aren't part of a recurring subscription (like merchandise or single purchases)"
                      >
                        Mark as One-time Purchase
                      </button>
                    </div>
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

                {/* One-time Purchases */}
                {addonVariations.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-blue-600 flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        One-time Purchases ({addonVariations.length})
                      </h5>
                    </div>
                    <p className="text-xs text-foreground-tertiary mb-2">
                      These products are not part of a recurring subscription. They won't affect shipment tracking.
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {addonVariations.map(v => (
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

      {/* Create Subscription Modal */}
      {showCreateStory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                Create Subscription
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
                  Subscription Name
                </label>
                <input
                  type="text"
                  value={newStoryName}
                  onChange={e => setNewStoryName(e.target.value)}
                  placeholder="e.g., Monthly Box, VIP Membership"
                  className="w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Subscription Type
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
                    <p className="font-medium text-sm">Fixed Length</p>
                    <p className="text-xs text-foreground-tertiary">Ends after N shipments</p>
                  </button>
                  <button
                    onClick={() => setNewStoryType('recurring')}
                    className={`p-3 rounded-lg border text-left ${
                      newStoryType === 'recurring'
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <p className="font-medium text-sm">Ongoing</p>
                    <p className="text-xs text-foreground-tertiary">Continues until cancelled</p>
                  </button>
                </div>
              </div>

              {newStoryType === 'sequential' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Total Shipments
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
                      Shipment Label
                    </label>
                    <input
                      type="text"
                      value={newStoryInstallment}
                      onChange={e => setNewStoryInstallment(e.target.value)}
                      placeholder="Box, Issue, Month"
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
                  Add tiers if you offer different pricing levels (e.g., Basic, Standard, Premium)
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
                  Create Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Results Modal */}
      {showAIResults && aiResults && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border border-border w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">AI Analysis Complete</h3>
                    <p className="text-sm text-foreground-secondary">
                      Review suggestions below, then apply
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIResults(false)}
                  className="text-foreground-tertiary hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="p-5 border-b border-border flex-shrink-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{aiResults.summary.subscription}</div>
                  <div className="text-xs text-green-600 font-medium">Subscription</div>
                  <div className="text-xs text-green-500 mt-0.5">Assign to tiers</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">{aiResults.summary.addon}</div>
                  <div className="text-xs text-blue-600 font-medium">One-time</div>
                  <div className="text-xs text-blue-500 mt-0.5">Won't track</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-600">{aiResults.summary.ignored}</div>
                  <div className="text-xs text-gray-500 font-medium">Ignore</div>
                  <div className="text-xs text-gray-400 mt-0.5">Test/internal</div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Subscription Products */}
              {aiResults.summary.subscription > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-green-700 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Subscription Products ({aiResults.summary.subscription})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllInCategory('subscription', aiSelectionsToApply.subscription.size === 0)}
                        className="text-xs text-foreground-tertiary hover:text-foreground"
                      >
                        {aiSelectionsToApply.subscription.size === aiResults.summary.subscription ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground-tertiary mb-2">
                    These will remain in "Needs Assignment" for you to assign to subscription tiers
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {aiResults.suggestions.filter(s => s.category === 'subscription').map(s => {
                      const product = variations.find(v => v.id === s.id)
                      if (!product) return null
                      return (
                        <AIResultRow
                          key={s.id}
                          product={product}
                          suggestion={s}
                          isSelected={aiSelectionsToApply.subscription.has(s.id)}
                          onToggle={() => toggleAISelection(s.id, 'subscription')}
                          categoryColor="green"
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* One-time Purchases */}
              {aiResults.summary.addon > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-blue-700 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      One-time Purchases ({aiResults.summary.addon})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllInCategory('addon', aiSelectionsToApply.addon.size === 0)}
                        className="text-xs text-foreground-tertiary hover:text-foreground"
                      >
                        {aiSelectionsToApply.addon.size === aiResults.summary.addon ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground-tertiary mb-2">
                    Merchandise, add-ons, or single purchases - won't affect shipment tracking
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {aiResults.suggestions.filter(s => s.category === 'addon').map(s => {
                      const product = variations.find(v => v.id === s.id)
                      if (!product) return null
                      return (
                        <AIResultRow
                          key={s.id}
                          product={product}
                          suggestion={s}
                          isSelected={aiSelectionsToApply.addon.has(s.id)}
                          onToggle={() => toggleAISelection(s.id, 'addon')}
                          categoryColor="blue"
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Ignored Products */}
              {aiResults.summary.ignored > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <EyeOffIcon className="w-4 h-4" />
                      Ignore ({aiResults.summary.ignored})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllInCategory('ignored', aiSelectionsToApply.ignored.size === 0)}
                        className="text-xs text-foreground-tertiary hover:text-foreground"
                      >
                        {aiSelectionsToApply.ignored.size === aiResults.summary.ignored ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground-tertiary mb-2">
                    Test orders, internal items, or discontinued products
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {aiResults.suggestions.filter(s => s.category === 'ignored').map(s => {
                      const product = variations.find(v => v.id === s.id)
                      if (!product) return null
                      return (
                        <AIResultRow
                          key={s.id}
                          product={product}
                          suggestion={s}
                          isSelected={aiSelectionsToApply.ignored.has(s.id)}
                          onToggle={() => toggleAISelection(s.id, 'ignored')}
                          categoryColor="gray"
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-foreground-secondary">
                  <span className="font-medium">
                    {aiSelectionsToApply.addon.size + aiSelectionsToApply.ignored.size}
                  </span>{' '}
                  products will be categorized
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAIResults(false)}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background-elevated"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyAISuggestions}
                    disabled={isLoading || (aiSelectionsToApply.addon.size === 0 && aiSelectionsToApply.ignored.size === 0)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Apply Suggestions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// AI Result row component
function AIResultRow({
  product,
  suggestion,
  isSelected,
  onToggle,
  categoryColor,
}: {
  product: ProductVariation
  suggestion: AISuggestion
  isSelected: boolean
  onToggle: () => void
  categoryColor: 'green' | 'blue' | 'gray'
}) {
  const colorClasses = {
    green: 'border-green-300 bg-green-50',
    blue: 'border-blue-300 bg-blue-50',
    gray: 'border-gray-300 bg-gray-50',
  }

  return (
    <div
      onClick={onToggle}
      className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
        isSelected ? colorClasses[categoryColor] : 'border-border bg-background hover:bg-background-elevated'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
            isSelected ? `border-${categoryColor}-500 bg-${categoryColor}-500` : 'border-foreground-tertiary'
          }`}
        >
          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {product.product_name}
            {product.variant_title && (
              <span className="text-foreground-secondary font-normal"> - {product.variant_title}</span>
            )}
          </p>
          <p className="text-xs text-foreground-tertiary truncate">
            {suggestion.reasoning}
            {suggestion.confidence < 0.7 && (
              <span className="ml-1 text-amber-600">(low confidence)</span>
            )}
          </p>
        </div>
        <div className="text-xs text-foreground-tertiary">
          {product.order_count} orders
        </div>
      </div>
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
