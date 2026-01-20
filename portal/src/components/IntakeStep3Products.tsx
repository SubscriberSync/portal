'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Package,
  Loader2,
  Plus,
  Search,
  X,
  FolderPlus,
  Layers,
  AlertCircle,
  RefreshCw,
  Pencil,
  Trash2,
  MoreVertical,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoveRight,
  RotateCcw,
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

type TabType = 'unassigned' | 'assigned' | 'onetime' | 'ignored'

const columnHelper = createColumnHelper<ProductVariation>()

export default function IntakeStep3Products({
  clientSlug,
  isUnlocked,
  onRefresh,
  onComplete,
}: IntakeStep3Props) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('unassigned')

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

  // Table state
  const [sorting, setSorting] = useState<SortingState>([{ id: 'order_count', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // Modals
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [showCreateTier, setShowCreateTier] = useState<string | null>(null)
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null) // product ID

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
  const [tierMenuOpen, setTierMenuOpen] = useState<string | null>(null)

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

  // Filter variations based on active tab
  const filteredVariations = useMemo(() => {
    switch (activeTab) {
      case 'unassigned':
        return variations.filter(v => !v.story_id && v.variation_type === 'subscription')
      case 'assigned':
        return variations.filter(v => v.story_id)
      case 'onetime':
        return variations.filter(v => v.variation_type === 'addon')
      case 'ignored':
        return variations.filter(v => v.variation_type === 'ignored')
      default:
        return variations
    }
  }, [variations, activeTab])

  // Tab counts
  const tabCounts = useMemo(() => ({
    unassigned: variations.filter(v => !v.story_id && v.variation_type === 'subscription').length,
    assigned: variations.filter(v => v.story_id).length,
    onetime: variations.filter(v => v.variation_type === 'addon').length,
    ignored: variations.filter(v => v.variation_type === 'ignored').length,
  }), [variations])

  // Table columns
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="w-4 h-4 rounded border-border"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={e => e.stopPropagation()}
          className="w-4 h-4 rounded border-border"
        />
      ),
      size: 40,
    }),
    columnHelper.accessor('product_name', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          Product
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-50" />
          )}
        </button>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{row.original.product_name}</p>
          {row.original.variant_title && (
            <p className="text-xs text-foreground-secondary truncate">{row.original.variant_title}</p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('sku', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          SKU
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-50" />
          )}
        </button>
      ),
      cell: ({ getValue }) => {
        const sku = getValue()
        return sku ? (
          <span className="font-mono text-xs bg-background-elevated px-1.5 py-0.5 rounded">
            {sku}
          </span>
        ) : (
          <span className="text-foreground-tertiary text-xs">—</span>
        )
      },
      size: 120,
    }),
    columnHelper.accessor('order_count', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          Orders
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-50" />
          )}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-foreground-secondary">{getValue()}</span>
      ),
      size: 80,
    }),
    ...(activeTab === 'assigned' ? [
      columnHelper.accessor(row => row.tier?.name || row.story?.name, {
        id: 'assignment',
        header: 'Assignment',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.story && (
              <span className="text-xs text-success font-medium">
                {row.original.story.name}
              </span>
            )}
            {row.original.tier && (
              <span className="text-xs text-foreground-tertiary">
                · {row.original.tier.name}
              </span>
            )}
          </div>
        ),
      }),
    ] : []),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation()
              setShowMoveMenu(showMoveMenu === row.original.id ? null : row.original.id)
            }}
            className="p-1 hover:bg-background-elevated rounded"
          >
            <MoreVertical className="w-4 h-4 text-foreground-tertiary" />
          </button>
          {showMoveMenu === row.original.id && (
            <MoveMenuDropdown
              product={row.original}
              stories={stories}
              onMove={async (action, storyId?, tierId?) => {
                setShowMoveMenu(null)
                await handleMoveProduct(row.original.id, action, storyId, tierId)
              }}
              onClose={() => setShowMoveMenu(null)}
            />
          )}
        </div>
      ),
      size: 50,
    }),
  ], [activeTab, stories, showMoveMenu])

  const table = useReactTable({
    data: filteredVariations,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Get selected product IDs
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]).map(key => {
      const row = table.getRow(key)
      return row?.original?.id
    }).filter(Boolean) as string[]
  }, [rowSelection, table])

  // Clear selection when changing tabs
  useEffect(() => {
    setRowSelection({})
    setShowMoveMenu(null)
  }, [activeTab])

  // AI Analysis function
  const handleAIAnalyze = async () => {
    if (!isAIAvailable) return

    try {
      setIsAIAnalyzing(true)
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

  const handleMoveProduct = async (
    productId: string,
    action: 'unassign' | 'onetime' | 'ignored' | 'assign',
    storyId?: string,
    tierId?: string
  ) => {
    try {
      setIsLoading(true)

      if (action === 'unassign') {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: [productId],
            storyId: null,
            tierId: null,
            variationType: 'subscription',
          }),
        })
      } else if (action === 'onetime') {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: [productId],
            variationType: 'addon',
          }),
        })
      } else if (action === 'ignored') {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: [productId],
            variationType: 'ignored',
          }),
        })
      } else if (action === 'assign' && storyId && tierId) {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: [productId],
            storyId,
            tierId,
          }),
        })
      }

      await fetchProducts()
    } catch (error) {
      console.error('Error moving product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkAction = async (action: 'unassign' | 'onetime' | 'ignored' | 'assign', storyId?: string, tierId?: string) => {
    if (selectedIds.length === 0) return

    try {
      setIsLoading(true)

      if (action === 'unassign') {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: selectedIds,
            storyId: null,
            tierId: null,
            variationType: 'subscription',
          }),
        })
      } else if (action === 'onetime') {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: selectedIds,
            variationType: 'addon',
          }),
        })
      } else if (action === 'ignored') {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: selectedIds,
            variationType: 'ignored',
          }),
        })
      } else if (action === 'assign' && storyId && tierId) {
        await fetch('/api/migration/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variationIds: selectedIds,
            storyId,
            tierId,
          }),
        })
      }

      setRowSelection({})
      await fetchProducts()
    } catch (error) {
      console.error('Error with bulk action:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
        <div className="p-5 space-y-5">
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
              {/* Subscriptions Section */}
              <div className="p-4 bg-background-elevated rounded-xl border border-border">
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
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-800 font-medium">Create a subscription first</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Then you can assign products to it from the table below.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stories.map(story => (
                      <div
                        key={story.id}
                        className="p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-foreground text-sm">{story.name}</h5>
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
                                    className="px-2 py-1 text-xs bg-background border border-accent rounded focus:outline-none w-20"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleEditTier(story.id, tier.id, editingTier.name)}
                                    className="p-0.5 text-success hover:bg-success/10 rounded"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingTier(null)}
                                    className="p-0.5 text-foreground-tertiary hover:bg-background-elevated rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => selectedIds.length > 0 && handleBulkAction('assign', story.id, tier.id)}
                                    disabled={selectedIds.length === 0}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                                      selectedIds.length > 0
                                        ? 'bg-accent text-white hover:bg-accent-hover cursor-pointer shadow-sm'
                                        : 'bg-background text-foreground-secondary cursor-default border border-border'
                                    }`}
                                  >
                                    {selectedIds.length > 0 && <Plus className="w-3 h-3 inline mr-1" />}
                                    {tier.name}
                                    {tier.is_default && selectedIds.length === 0 && (
                                      <span className="ml-1 opacity-60">(default)</span>
                                    )}
                                  </button>

                                  {selectedIds.length === 0 && (
                                    <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={e => {
                                          e.stopPropagation()
                                          setTierMenuOpen(tierMenuOpen === tier.id ? null : tier.id)
                                        }}
                                        className="p-0.5 bg-background border border-border rounded-full shadow-sm hover:bg-background-elevated"
                                      >
                                        <MoreVertical className="w-2.5 h-2.5 text-foreground-tertiary" />
                                      </button>

                                      {tierMenuOpen === tier.id && (
                                        <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 py-1 min-w-[80px]">
                                          <button
                                            onClick={e => {
                                              e.stopPropagation()
                                              setEditingTier({ storyId: story.id, tierId: tier.id, name: tier.name })
                                              setTierMenuOpen(null)
                                            }}
                                            className="w-full px-2.5 py-1 text-left text-xs text-foreground hover:bg-background-elevated flex items-center gap-1.5"
                                          >
                                            <Pencil className="w-3 h-3" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={e => {
                                              e.stopPropagation()
                                              handleDeleteTier(story.id, tier.id, tier.name)
                                            }}
                                            className="w-full px-2.5 py-1 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
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

              {/* AI Assist + Actions Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {isAIAvailable && tabCounts.unassigned > 0 && (
                    <button
                      onClick={handleAIAnalyze}
                      disabled={isAIAnalyzing}
                      className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {isAIAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          AI Categorize
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleScanProducts}
                    disabled={isScanning}
                    className="px-3 py-1.5 text-foreground-tertiary hover:text-foreground text-sm flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    Rescan
                  </button>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
                    <span className="text-sm font-medium text-accent">{selectedIds.length} selected</span>
                    <span className="text-foreground-tertiary">|</span>
                    <button
                      onClick={() => handleBulkAction('unassign')}
                      className="text-xs text-foreground-secondary hover:text-foreground px-2 py-0.5 rounded hover:bg-background"
                    >
                      Move to Unassigned
                    </button>
                    <button
                      onClick={() => handleBulkAction('onetime')}
                      className="text-xs text-foreground-secondary hover:text-foreground px-2 py-0.5 rounded hover:bg-background"
                    >
                      Mark One-time
                    </button>
                    <button
                      onClick={() => handleBulkAction('ignored')}
                      className="text-xs text-foreground-secondary hover:text-foreground px-2 py-0.5 rounded hover:bg-background"
                    >
                      Mark Ignored
                    </button>
                    <button
                      onClick={() => setRowSelection({})}
                      className="text-xs text-foreground-tertiary hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="border-b border-border">
                <div className="flex gap-1">
                  {[
                    { id: 'unassigned' as const, label: 'Unassigned', count: tabCounts.unassigned, color: 'amber' },
                    { id: 'assigned' as const, label: 'Assigned', count: tabCounts.assigned, color: 'green' },
                    { id: 'onetime' as const, label: 'One-time', count: tabCounts.onetime, color: 'blue' },
                    { id: 'ignored' as const, label: 'Ignored', count: tabCounts.ignored, color: 'gray' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? `border-${tab.color}-500 text-${tab.color}-700`
                          : 'border-transparent text-foreground-secondary hover:text-foreground hover:border-border'
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                        activeTab === tab.id
                          ? `bg-${tab.color}-100 text-${tab.color}-700`
                          : 'bg-background-elevated text-foreground-tertiary'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary" />
                <input
                  type="text"
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  placeholder="Search products by name, SKU, or variant..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              {/* Data Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-background-elevated border-b border-border">
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-4 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider"
                              style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {table.getRowModel().rows.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length} className="px-4 py-8 text-center text-foreground-tertiary">
                            {activeTab === 'unassigned' && 'No unassigned products. All products have been categorized!'}
                            {activeTab === 'assigned' && 'No products assigned to subscriptions yet.'}
                            {activeTab === 'onetime' && 'No one-time purchases.'}
                            {activeTab === 'ignored' && 'No ignored products.'}
                          </td>
                        </tr>
                      ) : (
                        table.getRowModel().rows.map(row => (
                          <tr
                            key={row.id}
                            className={`hover:bg-background-elevated transition-colors ${
                              row.getIsSelected() ? 'bg-accent/5' : ''
                            }`}
                          >
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className="px-4 py-3">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-4 py-2 bg-background-elevated border-t border-border text-xs text-foreground-tertiary">
                  Showing {table.getRowModel().rows.length} of {filteredVariations.length} products
                  {selectedIds.length > 0 && (
                    <span className="ml-2">· {selectedIds.length} selected</span>
                  )}
                </div>
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
        <CreateStoryModal
          isOpen={showCreateStory}
          onClose={() => setShowCreateStory(false)}
          onSubmit={handleCreateStory}
          isLoading={isLoading}
          formState={{
            name: newStoryName,
            setName: setNewStoryName,
            type: newStoryType,
            setType: setNewStoryType,
            episodes: newStoryEpisodes,
            setEpisodes: setNewStoryEpisodes,
            installment: newStoryInstallment,
            setInstallment: setNewStoryInstallment,
            tiers: newStoryTiers,
            setTiers: setNewStoryTiers,
          }}
        />
      )}

      {/* AI Results Modal */}
      {showAIResults && aiResults && (
        <AIResultsModal
          aiResults={aiResults}
          variations={variations}
          aiSelectionsToApply={aiSelectionsToApply}
          isLoading={isLoading}
          onToggle={toggleAISelection}
          onToggleAll={toggleAllInCategory}
          onApply={handleApplyAISuggestions}
          onClose={() => setShowAIResults(false)}
        />
      )}
    </div>
  )
}

// Move Menu Dropdown Component
function MoveMenuDropdown({
  product,
  stories,
  onMove,
  onClose,
}: {
  product: ProductVariation
  stories: Story[]
  onMove: (action: 'unassign' | 'onetime' | 'ignored' | 'assign', storyId?: string, tierId?: string) => void
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
        <div className="px-2 py-1 text-xs text-foreground-tertiary font-medium">Move to...</div>

        {product.story_id && (
          <button
            onClick={() => onMove('unassign')}
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-elevated flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Unassigned
          </button>
        )}

        {product.variation_type !== 'addon' && (
          <button
            onClick={() => onMove('onetime')}
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-elevated flex items-center gap-2"
          >
            <Package className="w-3.5 h-3.5" />
            One-time Purchase
          </button>
        )}

        {product.variation_type !== 'ignored' && (
          <button
            onClick={() => onMove('ignored')}
            className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-elevated flex items-center gap-2"
          >
            <X className="w-3.5 h-3.5" />
            Ignored
          </button>
        )}

        {stories.length > 0 && (
          <>
            <div className="border-t border-border my-1" />
            <div className="px-2 py-1 text-xs text-foreground-tertiary font-medium">Assign to tier...</div>
            {stories.map(story => (
              <div key={story.id}>
                {story.tiers.map(tier => (
                  <button
                    key={tier.id}
                    onClick={() => onMove('assign', story.id, tier.id)}
                    className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-elevated flex items-center gap-2"
                  >
                    <MoveRight className="w-3.5 h-3.5" />
                    <span>{story.name}</span>
                    <span className="text-foreground-tertiary">·</span>
                    <span className="text-foreground-secondary">{tier.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

// Create Story Modal Component
function CreateStoryModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  formState,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  isLoading: boolean
  formState: {
    name: string
    setName: (v: string) => void
    type: 'sequential' | 'recurring'
    setType: (v: 'sequential' | 'recurring') => void
    episodes: number
    setEpisodes: (v: number) => void
    installment: string
    setInstallment: (v: string) => void
    tiers: string[]
    setTiers: (v: string[]) => void
  }
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl border border-border w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Create Subscription
          </h3>
          <button onClick={onClose} className="text-foreground-tertiary hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Subscription Name</label>
            <input
              type="text"
              value={formState.name}
              onChange={e => formState.setName(e.target.value)}
              placeholder="e.g., Monthly Box, VIP Membership"
              className="w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Subscription Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => formState.setType('sequential')}
                className={`p-3 rounded-lg border text-left ${
                  formState.type === 'sequential' ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong'
                }`}
              >
                <p className="font-medium text-sm">Fixed Length</p>
                <p className="text-xs text-foreground-tertiary">Ends after N shipments</p>
              </button>
              <button
                onClick={() => formState.setType('recurring')}
                className={`p-3 rounded-lg border text-left ${
                  formState.type === 'recurring' ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong'
                }`}
              >
                <p className="font-medium text-sm">Ongoing</p>
                <p className="text-xs text-foreground-tertiary">Continues until cancelled</p>
              </button>
            </div>
          </div>

          {formState.type === 'sequential' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Total Shipments</label>
                <input
                  type="number"
                  value={formState.episodes}
                  onChange={e => formState.setEpisodes(parseInt(e.target.value) || 12)}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Shipment Label</label>
                <input
                  type="text"
                  value={formState.installment}
                  onChange={e => formState.setInstallment(e.target.value)}
                  placeholder="Box, Issue, Month"
                  className="w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Pricing Tiers</label>
            <p className="text-xs text-foreground-tertiary mb-2">
              Add tiers if you offer different pricing levels (e.g., Basic, Standard, Premium)
            </p>
            <div className="space-y-2">
              {formState.tiers.map((tier, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={tier}
                    onChange={e => {
                      const updated = [...formState.tiers]
                      updated[index] = e.target.value
                      formState.setTiers(updated)
                    }}
                    placeholder="Tier name"
                    className="flex-1 px-3 py-2 bg-background-elevated border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  />
                  {formState.tiers.length > 1 && (
                    <button
                      onClick={() => formState.setTiers(formState.tiers.filter((_, i) => i !== index))}
                      className="px-2 text-foreground-tertiary hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => formState.setTiers([...formState.tiers, ''])}
                className="text-sm text-accent hover:text-accent-hover flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Tier
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background-elevated"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!formState.name.trim() || isLoading}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create Subscription
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// AI Results Modal Component
function AIResultsModal({
  aiResults,
  variations,
  aiSelectionsToApply,
  isLoading,
  onToggle,
  onToggleAll,
  onApply,
  onClose,
}: {
  aiResults: AIAnalysisResult
  variations: ProductVariation[]
  aiSelectionsToApply: { subscription: Set<string>; addon: Set<string>; ignored: Set<string> }
  isLoading: boolean
  onToggle: (id: string, category: 'subscription' | 'addon' | 'ignored') => void
  onToggleAll: (category: 'subscription' | 'addon' | 'ignored', select: boolean) => void
  onApply: () => void
  onClose: () => void
}) {
  return (
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
                <p className="text-sm text-foreground-secondary">Review suggestions below, then apply</p>
              </div>
            </div>
            <button onClick={onClose} className="text-foreground-tertiary hover:text-foreground">
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
            <AIResultSection
              title="Subscription Products"
              count={aiResults.summary.subscription}
              icon={<Layers className="w-4 h-4" />}
              color="green"
              description="These will remain in 'Unassigned' for you to assign to subscription tiers"
              suggestions={aiResults.suggestions.filter(s => s.category === 'subscription')}
              variations={variations}
              selectedIds={aiSelectionsToApply.subscription}
              onToggle={(id) => onToggle(id, 'subscription')}
              onToggleAll={(select) => onToggleAll('subscription', select)}
            />
          )}

          {/* One-time Purchases */}
          {aiResults.summary.addon > 0 && (
            <AIResultSection
              title="One-time Purchases"
              count={aiResults.summary.addon}
              icon={<Package className="w-4 h-4" />}
              color="blue"
              description="Merchandise, add-ons, or single purchases - won't affect shipment tracking"
              suggestions={aiResults.suggestions.filter(s => s.category === 'addon')}
              variations={variations}
              selectedIds={aiSelectionsToApply.addon}
              onToggle={(id) => onToggle(id, 'addon')}
              onToggleAll={(select) => onToggleAll('addon', select)}
            />
          )}

          {/* Ignored Products */}
          {aiResults.summary.ignored > 0 && (
            <AIResultSection
              title="Ignore"
              count={aiResults.summary.ignored}
              icon={<X className="w-4 h-4" />}
              color="gray"
              description="Test orders, internal items, or discontinued products"
              suggestions={aiResults.suggestions.filter(s => s.category === 'ignored')}
              variations={variations}
              selectedIds={aiSelectionsToApply.ignored}
              onToggle={(id) => onToggle(id, 'ignored')}
              onToggleAll={(select) => onToggleAll('ignored', select)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground-secondary">
              <span className="font-medium">{aiSelectionsToApply.addon.size + aiSelectionsToApply.ignored.size}</span>{' '}
              products will be categorized
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background-elevated"
              >
                Cancel
              </button>
              <button
                onClick={onApply}
                disabled={isLoading || (aiSelectionsToApply.addon.size === 0 && aiSelectionsToApply.ignored.size === 0)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Apply Suggestions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// AI Result Section Component
function AIResultSection({
  title,
  count,
  icon,
  color,
  description,
  suggestions,
  variations,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  title: string
  count: number
  icon: React.ReactNode
  color: 'green' | 'blue' | 'gray'
  description: string
  suggestions: AISuggestion[]
  variations: ProductVariation[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: (select: boolean) => void
}) {
  const colorClasses = {
    green: { text: 'text-green-700', border: 'border-green-300', bg: 'bg-green-50' },
    blue: { text: 'text-blue-700', border: 'border-blue-300', bg: 'bg-blue-50' },
    gray: { text: 'text-gray-600', border: 'border-gray-300', bg: 'bg-gray-50' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-medium ${colorClasses[color].text} flex items-center gap-2`}>
          {icon}
          {title} ({count})
        </h4>
        <button
          onClick={() => onToggleAll(selectedIds.size === 0)}
          className="text-xs text-foreground-tertiary hover:text-foreground"
        >
          {selectedIds.size === count ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <p className="text-xs text-foreground-tertiary mb-2">{description}</p>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {suggestions.map(s => {
          const product = variations.find(v => v.id === s.id)
          if (!product) return null
          const isSelected = selectedIds.has(s.id)
          return (
            <div
              key={s.id}
              onClick={() => onToggle(s.id)}
              className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                isSelected ? `${colorClasses[color].border} ${colorClasses[color].bg}` : 'border-border bg-background hover:bg-background-elevated'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? `border-${color}-500 bg-${color}-500` : 'border-foreground-tertiary'
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
                    {s.reasoning}
                    {s.confidence < 0.7 && <span className="ml-1 text-amber-600">(low confidence)</span>}
                  </p>
                </div>
                <div className="text-xs text-foreground-tertiary">{product.order_count} orders</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
