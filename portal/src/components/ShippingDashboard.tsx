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
} from 'lucide-react'
import { Shipment, PrintBatch } from '@/lib/supabase/data'

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
    address1?: string | null
    address2?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    country?: string | null
  } | null
}

interface ShippingDashboardProps {
  clientSlug: string
  organizationId: string
  initialShipments: ShipmentWithSubscriber[]
  recentBatches: PrintBatch[]
  problemOrders: ShipmentWithSubscriber[]
  shipstationConnected: boolean
}

type SortField = 'product_name' | 'variant_name' | 'customer' | 'created_at'
type SortDirection = 'asc' | 'desc'
type TabView = 'ready' | 'problems' | 'batches'

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
  } | null>(null)

  // Upcoming subscriptions state
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState<Record<string, UpcomingSubscription[]>>({})
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [showWaitWarnings, setShowWaitWarnings] = useState(true)

  // Fetch upcoming subscriptions on mount
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
      <div className="flex gap-2 border-b border-[rgba(255,255,255,0.06)]">
        <button
          onClick={() => setActiveTab('ready')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ready'
              ? 'border-[#e07a42] text-white'
              : 'border-transparent text-[#71717a] hover:text-white'
          }`}
        >
          Ready to Ship ({shipments.length})
        </button>
        <button
          onClick={() => setActiveTab('problems')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'problems'
              ? 'border-[#e07a42] text-white'
              : 'border-transparent text-[#71717a] hover:text-white'
          }`}
        >
          Problem Orders ({problemOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'batches'
              ? 'border-[#e07a42] text-white'
              : 'border-transparent text-[#71717a] hover:text-white'
          }`}
        >
          Recent Batches ({recentBatches.length})
        </button>
      </div>

      {/* ShipStation Warning */}
      {!shipstationConnected && activeTab === 'ready' && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-yellow-400 font-medium">ShipStation Not Connected</p>
            <p className="text-sm text-[#71717a]">Connect ShipStation in Settings to generate shipping labels.</p>
          </div>
        </div>
      )}

      {/* Ready to Ship Tab */}
      {activeTab === 'ready' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Product Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#71717a]" />
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]/50"
              >
                <option value="">All Products</option>
                {productNames.map(name => (
                  <option key={name} value={name!}>{name}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-[#71717a]" />
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]/50"
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
                className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm text-[#71717a]">Show wait warnings</span>
            </label>

            <div className="flex-1" />

            {/* Selection Info */}
            {selectedCount > 0 && (
              <span className="text-sm text-[#71717a]">
                {selectedCount} selected
              </span>
            )}

            {/* Merge Button */}
            <button
              onClick={handleMerge}
              disabled={!canMerge || isMerging}
              className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
              Merge Selected
            </button>

            {/* Generate Labels Button */}
            <button
              onClick={handleGenerateLabels}
              disabled={selectedCount === 0 || isGenerating || !shipstationConnected}
              className="px-4 py-2 rounded-lg bg-[#e07a42] text-white text-sm font-medium hover:bg-[#e07a42]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Generate Labels ({selectedCount})
            </button>
          </div>

          {/* Batch Result Modal */}
          {batchResult && (
            <div className="p-6 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-lg font-semibold text-white mb-4">Batch Complete</h3>

              <div className="flex gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#5CB87A]" />
                  <span className="text-[#5CB87A] font-medium">{batchResult.success} Labels Ready</span>
                </div>
                {batchResult.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-medium">{batchResult.failed} Errors</span>
                  </div>
                )}
              </div>

              {batchResult.pdfUrl && (
                <a
                  href={batchResult.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5CB87A] text-white font-medium hover:bg-[#5CB87A]/90"
                >
                  <Download className="w-4 h-4" />
                  Download Labels PDF
                </a>
              )}

              {batchResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Errors:</h4>
                  <div className="space-y-2">
                    {batchResult.errors.map((err, i) => (
                      <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <span className="text-white font-medium">{err.orderNumber}:</span>
                        <span className="text-red-400 ml-2">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setBatchResult(null)}
                className="mt-4 text-sm text-[#71717a] hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Shipments Table */}
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[auto,1fr,1fr,1fr,auto,auto] gap-4 p-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size === sortedShipments.length && sortedShipments.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[#e07a42] focus:ring-[#e07a42] focus:ring-offset-0"
                />
              </div>
              <div className="text-sm font-medium text-[#71717a]">Order / Product</div>
              <div className="text-sm font-medium text-[#71717a]">Customer</div>
              <div className="text-sm font-medium text-[#71717a]">Variant</div>
              <div className="text-sm font-medium text-[#71717a]">Weight</div>
              <div className="text-sm font-medium text-[#71717a]">Merge</div>
            </div>

            {/* Grouped Rows */}
            {groupedShipments.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-[#71717a] mx-auto mb-4" />
                <p className="text-[#71717a]">No shipments ready to ship</p>
              </div>
            ) : (
              groupedShipments.map((group, groupIndex) => (
                <div key={`${group.product}-${group.variant}-${groupIndex}`}>
                  {/* Group Header */}
                  <div className="px-4 py-2 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.04)]">
                    <span className="text-sm font-medium text-[#e07a42]">
                      {group.product}
                      {group.variant && <span className="text-[#71717a] ml-2">- {group.variant}</span>}
                    </span>
                    <span className="text-xs text-[#52525b] ml-2">({group.items.length})</span>
                  </div>

                  {/* Group Items */}
                  {group.items.map((shipment) => {
                    const isMergeable = shipment.subscriber?.id && mergeCandidates.has(shipment.subscriber.id)
                    const upcomingSub = shipment.subscriber?.id ? upcomingSubscriptions[shipment.subscriber.id] : null
                    const hasUpcoming = upcomingSub && upcomingSub.length > 0 && shipment.type === 'One-Off'

                    return (
                      <div
                        key={shipment.id}
                        className={`grid grid-cols-[auto,1fr,1fr,1fr,auto,auto] gap-4 p-4 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] ${
                          selectedIds.has(shipment.id) ? 'bg-[#e07a42]/5' : ''
                        } ${isMergeable ? 'border-l-2 border-l-yellow-500' : ''} ${hasUpcoming && showWaitWarnings ? 'border-l-2 border-l-blue-500' : ''}`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(shipment.id)}
                            onChange={() => toggleSelection(shipment.id)}
                            className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[#e07a42] focus:ring-[#e07a42] focus:ring-offset-0"
                          />
                        </div>
                        <div>
                          <p className="text-white font-medium">{shipment.order_number || '-'}</p>
                          <p className="text-sm text-[#71717a]">{shipment.product_name}</p>
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
                          <p className="text-white">
                            {shipment.subscriber?.first_name} {shipment.subscriber?.last_name}
                          </p>
                          <p className="text-sm text-[#71717a]">{shipment.subscriber?.email}</p>
                        </div>
                        <div>
                          <span className="px-2 py-1 rounded-md bg-[rgba(255,255,255,0.05)] text-sm text-white">
                            {shipment.variant_name || '-'}
                          </span>
                        </div>
                        <div className="text-sm text-[#71717a]">
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
        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          {problemOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Check className="w-12 h-12 text-[#5CB87A] mx-auto mb-4" />
              <p className="text-[#71717a]">No problem orders</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {problemOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {order.order_number} - {order.subscriber?.first_name} {order.subscriber?.last_name}
                      </p>
                      <p className="text-sm text-[#71717a]">{order.product_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      order.financial_status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                      order.financial_status === 'voided' ? 'bg-red-500/10 text-red-400' :
                      'bg-[#71717a]/10 text-[#71717a]'
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

      {/* Recent Batches Tab */}
      {activeTab === 'batches' && (
        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          {recentBatches.length === 0 ? (
            <div className="p-12 text-center">
              <Printer className="w-12 h-12 text-[#71717a] mx-auto mb-4" />
              <p className="text-[#71717a]">No batches created yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {recentBatches.map((batch) => (
                <div key={batch.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#e07a42]/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#e07a42]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Batch #{batch.batch_number}</p>
                      <p className="text-sm text-[#71717a]">
                        {new Date(batch.created_at).toLocaleDateString()} at {new Date(batch.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white">{batch.successful_labels} labels</p>
                      {batch.failed_labels > 0 && (
                        <p className="text-sm text-red-400">{batch.failed_labels} failed</p>
                      )}
                    </div>
                    {batch.label_pdf_url && (
                      <a
                        href={batch.label_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)]"
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
    </div>
  )
}
