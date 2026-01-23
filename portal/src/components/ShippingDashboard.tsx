'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Package,
  Printer,
  AlertTriangle,
  Check,
  Loader2,
  ChevronDown,
  Merge,
  Download,
  RefreshCw,
  Filter,
  ArrowUpDown,
  Clock,
  CalendarClock,
  DollarSign,
  ExternalLink,
  Send,
} from 'lucide-react'
import { Shipment, PrintBatch } from '@/lib/supabase/data'
import RateSelectionModal from './RateSelectionModal'

interface ServiceTotal {
  serviceCode: string
  carrierId: string
  carrierName: string
  serviceName: string
  totalCost: number
  avgCost: number
  deliveryDays?: number
}

interface ShipmentRateData {
  shipmentId: string
  orderNumber: string | null
  subscriberName: string
  weight: number
  rates: Array<{
    rate_id: string
    carrier_id: string
    carrier_friendly_name: string
    service_type: string
    service_code: string
    shipping_amount: { currency: string; amount: number }
    delivery_days?: number
    estimated_delivery_date?: string
  }>
  error?: string
}

interface UpcomingSubscription {
  scheduledAt: string
  productTitle: string
  daysUntil: number
}

interface ShipmentWithSubscriber extends Shipment {
  subscriber: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    preferred_name?: string | null
    use_preferred_name_for_shipping?: boolean
    address1?: string | null
    address2?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    country?: string | null
  } | null
}

type ShippingProvider = 'shipstation' | 'pirateship' | 'shopify_shipping' | '3pl' | null

interface ShippingDashboardProps {
  clientSlug: string
  organizationId: string
  initialShipments: ShipmentWithSubscriber[]
  recentBatches: PrintBatch[]
  problemOrders: ShipmentWithSubscriber[]
  shipstationConnected: boolean
  shippingProvider?: ShippingProvider
  shopifyShopUrl?: string | null
}

type SortField = 'product_name' | 'variant_name' | 'customer' | 'created_at'
type SortDirection = 'asc' | 'desc'
type TabView = 'ready' | 'problems' | 'batches' | 'onhold'

interface HeldShipment extends ShipmentWithSubscriber {
  held_until: string | null
  hold_reason: string | null
}

// Variant size sort order
const VARIANT_ORDER: Record<string, number> = {
  'XS': 1, 'S': 2, 'Small': 2,
  'M': 3, 'Medium': 3,
  'L': 4, 'Large': 4,
  'XL': 5, 'X-Large': 5,
  '2XL': 6, 'XXL': 6,
  '3XL': 7, 'XXXL': 7,
}

function getVariantSortOrder(variant: string | null): number {
  if (!variant) return 999
  return VARIANT_ORDER[variant] || 999
}

export default function ShippingDashboard({
  clientSlug,
  organizationId,
  initialShipments,
  recentBatches,
  problemOrders,
  shipstationConnected,
  shippingProvider,
  shopifyShopUrl,
}: ShippingDashboardProps) {
  const [shipments, setShipments] = useState<ShipmentWithSubscriber[]>(initialShipments)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<TabView>('ready')
  const [sortField, setSortField] = useState<SortField>('product_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [productFilter, setProductFilter] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [batchResult, setBatchResult] = useState<{
    success: number
    failed: number
    errors: { orderId: string; orderNumber: string; error: string }[]
    pdfUrl?: string
    batchId?: string
    labelUrls?: string[]
    totalShippingCost?: number
  } | null>(null)

  // Label purchase state
  const [showRateModal, setShowRateModal] = useState(false)
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [isPurchasingLabels, setIsPurchasingLabels] = useState(false)
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [commonServices, setCommonServices] = useState<ServiceTotal[]>([])
  const [shipmentRates, setShipmentRates] = useState<ShipmentRateData[]>([])
  const [showActionDropdown, setShowActionDropdown] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)

  // Upcoming subscriptions state
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState<Record<string, UpcomingSubscription[]>>({})
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [showWaitWarnings, setShowWaitWarnings] = useState(true)

  // Held shipments state (for predictive merging)
  const [heldShipments, setHeldShipments] = useState<HeldShipment[]>([])
  const [loadingHeld, setLoadingHeld] = useState(true)
  const [isReleasing, setIsReleasing] = useState(false)
  const [selectedHeldIds, setSelectedHeldIds] = useState<Set<string>>(new Set())

  // Fetch upcoming subscriptions and held shipments on mount
  useEffect(() => {
    async function fetchUpcoming() {
      try {
        const response = await fetch('/api/shipping/upcoming-subscriptions?days=5')
        const data = await response.json()
        setUpcomingSubscriptions(data.upcomingBySubscriberId || {})
      } catch (error) {
        console.error('Failed to fetch upcoming subscriptions:', error)
      } finally {
        setLoadingUpcoming(false)
      }
    }
    fetchUpcoming()
  }, [])

  // Fetch held shipments
  useEffect(() => {
    async function fetchHeldShipments() {
      try {
        const response = await fetch('/api/shipping/hold')
        const data = await response.json()
        setHeldShipments(data.shipments || [])
      } catch (error) {
        console.error('Failed to fetch held shipments:', error)
      } finally {
        setLoadingHeld(false)
      }
    }
    fetchHeldShipments()
  }, [])

  // Release held shipments
  const handleReleaseSelected = async () => {
    if (selectedHeldIds.size === 0) return

    setIsReleasing(true)
    try {
      const response = await fetch('/api/shipping/release', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentIds: Array.from(selectedHeldIds),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release shipments')
      }

      // Remove released shipments from held list and add to regular shipments
      const releasedIds = new Set(data.releasedIds || Array.from(selectedHeldIds))
      const releasedShipments = heldShipments.filter(s => releasedIds.has(s.id))
      
      setHeldShipments(prev => prev.filter(s => !releasedIds.has(s.id)))
      setShipments(prev => [...prev, ...releasedShipments])
      setSelectedHeldIds(new Set())
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to release shipments')
    } finally {
      setIsReleasing(false)
    }
  }

  // Toggle held shipment selection
  const toggleHeldSelection = useCallback((id: string) => {
    setSelectedHeldIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Release a single held shipment
  const releaseSingleShipment = async (id: string) => {
    setIsReleasing(true)
    try {
      const response = await fetch('/api/shipping/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release shipment')
      }

      // Move released shipment from held to regular shipments
      const released = heldShipments.find(s => s.id === id)
      if (released) {
        setHeldShipments(prev => prev.filter(s => s.id !== id))
        setShipments(prev => [...prev, released])
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to release shipment')
    } finally {
      setIsReleasing(false)
    }
  }

  // Get unique product names for filter
  const productNames = useMemo(() => {
    const names = new Set(shipments.map(s => s.product_name).filter(Boolean))
    return Array.from(names).sort()
  }, [shipments])

  // Sort and filter shipments
  const sortedShipments = useMemo(() => {
    let filtered = [...shipments]

    // Apply product filter
    if (productFilter) {
      filtered = filtered.filter(s => s.product_name === productFilter)
    }

    // Sort with Smart Sort logic
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'product_name':
          // Primary: Product name
          comparison = (a.product_name || '').localeCompare(b.product_name || '')
          // Secondary: Variant (shirt size) in logical order
          if (comparison === 0) {
            comparison = getVariantSortOrder(a.variant_name) - getVariantSortOrder(b.variant_name)
          }
          break
        case 'variant_name':
          comparison = getVariantSortOrder(a.variant_name) - getVariantSortOrder(b.variant_name)
          break
        case 'customer':
          const aName = `${a.subscriber?.last_name || ''} ${a.subscriber?.first_name || ''}`
          const bName = `${b.subscriber?.last_name || ''} ${b.subscriber?.first_name || ''}`
          comparison = aName.localeCompare(bName)
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [shipments, sortField, sortDirection, productFilter])

  // Group shipments by product for visual grouping
  const groupedShipments = useMemo(() => {
    const groups: { product: string; variant: string | null; items: ShipmentWithSubscriber[] }[] = []
    let currentGroup: typeof groups[0] | null = null

    for (const shipment of sortedShipments) {
      const product = shipment.product_name || 'Unknown'
      const variant = shipment.variant_name

      if (!currentGroup || currentGroup.product !== product || currentGroup.variant !== variant) {
        currentGroup = { product, variant, items: [] }
        groups.push(currentGroup)
      }
      currentGroup.items.push(shipment)
    }

    return groups
  }, [sortedShipments])

  // Find shipments that can be merged (same customer)
  const mergeCandidates = useMemo(() => {
    const customerGroups = new Map<string, ShipmentWithSubscriber[]>()

    for (const shipment of sortedShipments) {
      if (!shipment.subscriber?.id) continue
      const existing = customerGroups.get(shipment.subscriber.id) || []
      existing.push(shipment)
      customerGroups.set(shipment.subscriber.id, existing)
    }

    // Only return customers with multiple shipments
    const mergeableCustomerIds = new Set<string>()
    customerGroups.forEach((items, customerId) => {
      if (items.length > 1) {
        mergeableCustomerIds.add(customerId)
      }
    })

    return mergeableCustomerIds
  }, [sortedShipments])

  // Toggle selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all visible
  const selectAll = useCallback(() => {
    if (selectedIds.size === sortedShipments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedShipments.map(s => s.id)))
    }
  }, [sortedShipments, selectedIds.size])

  // Select all mergeable for a customer
  const selectMergeable = useCallback((subscriberId: string) => {
    const customerShipments = sortedShipments.filter(s => s.subscriber?.id === subscriberId)
    setSelectedIds(prev => {
      const next = new Set(prev)
      customerShipments.forEach(s => next.add(s.id))
      return next
    })
  }, [sortedShipments])

  // Merge selected shipments
  const handleMerge = async () => {
    const selected = sortedShipments.filter(s => selectedIds.has(s.id))
    if (selected.length < 2) return

    // Verify all belong to same customer
    const customerIds = new Set(selected.map(s => s.subscriber?.id).filter(Boolean))
    if (customerIds.size !== 1) {
      alert('Can only merge shipments for the same customer')
      return
    }

    setIsMerging(true)

    try {
      const response = await fetch('/api/shipping/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentIds: Array.from(selectedIds),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to merge shipments')
      }

      // Refresh shipments list
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to merge shipments')
    } finally {
      setIsMerging(false)
    }
  }

  // Generate labels for selected shipments
  const handleGenerateLabels = async () => {
    if (selectedIds.size === 0) return
    if (!shipstationConnected) {
      alert('Please connect ShipStation in Settings first')
      return
    }

    setIsGenerating(true)
    setBatchResult(null)

    try {
      // Get selected shipments in their current sorted order
      const selectedShipments = sortedShipments.filter(s => selectedIds.has(s.id))
      const orderedIds = selectedShipments.map(s => s.id)

      const response = await fetch('/api/shipping/generate-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentIds: orderedIds,
          // Pass the order so backend assigns print_sequence correctly
          sortOrder: orderedIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate labels')
      }

      setBatchResult({
        success: data.success,
        failed: data.failed,
        errors: data.errors || [],
        pdfUrl: data.pdfUrl,
        batchId: data.batchId,
      })

      // Remove successful shipments from the list
      if (data.successIds) {
        setShipments(prev => prev.filter(s => !data.successIds.includes(s.id)))
        setSelectedIds(new Set())
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate labels')
    } finally {
      setIsGenerating(false)
    }
  }

  // Fetch rates for selected shipments (opens rate modal)
  const handleFetchRates = async () => {
    if (selectedIds.size === 0) return
    if (!shipstationConnected) {
      alert('Please connect ShipStation in Settings first')
      return
    }

    setShowRateModal(true)
    setIsLoadingRates(true)
    setRatesError(null)
    setCommonServices([])
    setShipmentRates([])

    try {
      const selectedShipments = sortedShipments.filter(s => selectedIds.has(s.id))
      const orderedIds = selectedShipments.map(s => s.id)

      const response = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds: orderedIds }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rates')
      }

      setCommonServices(data.commonServices || [])
      setShipmentRates(data.shipmentRates || [])
    } catch (error) {
      setRatesError(error instanceof Error ? error.message : 'Failed to fetch rates')
    } finally {
      setIsLoadingRates(false)
    }
  }

  // Purchase labels with selected service
  const handlePurchaseLabels = async (carrierId: string, serviceCode: string, saveAsDefault: boolean) => {
    if (selectedIds.size === 0) return

    setIsPurchasingLabels(true)

    try {
      const selectedShipments = sortedShipments.filter(s => selectedIds.has(s.id))
      const orderedIds = selectedShipments.map(s => s.id)

      const response = await fetch('/api/shipping/buy-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentIds: orderedIds,
          sortOrder: orderedIds,
          carrierId,
          serviceCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase labels')
      }

      // Save as default if requested
      if (saveAsDefault && data.success > 0) {
        await fetch('/api/shipping/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            default_carrier_id: carrierId,
            default_service_code: serviceCode,
          }),
        }).catch(console.error) // Don't fail if saving default fails
      }

      setShowRateModal(false)
      setBatchResult({
        success: data.success,
        failed: data.failed,
        errors: data.errors || [],
        batchId: data.batchId,
        labelUrls: data.labelUrls,
        totalShippingCost: data.totalShippingCost,
      })

      // Remove successful shipments from the list
      if (data.successIds) {
        setShipments(prev => prev.filter(s => !data.successIds.includes(s.id)))
        setSelectedIds(new Set())
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to purchase labels')
    } finally {
      setIsPurchasingLabels(false)
    }
  }

  // Export selected shipments to CSV (for PirateShip)
  const handleExportCSV = async () => {
    if (selectedIds.size === 0) return

    setIsExportingCSV(true)

    try {
      const selectedShipments = sortedShipments.filter(s => selectedIds.has(s.id))
      const orderedIds = selectedShipments.map(s => s.id)

      const response = await fetch('/api/shipping/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentIds: orderedIds,
          format: 'pirateship',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export CSV')
      }

      // Download the CSV
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipments-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export CSV')
    } finally {
      setIsExportingCSV(false)
    }
  }

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const selectedCount = selectedIds.size
  const canMerge = selectedCount >= 2 &&
    new Set(sortedShipments.filter(s => selectedIds.has(s.id)).map(s => s.subscriber?.id)).size === 1

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('ready')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ready'
              ? 'border-accent text-foreground'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          Ready to Ship ({shipments.length})
        </button>
        <button
          onClick={() => setActiveTab('onhold')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'onhold'
              ? 'border-accent text-foreground'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          On Hold ({heldShipments.length})
        </button>
        <button
          onClick={() => setActiveTab('problems')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'problems'
              ? 'border-accent text-foreground'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          Problem Orders ({problemOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'batches'
              ? 'border-accent text-foreground'
              : 'border-transparent text-foreground-secondary hover:text-foreground'
          }`}
        >
          Recent Batches ({recentBatches.length})
        </button>
      </div>

      {/* Provider-specific info */}
      {activeTab === 'ready' && (
        <>
          {/* ShipStation users without connection */}
          {(shippingProvider === 'shipstation' || !shippingProvider) && !shipstationConnected && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-medium">ShipStation Not Connected</p>
                <p className="text-sm text-foreground-secondary">Connect ShipStation in Settings to generate shipping labels.</p>
              </div>
            </div>
          )}

          {/* PirateShip users */}
          {shippingProvider === 'pirateship' && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
              <Download className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-blue-400 font-medium">Using PirateShip</p>
                <p className="text-sm text-foreground-secondary">Select shipments, sort them how you want, then export to CSV for PirateShip import.</p>
              </div>
            </div>
          )}

          {/* 3PL users */}
          {shippingProvider === '3pl' && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
              <Download className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-indigo-400 font-medium">Using 3PL / Fulfillment Center</p>
                <p className="text-sm text-foreground-secondary">Select shipments, sort them how you want, then export to CSV for your fulfillment partner.</p>
              </div>
            </div>
          )}

          {/* Shopify Shipping users */}
          {shippingProvider === 'shopify_shipping' && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
              <ExternalLink className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">Using Shopify Shipping</p>
                <p className="text-sm text-foreground-secondary">Sort and merge orders here, then buy labels directly in Shopify.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Ready to Ship Tab */}
      {activeTab === 'ready' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Product Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-foreground-secondary" />
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-background-secondary border border-border text-foreground text-sm focus:outline-none focus:border-accent/50"
              >
                <option value="">All Products</option>
                {productNames.map(name => (
                  <option key={name} value={name!}>{name}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-foreground-secondary" />
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="px-3 py-1.5 rounded-lg bg-background-secondary border border-border text-foreground text-sm focus:outline-none focus:border-accent/50"
              >
                <option value="product_name">Product → Size (Smart Sort)</option>
                <option value="variant_name">Size Only</option>
                <option value="customer">Customer Name</option>
                <option value="created_at">Date Created</option>
              </select>
            </div>

            {/* Toggle upcoming subscription warnings */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showWaitWarnings}
                onChange={(e) => setShowWaitWarnings(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-transparent text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm text-foreground-secondary">Show wait warnings</span>
            </label>

            <div className="flex-1" />

            {/* Selection Info */}
            {selectedCount > 0 && (
              <span className="text-sm text-foreground-secondary">
                {selectedCount} selected
              </span>
            )}

            {/* Merge Button */}
            <button
              onClick={handleMerge}
              disabled={!canMerge || isMerging}
              className="px-4 py-2 rounded-lg bg-background-secondary border border-border text-foreground text-sm font-medium hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
              Merge Selected
            </button>

            {/* Provider-specific Actions */}
            {/* PirateShip / 3PL: Export CSV */}
            {(shippingProvider === 'pirateship' || shippingProvider === '3pl') && (
              <button
                onClick={handleExportCSV}
                disabled={selectedCount === 0 || isExportingCSV}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExportingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export CSV ({selectedCount})
              </button>
            )}

            {/* Shopify Shipping: Link to Shopify */}
            {shippingProvider === 'shopify_shipping' && (
              <a
                href={shopifyShopUrl || 'https://admin.shopify.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Shopify Orders
              </a>
            )}

            {/* ShipStation: Full dropdown */}
            {(shippingProvider === 'shipstation' || !shippingProvider) && (
              <div className="relative">
                <button
                  onClick={() => setShowActionDropdown(!showActionDropdown)}
                  disabled={selectedCount === 0 || !shipstationConnected}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Ship Labels ({selectedCount})
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {showActionDropdown && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowActionDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-background-surface border border-border-strong shadow-xl z-20 overflow-hidden">
                      {/* Buy Labels - Main action */}
                      <button
                        onClick={() => {
                          setShowActionDropdown(false)
                          handleFetchRates()
                        }}
                        className="w-full px-4 py-3 text-left text-foreground hover:bg-background-elevated flex items-center gap-3 border-b border-border"
                      >
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="font-medium">Buy Labels</p>
                          <p className="text-xs text-foreground-muted">Compare rates & purchase in-app</p>
                        </div>
                      </button>

                      {/* Push to ShipStation */}
                      <button
                        onClick={() => {
                          setShowActionDropdown(false)
                          handleGenerateLabels()
                        }}
                        disabled={isGenerating}
                        className="w-full px-4 py-3 text-left text-foreground hover:bg-background-elevated flex items-center gap-3 border-b border-border disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 text-accent" />
                        )}
                        <div>
                          <p className="font-medium">Push to ShipStation</p>
                          <p className="text-xs text-foreground-muted">Create orders, print there</p>
                        </div>
                      </button>

                      {/* Open ShipStation */}
                      <a
                        href="https://ship.shipstation.com/orders/awaiting-shipment"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowActionDropdown(false)}
                        className="w-full px-4 py-3 text-left text-foreground hover:bg-background-elevated flex items-center gap-3"
                      >
                        <ExternalLink className="w-4 h-4 text-foreground-muted" />
                        <div>
                          <p className="font-medium">Open ShipStation</p>
                          <p className="text-xs text-foreground-muted">Print in ShipStation dashboard</p>
                        </div>
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Batch Result Modal */}
          {batchResult && (
            <div className="p-6 rounded-xl bg-background-surface border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Batch Complete</h3>

              <div className="flex flex-wrap gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">{batchResult.success} Labels Ready</span>
                </div>
                {batchResult.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-medium">{batchResult.failed} Errors</span>
                  </div>
                )}
                {batchResult.totalShippingCost !== undefined && batchResult.totalShippingCost > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-accent" />
                    <span className="text-accent font-medium">
                      ${batchResult.totalShippingCost.toFixed(2)} Total
                    </span>
                  </div>
                )}
              </div>

              {/* Download buttons */}
              <div className="flex flex-wrap gap-3 mb-4">
                {batchResult.pdfUrl && (
                  <a
                    href={batchResult.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600"
                  >
                    <Download className="w-4 h-4" />
                    Download Labels PDF
                  </a>
                )}
                {batchResult.labelUrls && batchResult.labelUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {batchResult.labelUrls.slice(0, 5).map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background-secondary text-foreground text-sm hover:bg-background-elevated"
                      >
                        <Download className="w-3 h-3" />
                        Label {i + 1}
                      </a>
                    ))}
                    {batchResult.labelUrls.length > 5 && (
                      <span className="text-sm text-foreground-secondary self-center">
                        +{batchResult.labelUrls.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {batchResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Errors:</h4>
                  <div className="space-y-2">
                    {batchResult.errors.map((err, i) => (
                      <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="text-foreground font-medium">{err.orderNumber}:</span>
                        <span className="text-red-400 ml-2">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setBatchResult(null)}
                className="mt-4 text-sm text-foreground-secondary hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Shipments Table */}
          <div className="rounded-xl bg-background-surface border border-border overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[auto,1fr,1fr,1fr,auto,auto] gap-4 p-4 border-b border-border bg-background-secondary">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size === sortedShipments.length && sortedShipments.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 rounded border-border bg-transparent text-accent focus:ring-accent focus:ring-offset-0"
                />
              </div>
              <div className="text-sm font-medium text-foreground-secondary">Order / Product</div>
              <div className="text-sm font-medium text-foreground-secondary">Customer</div>
              <div className="text-sm font-medium text-foreground-secondary">Variant</div>
              <div className="text-sm font-medium text-foreground-secondary">Weight</div>
              <div className="text-sm font-medium text-foreground-secondary">Merge</div>
            </div>

            {/* Grouped Rows */}
            {groupedShipments.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
                <p className="text-foreground-secondary">No shipments ready to ship</p>
              </div>
            ) : (
              groupedShipments.map((group, groupIndex) => (
                <div key={`${group.product}-${group.variant}-${groupIndex}`}>
                  {/* Group Header */}
                  <div className="px-4 py-2 bg-background-secondary border-b border-border">
                    <span className="text-sm font-medium text-accent">
                      {group.product}
                      {group.variant && <span className="text-foreground-secondary ml-2">- {group.variant}</span>}
                    </span>
                    <span className="text-xs text-foreground-tertiary ml-2">({group.items.length})</span>
                  </div>

                  {/* Group Items */}
                  {group.items.map((shipment) => {
                    const isMergeable = shipment.subscriber?.id && mergeCandidates.has(shipment.subscriber.id)
                    const upcomingSub = shipment.subscriber?.id ? upcomingSubscriptions[shipment.subscriber.id] : null
                    const hasUpcoming = upcomingSub && upcomingSub.length > 0 && shipment.type === 'One-Off'

                    return (
                      <div
                        key={shipment.id}
                        className={`grid grid-cols-[auto,1fr,1fr,1fr,auto,auto] gap-4 p-4 border-b border-border hover:bg-background-secondary ${
                          selectedIds.has(shipment.id) ? 'bg-accent/5' : ''
                        } ${isMergeable ? 'border-l-2 border-l-yellow-500' : ''} ${hasUpcoming && showWaitWarnings ? 'border-l-2 border-l-blue-500' : ''}`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(shipment.id)}
                            onChange={() => toggleSelection(shipment.id)}
                            className="w-4 h-4 rounded border-border bg-transparent text-accent focus:ring-accent focus:ring-offset-0"
                          />
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{shipment.order_number || '-'}</p>
                          <p className="text-sm text-foreground-secondary">{shipment.product_name}</p>
                          {/* Upcoming subscription warning */}
                          {hasUpcoming && showWaitWarnings && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-400">
                              <CalendarClock className="w-3 h-3" />
                              <span>
                                Subscription in {upcomingSub[0].daysUntil} day{upcomingSub[0].daysUntil !== 1 ? 's' : ''} - consider waiting
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-foreground">
                              {shipment.subscriber?.use_preferred_name_for_shipping && shipment.subscriber?.preferred_name
                                ? shipment.subscriber.preferred_name
                                : shipment.subscriber?.first_name} {shipment.subscriber?.last_name}
                            </p>
                            {shipment.subscriber?.use_preferred_name_for_shipping && shipment.subscriber?.preferred_name && (
                              <span 
                                className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 text-xs rounded"
                                title={`Shipping as "${shipment.subscriber.preferred_name}" instead of "${shipment.subscriber.first_name}"`}
                              >
                                Preferred
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground-secondary">{shipment.subscriber?.email}</p>
                        </div>
                        <div>
                          <span className="px-2 py-1 rounded-md bg-background-secondary text-sm text-foreground">
                            {shipment.variant_name || '-'}
                          </span>
                        </div>
                        <div className="text-sm text-foreground-secondary">
                          {shipment.weight_oz ? `${shipment.weight_oz} oz` : '-'}
                        </div>
                        <div className="flex items-center gap-1">
                          {hasUpcoming && (
                            <div
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"
                              title={`Subscription coming: ${upcomingSub[0].productTitle} in ${upcomingSub[0].daysUntil} days`}
                            >
                              <Clock className="w-4 h-4" />
                            </div>
                          )}
                          {isMergeable && (
                            <button
                              onClick={() => selectMergeable(shipment.subscriber!.id)}
                              className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                              title="Select all for this customer"
                            >
                              <Merge className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Problem Orders Tab */}
      {activeTab === 'problems' && (
        <div className="rounded-xl bg-background-surface border border-border overflow-hidden">
          {problemOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-foreground-secondary">No problem orders</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {problemOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">
                        {order.order_number} - {order.subscriber?.first_name} {order.subscriber?.last_name}
                      </p>
                      <p className="text-sm text-foreground-secondary">{order.product_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      order.financial_status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                      order.financial_status === 'voided' ? 'bg-red-500/10 text-red-400' :
                      'bg-background-secondary text-foreground-secondary'
                    }`}>
                      {order.financial_status || 'Unknown'}
                    </span>
                    {order.error_log && (
                      <span className="text-sm text-red-400" title={order.error_log}>
                        Error logged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* On Hold Tab */}
      {activeTab === 'onhold' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-foreground-secondary">
                Orders held for potential merge with upcoming subscriptions
              </span>
            </div>
            <button
              onClick={handleReleaseSelected}
              disabled={selectedHeldIds.size === 0 || isReleasing}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isReleasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Release Selected ({selectedHeldIds.size})
            </button>
          </div>

          <div className="rounded-xl bg-background-surface border border-border overflow-hidden">
            {loadingHeld ? (
              <div className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-foreground-secondary mx-auto mb-4 animate-spin" />
                <p className="text-foreground-secondary">Loading held orders...</p>
              </div>
            ) : heldShipments.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
                <p className="text-foreground-secondary">No orders on hold</p>
                <p className="text-sm text-foreground-tertiary mt-2">
                  One-off orders near subscription renewal dates are automatically held for merging.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {heldShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className={`p-4 flex items-center justify-between hover:bg-background-secondary ${
                      selectedHeldIds.has(shipment.id) ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedHeldIds.has(shipment.id)}
                        onChange={() => toggleHeldSelection(shipment.id)}
                        className="w-4 h-4 rounded border-border bg-transparent text-accent focus:ring-accent focus:ring-offset-0"
                      />
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">
                          {shipment.order_number} - {shipment.subscriber?.first_name} {shipment.subscriber?.last_name}
                        </p>
                        <p className="text-sm text-foreground-secondary">{shipment.product_name}</p>
                        <p className="text-xs text-foreground-tertiary">{shipment.subscriber?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {shipment.held_until && (
                          <div className="flex items-center gap-1.5 text-sm text-blue-400">
                            <CalendarClock className="w-4 h-4" />
                            <span>
                              Release on {new Date(shipment.held_until).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {shipment.hold_reason && (
                          <p className="text-xs text-foreground-tertiary mt-1">
                            {shipment.hold_reason === 'predictive_merge' ? 'Waiting for subscription' : shipment.hold_reason}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => releaseSingleShipment(shipment.id)}
                        disabled={isReleasing}
                        className="px-3 py-1.5 rounded-lg bg-background-secondary border border-border text-foreground text-sm hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Release Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Batches Tab */}
      {activeTab === 'batches' && (
        <div className="rounded-xl bg-background-surface border border-border overflow-hidden">
          {recentBatches.length === 0 ? (
            <div className="p-12 text-center">
              <Printer className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
              <p className="text-foreground-secondary">No batches created yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentBatches.map((batch) => (
                <div key={batch.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">Batch #{batch.batch_number}</p>
                      <p className="text-sm text-foreground-secondary">
                        {new Date(batch.created_at).toLocaleDateString()} at {new Date(batch.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-foreground">{batch.successful_labels} labels</p>
                      {batch.failed_labels > 0 && (
                        <p className="text-sm text-red-400">{batch.failed_labels} failed</p>
                      )}
                    </div>
                    {batch.label_pdf_url && (
                      <a
                        href={batch.label_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-background-secondary text-foreground hover:bg-background-elevated"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rate Selection Modal */}
      <RateSelectionModal
        isOpen={showRateModal}
        onClose={() => {
          setShowRateModal(false)
          setCommonServices([])
          setShipmentRates([])
          setRatesError(null)
        }}
        onConfirm={handlePurchaseLabels}
        shipmentCount={selectedIds.size}
        commonServices={commonServices}
        shipmentRates={shipmentRates}
        isLoading={isLoadingRates}
        isPurchasing={isPurchasingLabels}
        error={ratesError || undefined}
      />
    </div>
  )
}
