'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  ExpandedState,
} from '@tanstack/react-table'
import {
  Boxes,
  Package,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react'

interface Story {
  id: string
  name: string
  slug: string
}

interface Tier {
  id: string
  name: string
}

interface ProductVariation {
  id: string
  product_name: string
  variant_title: string | null
  sku: string | null
  order_count: number
  story: Story | null
  tier: Tier | null
  variation_type: 'subscription' | 'addon' | 'ignored'
}

interface UnknownSku {
  sku: string
  count: number
}

interface ExistingAlias {
  sku: string
  sequence: number
  name: string | null
}

interface ProductsClientProps {
  clientSlug: string
  productVariations: ProductVariation[]
  unknownSkus: UnknownSku[]
  existingAliases: ExistingAlias[]
}

// Hierarchical structure for table
interface ProductRow {
  id: string
  groupName: string
  type: 'subscription' | 'onetime' | 'sku-detail'
  storyId?: string
  tierId?: string
  storyName?: string
  tierName?: string
  subscription?: string
  sku?: string | null
  productName?: string
  variantTitle?: string | null
  orderCount: number
  productCount?: number
  subRows?: ProductRow[]
  // Original variation for actions
  variation?: ProductVariation
}

type TabType = 'products' | 'sku-mapper'

const columnHelper = createColumnHelper<ProductRow>()

export default function ProductsClient({
  clientSlug,
  productVariations,
  unknownSkus: initialUnknownSkus,
  existingAliases: initialAliases,
}: ProductsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('products')
  const [unknownSkus, setUnknownSkus] = useState(initialUnknownSkus)
  const [aliases, setAliases] = useState(initialAliases)

  // Transform data into hierarchical structure
  const tableData = useMemo(() => {
    const rows: ProductRow[] = []

    // Group subscription products by story + tier
    const subscriptionGroups = new Map<string, ProductVariation[]>()
    
    productVariations
      .filter(v => v.story_id && v.variation_type === 'subscription')
      .forEach(variation => {
        const key = `${variation.story?.id || 'unknown'}-${variation.tier?.id || 'no-tier'}`
        if (!subscriptionGroups.has(key)) {
          subscriptionGroups.set(key, [])
        }
        subscriptionGroups.get(key)!.push(variation)
      })

    // Create parent rows for each subscription group
    subscriptionGroups.forEach((variations, key) => {
      const first = variations[0]
      const totalOrders = variations.reduce((sum, v) => sum + v.order_count, 0)
      
      const groupName = first.tier
        ? `${first.story?.name} - ${first.tier.name}`
        : first.story?.name || 'Unknown Subscription'

      rows.push({
        id: `group-${key}`,
        groupName,
        type: 'subscription',
        storyId: first.story?.id,
        tierId: first.tier?.id,
        storyName: first.story?.name,
        tierName: first.tier?.name,
        subscription: groupName,
        orderCount: totalOrders,
        productCount: variations.length,
        subRows: variations.map(v => ({
          id: v.id,
          groupName: v.product_name,
          productName: v.product_name,
          variantTitle: v.variant_title,
          sku: v.sku,
          type: 'sku-detail' as const,
          storyName: first.story?.name,
          tierName: first.tier?.name,
          subscription: groupName,
          orderCount: v.order_count,
          variation: v,
        })),
      })
    })

    // Add one-time products as top-level rows
    productVariations
      .filter(v => v.variation_type === 'addon')
      .forEach(variation => {
        rows.push({
          id: variation.id,
          groupName: variation.product_name,
          productName: variation.product_name,
          variantTitle: variation.variant_title,
          sku: variation.sku,
          type: 'onetime',
          subscription: 'One-Time Purchase',
          orderCount: variation.order_count,
          variation,
        })
      })

    return rows
  }, [productVariations])

  // Count products for tab badges
  const productCounts = useMemo(() => {
    const subscriptionCount = productVariations.filter(
      v => v.story_id && v.variation_type === 'subscription'
    ).length
    const onetimeCount = productVariations.filter(
      v => v.variation_type === 'addon'
    ).length
    return subscriptionCount + onetimeCount
  }, [productVariations])

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
        <p className="text-[#71717a]">Manage your product catalog and map unknown SKUs</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[rgba(255,255,255,0.06)] mb-8">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-[#e07a42] text-[#e07a42]'
                : 'border-transparent text-[#71717a] hover:text-white hover:border-[rgba(255,255,255,0.06)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4" />
              Products
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === 'products'
                  ? 'bg-[#e07a42]/10 text-[#e07a42]'
                  : 'bg-[rgba(255,255,255,0.05)] text-[#71717a]'
              }`}>
                {productCounts}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('sku-mapper')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sku-mapper'
                ? 'border-[#e07a42] text-[#e07a42]'
                : 'border-transparent text-[#71717a] hover:text-white hover:border-[rgba(255,255,255,0.06)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              SKU Mapper
              {unknownSkus.length > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === 'sku-mapper'
                    ? 'bg-[#e07a42]/10 text-[#e07a42]'
                    : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {unknownSkus.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' ? (
        <ProductsTable data={tableData} />
      ) : (
        <SKUMapperTab
          clientSlug={clientSlug}
          productVariations={productVariations}
          unknownSkus={unknownSkus}
          aliases={aliases}
          setUnknownSkus={setUnknownSkus}
          setAliases={setAliases}
        />
      )}
    </main>
  )
}

// Products Table Component
function ProductsTable({ data }: { data: ProductRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>({})

  // Get unique subscriptions for filter dropdown
  const uniqueSubscriptions = useMemo(() => {
    const subs = new Set<string>()
    data.forEach(row => {
      if (row.subscription) {
        subs.add(row.subscription)
      }
    })
    return Array.from(subs).sort()
  }, [data])

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        row.getCanExpand() ? (
          <button
            onClick={row.getToggleExpandedHandler()}
            className="p-1 hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="w-4 h-4 text-[#71717a]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#71717a]" />
            )}
          </button>
        ) : null
      ),
      size: 40,
    }),
    columnHelper.accessor('groupName', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-white transition-colors"
          onClick={() => column.toggleSorting()}
        >
          Product / Group
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-50" />
          )}
        </button>
      ),
      cell: ({ row }) => {
        const isGroupRow = row.original.type === 'subscription'
        const isSkuDetail = row.original.type === 'sku-detail'
        
        return (
          <div style={{ paddingLeft: `${row.depth * 2}rem` }} className="min-w-0">
            {isGroupRow && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#e07a42] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{row.original.groupName}</p>
                  <p className="text-xs text-[#71717a]">
                    {row.original.productCount} SKU{row.original.productCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
            {isSkuDetail && (
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{row.original.productName}</p>
                {row.original.variantTitle && (
                  <p className="text-xs text-[#71717a] truncate">{row.original.variantTitle}</p>
                )}
              </div>
            )}
            {row.original.type === 'onetime' && (
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{row.original.productName}</p>
                  {row.original.variantTitle && (
                    <p className="text-xs text-[#71717a] truncate">{row.original.variantTitle}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor('sku', {
      header: 'SKU',
      cell: ({ getValue, row }) => {
        const sku = getValue()
        // Only show SKU for detail rows and one-time products
        if (row.original.type === 'subscription') return null
        
        return sku ? (
          <span className="font-mono text-xs bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded">
            {sku}
          </span>
        ) : (
          <span className="text-[#52525b] text-xs">—</span>
        )
      },
      size: 150,
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: ({ row }) => {
        if (row.original.type === 'subscription') {
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#e07a42]/10 text-[#e07a42]">
              Subscription
            </span>
          )
        }
        if (row.original.type === 'onetime') {
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
              One-Time
            </span>
          )
        }
        return null
      },
      size: 120,
      filterFn: (row, id, value) => {
        if (!value || value === 'all') return true
        return row.original.type === value
      },
    }),
    columnHelper.accessor('subscription', {
      header: 'Subscription',
      cell: ({ getValue, row }) => {
        const sub = getValue()
        if (row.original.type === 'subscription') return null
        return sub ? (
          <span className="text-xs text-[#a1a1aa]">{sub}</span>
        ) : null
      },
      filterFn: (row, id, value) => {
        if (!value || value === 'all') return true
        return row.original.subscription === value
      },
    }),
    columnHelper.accessor('orderCount', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-white transition-colors"
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
        <span className="text-white font-semibold">{getValue()}</span>
      ),
      size: 100,
    }),
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: row => row.subRows,
  })

  const typeFilter = columnFilters.find(f => f.id === 'type')?.value as string | undefined
  const subscriptionFilter = columnFilters.find(f => f.id === 'subscription')?.value as string | undefined

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search products, SKUs..."
            className="w-full pl-9 pr-3 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-white placeholder-[#71717a] focus:outline-none focus:border-[#e07a42] transition-colors"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#71717a] pointer-events-none" />
          <select
            value={typeFilter || 'all'}
            onChange={e => {
              const value = e.target.value
              table.getColumn('type')?.setFilterValue(value === 'all' ? undefined : value)
            }}
            className="pl-9 pr-8 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-white focus:outline-none focus:border-[#e07a42] transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="subscription">Subscription</option>
            <option value="onetime">One-Time</option>
          </select>
        </div>

        {/* Subscription Filter */}
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#71717a] pointer-events-none" />
          <select
            value={subscriptionFilter || 'all'}
            onChange={e => {
              const value = e.target.value
              table.getColumn('subscription')?.setFilterValue(value === 'all' ? undefined : value)
            }}
            className="pl-9 pr-8 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-white focus:outline-none focus:border-[#e07a42] transition-colors appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="all">All Subscriptions</option>
            {uniqueSubscriptions.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(globalFilter || typeFilter || subscriptionFilter) && (
          <button
            onClick={() => {
              setGlobalFilter('')
              setColumnFilters([])
            }}
            className="px-3 py-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#71717a] hover:text-white hover:border-[rgba(255,255,255,0.1)] transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {table.getRowModel().rows.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-12 h-12 text-[#71717a] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Products Found</h3>
            <p className="text-[#71717a]">
              {globalFilter || typeFilter || subscriptionFilter
                ? 'Try adjusting your filters'
                : 'Complete the onboarding process to scan and assign products'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.06)]">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider"
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
                <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                  {table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-[rgba(255,255,255,0.02)] border-t border-[rgba(255,255,255,0.06)] text-xs text-[#71717a] flex items-center justify-between">
              <span>
                Showing {table.getRowModel().rows.length} of {table.getCoreRowModel().rows.length} products
              </span>
              <button
                onClick={() => table.toggleAllRowsExpanded()}
                className="text-[#e07a42] hover:text-[#c86a35] transition-colors font-medium"
              >
                {table.getIsAllRowsExpanded() ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// SKU Mapper Tab Component
function SKUMapperTab({
  clientSlug,
  productVariations,
  unknownSkus,
  aliases,
  setUnknownSkus,
  setAliases,
}: {
  clientSlug: string
  productVariations: ProductVariation[]
  unknownSkus: UnknownSku[]
  aliases: ExistingAlias[]
  setUnknownSkus: (skus: UnknownSku[]) => void
  setAliases: (aliases: ExistingAlias[]) => void
}) {
  const [mappingModal, setMappingModal] = useState<{ sku: string; count: number } | null>(null)
  const [sequenceInput, setSequenceInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showIgnored, setShowIgnored] = useState(false)

  // Filter to get truly unmapped products
  const unmappedProducts = useMemo(() => {
    return productVariations.filter(
      v => !v.story_id && v.variation_type === 'subscription'
    )
  }, [productVariations])

  // Get ignored products
  const ignoredProducts = useMemo(() => {
    return productVariations.filter(v => v.variation_type === 'ignored')
  }, [productVariations])

  const handleOpenMapper = (sku: string, count: number) => {
    setMappingModal({ sku, count })
    setSequenceInput('')
    setNameInput('')
    setError('')
  }

  const handleCloseMapper = () => {
    setMappingModal(null)
    setSequenceInput('')
    setNameInput('')
    setError('')
  }

  const handleSubmitMapping = async () => {
    if (!mappingModal) return

    const sequence = parseInt(sequenceInput, 10)
    if (isNaN(sequence) || sequence < 1) {
      setError('Please enter a valid box/episode number (1 or higher)')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/migration/sku-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: [
            {
              sku: mappingModal.sku,
              sequence: sequence,
              name: nameInput.trim() || null,
            },
          ],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save mapping')
      }

      setAliases([...aliases, { sku: mappingModal.sku, sequence, name: nameInput.trim() || null }])
      setUnknownSkus(unknownSkus.filter(u => u.sku !== mappingModal.sku))
      handleCloseMapper()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mapping')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAlias = async (sku: string) => {
    if (!confirm(`Are you sure you want to remove the mapping for "${sku}"?`)) return

    try {
      const response = await fetch('/api/migration/sku-aliases', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete mapping')
      }

      setAliases(aliases.filter(a => a.sku !== sku))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete mapping')
    }
  }

  const handleRestoreIgnored = async (variationId: string) => {
    try {
      const response = await fetch('/api/migration/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variationIds: [variationId],
          variationType: 'subscription',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to restore product')
      }

      // Refresh page to update data
      window.location.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore product')
    }
  }

  return (
    <div className="space-y-8">
      {/* Info Box */}
      <div className="p-4 rounded-xl bg-[#e07a42]/5 border border-[#e07a42]/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#e07a42] mt-0.5" />
          <div>
            <p className="text-white font-medium">About SKU Mapping</p>
            <p className="text-sm text-[#71717a] mt-1">
              This section shows products that haven&apos;t been assigned to subscriptions or marked as one-time purchases.
              SKU aliases help map product names to box numbers for the Forensic Audit.
            </p>
          </div>
        </div>
      </div>

      {/* Unmapped Products Section */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Unmapped Products
          {unmappedProducts.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[#e07a42]">
              ({unmappedProducts.length} need assignment)
            </span>
          )}
        </h2>

        <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          {unmappedProducts.length > 0 ? (
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {unmappedProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{product.product_name}</p>
                      {product.variant_title && (
                        <p className="text-sm text-[#71717a] truncate">{product.variant_title}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {product.sku && (
                          <span className="text-xs font-mono text-[#71717a]">SKU: {product.sku}</span>
                        )}
                        <span className="text-xs text-[#71717a]">
                          {product.order_count} order{product.order_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-[#71717a]">Assign in Products tab</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#5CB87A]/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-[#5CB87A]" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">All Products Assigned</h3>
              <p className="text-[#71717a]">
                Every product has been assigned to a subscription or marked as one-time.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unknown SKUs from Shipments */}
      {unknownSkus.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Unknown SKUs from Shipments
            <span className="ml-2 text-sm font-normal text-amber-500">
              ({unknownSkus.length} need mapping)
            </span>
          </h2>

          <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {unknownSkus.map(({ sku, count }) => (
                <div
                  key={sku}
                  className="p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <div>
                    <p className="text-white font-medium font-mono text-sm">{sku}</p>
                    <p className="text-sm text-[#71717a]">
                      {count} shipment{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenMapper(sku, count)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e07a42]/10 text-[#e07a42] hover:bg-[#e07a42]/20 transition-colors text-sm font-medium"
                  >
                    <Package className="w-4 h-4" />
                    Map to Box #
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Existing Aliases Section */}
      {aliases.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Mapped SKUs
            <span className="ml-2 text-sm font-normal text-[#5CB87A]">
              ({aliases.length} configured)
            </span>
          </h2>

          <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">
                    Box/Episode #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#71717a] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                {aliases
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((alias) => (
                    <tr key={alias.sku} className="hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="px-4 py-3 text-white font-mono text-sm">{alias.sku}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#5CB87A]/10 text-[#5CB87A] font-semibold text-sm">
                          Box {alias.sequence}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#a1a1aa] text-sm">
                        {alias.name || <span className="text-[#52525b]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteAlias(alias.sku)}
                          className="p-2 rounded-lg text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete mapping"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ignored Products Section */}
      {ignoredProducts.length > 0 && (
        <div>
          <button
            onClick={() => setShowIgnored(!showIgnored)}
            className="flex items-center gap-2 text-xl font-semibold text-white mb-4 hover:text-[#e07a42] transition-colors"
          >
            {showIgnored ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
            Ignored Products
            <span className="ml-2 text-sm font-normal text-[#71717a]">
              ({ignoredProducts.length})
            </span>
          </button>

          {showIgnored && (
            <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
              <div className="divide-y divide-[rgba(255,255,255,0.06)]">
                {ignoredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#a1a1aa] font-medium truncate">{product.product_name}</p>
                        {product.variant_title && (
                          <p className="text-sm text-[#71717a] truncate">{product.variant_title}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {product.sku && (
                            <span className="text-xs font-mono text-[#71717a]">SKU: {product.sku}</span>
                          )}
                          <span className="text-xs text-[#71717a]">
                            {product.order_count} order{product.order_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreIgnored(product.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#71717a] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors text-sm font-medium ml-4"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mapping Modal */}
      {mappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseMapper}
          />

          <div className="relative bg-[#1a1a1a] rounded-2xl border border-[rgba(255,255,255,0.1)] p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-2">Map SKU to Box Number</h3>
            <p className="text-sm text-[#71717a] mb-6">
              Which box/episode does this SKU represent?
            </p>

            <div className="mb-4 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#71717a] mb-1">SKU</p>
              <p className="text-white font-mono text-sm break-all">{mappingModal.sku}</p>
              <p className="text-xs text-[#52525b] mt-1">
                Found in {mappingModal.count} shipment{mappingModal.count !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
                Box/Episode Number <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={sequenceInput}
                onChange={(e) => setSequenceInput(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className="w-full px-4 py-3 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#52525b] focus:outline-none focus:border-[#e07a42] focus:ring-1 focus:ring-[#e07a42] transition-colors"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#a1a1aa] mb-2">
                Friendly Name <span className="text-[#52525b]">(optional)</span>
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g., January 2024 Box"
                className="w-full px-4 py-3 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#52525b] focus:outline-none focus:border-[#e07a42] focus:ring-1 focus:ring-[#e07a42] transition-colors"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCloseMapper}
                className="flex-1 px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.05)] text-white font-medium hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitMapping}
                disabled={isSubmitting || !sequenceInput}
                className="flex-1 px-4 py-3 rounded-lg bg-[#e07a42] text-white font-semibold hover:bg-[#c86a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
