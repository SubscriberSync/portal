import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { Boxes, Plus, Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface ProductsPageProps {
  params: { slug: string }
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { orgSlug } = await auth()

  if (orgSlug !== params.slug) {
    notFound()
  }

  const organization = await getOrganizationBySlug(params.slug)
  if (!organization) {
    notFound()
  }

  // Fetch products from Supabase
  const supabase = createServiceClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', organization.id)
    .order('name', { ascending: true })

  // Group by type
  const productsByType = {
    'Main Box': products?.filter(p => p.type === 'Main Box') || [],
    'Sidecar': products?.filter(p => p.type === 'Sidecar') || [],
    'Add-On': products?.filter(p => p.type === 'Add-On') || [],
    'Other': products?.filter(p => !p.type) || [],
  }

  const typeColors = {
    'Main Box': 'bg-[#e07a42]/10 text-[#e07a42] border-[#e07a42]/20',
    'Sidecar': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Add-On': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'Other': 'bg-[#71717a]/10 text-[#71717a] border-[#71717a]/20',
  }

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
          <p className="text-[#71717a]">Manage your product catalog for packing and forecasting</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e07a42] text-white font-medium hover:bg-[#c56a35] transition-colors">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Products Grid */}
      {products && products.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(productsByType).map(([type, typeProducts]) => {
            if (typeProducts.length === 0) return null

            return (
              <div key={type}>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${typeColors[type as keyof typeof typeColors]}`}>
                    {type}
                  </span>
                  <span className="text-[#71717a] font-normal">({typeProducts.length})</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#e07a42]/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-[#e07a42]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{product.name}</h3>
                          {product.sku && (
                            <p className="text-sm text-[#71717a]">SKU: {product.sku}</p>
                          )}
                          {product.box_number && (
                            <p className="text-sm text-[#71717a]">Box #{product.box_number}</p>
                          )}
                        </div>
                      </div>

                      {/* Stock info */}
                      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#71717a]">In Stock</p>
                          <p className="text-lg font-semibold text-white">{product.stock_quantity || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#71717a]">Velocity/mo</p>
                          <p className="text-lg font-semibold text-white">{product.velocity_per_month || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#e07a42]/10 flex items-center justify-center mx-auto mb-4">
            <Boxes className="w-8 h-8 text-[#e07a42]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Products Yet</h3>
          <p className="text-[#71717a] mb-6">Add products to your catalog for packing and inventory forecasting.</p>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e07a42] text-white font-medium hover:bg-[#c56a35] transition-colors">
            <Plus className="w-4 h-4" />
            Add Your First Product
          </button>
        </div>
      )}
    </main>
  )
}
