'use client'

import { useState } from 'react'
import { Boxes, Package, AlertCircle } from 'lucide-react'

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

type TabType = 'products' | 'sku-mapper'

export default function ProductsClient({
  clientSlug,
  productVariations,
  unknownSkus: initialUnknownSkus,
  existingAliases: initialAliases,
}: ProductsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('products')
  const [unknownSkus, setUnknownSkus] = useState(initialUnknownSkus)
  const [aliases, setAliases] = useState(initialAliases)

  // Group products by story
  const assignedProducts = productVariations.filter(p => p.story && p.variation_type === 'subscription')
  const productsByStory = assignedProducts.reduce((acc, product) => {
    const storyName = product.story?.name || 'Unknown'
    if (!acc[storyName]) {
      acc[storyName] = []
    }
    acc[storyName].push(product)
    return acc
  }, {} as Record<string, ProductVariation[]>)

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
                {assignedProducts.length}
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
        <div>
          {assignedProducts.length > 0 ? (
            <div className="space-y-8">
              {Object.entries(productsByStory).map(([storyName, products]) => (
                <div key={storyName}>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs bg-[#e07a42]/10 text-[#e07a42] border border-[#e07a42]/20">
                      {storyName}
                    </span>
                    <span className="text-[#71717a] font-normal">({products.length})</span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#e07a42]/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-[#e07a42]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">{product.product_name}</h3>
                            {product.variant_title && (
                              <p className="text-sm text-[#71717a] truncate">{product.variant_title}</p>
                            )}
                            {product.sku && (
                              <p className="text-xs text-[#71717a] font-mono">SKU: {product.sku}</p>
                            )}
                            {product.tier && (
                              <p className="text-xs text-[#5CB87A] mt-1">Tier: {product.tier.name}</p>
                            )}
                          </div>
                        </div>

                        {/* Order count */}
                        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                          <p className="text-xs text-[#71717a]">Orders</p>
                          <p className="text-lg font-semibold text-white">{product.order_count || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#e07a42]/10 flex items-center justify-center mx-auto mb-4">
                <Boxes className="w-8 h-8 text-[#e07a42]" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Products Assigned</h3>
              <p className="text-[#71717a] mb-6">
                Complete the onboarding process to scan and assign products to your subscription stories.
              </p>
            </div>
          )}
        </div>
      ) : (
        <SKUMapperTab
          clientSlug={clientSlug}
          unknownSkus={unknownSkus}
          aliases={aliases}
          setUnknownSkus={setUnknownSkus}
          setAliases={setAliases}
        />
      )}
    </main>
  )
}

// SKU Mapper Tab Component (extracted from UnknownSkusClient)
function SKUMapperTab({
  clientSlug,
  unknownSkus,
  aliases,
  setUnknownSkus,
  setAliases,
}: {
  clientSlug: string
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

      // Update local state
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

      // Update local state
      setAliases(aliases.filter(a => a.sku !== sku))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete mapping')
    }
  }

  return (
    <div className="space-y-8">
      {/* Info Box */}
      <div className="p-4 rounded-xl bg-[#e07a42]/5 border border-[#e07a42]/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#e07a42] mt-0.5" />
          <div>
            <p className="text-white font-medium">Why map SKUs?</p>
            <p className="text-sm text-[#71717a] mt-1">
              SKU mapping tells the system which box number each product represents. This is essential for the Forensic Audit to correctly determine a subscriber&apos;s box history.
            </p>
          </div>
        </div>
      </div>

      {/* Unknown SKUs Section */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Unmapped SKUs
          {unknownSkus.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[#e07a42]">
              ({unknownSkus.length} need mapping)
            </span>
          )}
        </h2>

        <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          {unknownSkus.length > 0 ? (
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
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#5CB87A]/10 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-[#5CB87A]" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">All SKUs Mapped</h3>
              <p className="text-[#71717a]">
                Every product SKU in your shipments has been mapped to a box number.
              </p>
            </div>
          )}
        </div>
      </div>

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

      {/* Mapping Modal */}
      {mappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseMapper}
          />

          {/* Modal */}
          <div className="relative bg-[#1a1a1a] rounded-2xl border border-[rgba(255,255,255,0.1)] p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-2">Map SKU to Box Number</h3>
            <p className="text-sm text-[#71717a] mb-6">
              Which box/episode does this SKU represent?
            </p>

            {/* SKU Display */}
            <div className="mb-4 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#71717a] mb-1">SKU</p>
              <p className="text-white font-mono text-sm break-all">{mappingModal.sku}</p>
              <p className="text-xs text-[#52525b] mt-1">
                Found in {mappingModal.count} shipment{mappingModal.count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Sequence Input */}
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

            {/* Name Input (optional) */}
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

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
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
