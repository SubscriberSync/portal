import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { AlertCircle, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface UnknownSkusPageProps {
  params: Promise<{ slug: string }>
}

export default async function UnknownSkusPage({ params }: UnknownSkusPageProps) {
  const { slug } = await params
  const { orgSlug } = await auth()

  if (orgSlug !== slug) {
    notFound()
  }

  const organization = await getOrganizationBySlug(slug)
  if (!organization) {
    notFound()
  }

  // Fetch shipments with unknown SKUs (product_name that doesn't match any product)
  const supabase = createServiceClient()

  // Get all products for this org
  const { data: products } = await supabase
    .from('products')
    .select('name, sku')
    .eq('organization_id', organization.id)

  const knownProducts = new Set(products?.map(p => p.name) || [])
  const knownSkus = new Set(products?.map(p => p.sku).filter(Boolean) || [])

  // Get shipments and find unknown SKUs
  const { data: shipments } = await supabase
    .from('shipments')
    .select('product_name')
    .eq('organization_id', organization.id)
    .not('product_name', 'is', null)

  // Find unique unknown product names
  const unknownSkus = new Map<string, number>()
  shipments?.forEach(s => {
    if (s.product_name && !knownProducts.has(s.product_name) && !knownSkus.has(s.product_name)) {
      unknownSkus.set(s.product_name, (unknownSkus.get(s.product_name) || 0) + 1)
    }
  })

  const unknownSkusList = Array.from(unknownSkus.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by count descending

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-8 h-8 text-[#e07a42]" />
          <h1 className="text-3xl font-bold text-white">Unknown SKUs</h1>
        </div>
        <p className="text-[#71717a]">Products found in orders that aren&apos;t in your product catalog</p>
      </div>

      {/* Info Box */}
      <div className="mb-8 p-4 rounded-xl bg-[#e07a42]/5 border border-[#e07a42]/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#e07a42] mt-0.5" />
          <div>
            <p className="text-white font-medium">Why does this matter?</p>
            <p className="text-sm text-[#71717a] mt-1">
              Unknown SKUs can cause issues during packing. Add these products to your catalog so pack mode knows how to handle them.
            </p>
          </div>
        </div>
      </div>

      {/* Unknown SKUs List */}
      <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {unknownSkusList.length > 0 ? (
          <div className="divide-y divide-[rgba(255,255,255,0.06)]">
            {unknownSkusList.map(([sku, count]) => (
              <div key={sku} className="p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)]">
                <div>
                  <p className="text-white font-medium">{sku}</p>
                  <p className="text-sm text-[#71717a]">{count} shipment{count !== 1 ? 's' : ''}</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e07a42]/10 text-[#e07a42] hover:bg-[#e07a42]/20 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" />
                  Add to Products
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#5CB87A]/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#5CB87A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">All SKUs Recognized</h3>
            <p className="text-[#71717a]">Every product in your shipments is in your catalog.</p>
          </div>
        )}
      </div>
    </main>
  )
}
