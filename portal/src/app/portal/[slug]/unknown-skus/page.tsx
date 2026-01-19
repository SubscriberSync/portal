import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import { AlertCircle } from 'lucide-react'
import UnknownSkusClient from './UnknownSkusClient'

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

  const supabase = createServiceClient()

  // Get all products for this org
  const { data: products } = await supabase
    .from('products')
    .select('name, sku')
    .eq('organization_id', organization.id)

  const knownProducts = new Set(products?.map(p => p.name) || [])
  const knownSkus = new Set(products?.map(p => p.sku).filter(Boolean) || [])

  // Get existing SKU aliases
  const { data: existingAliases } = await supabase
    .from('sku_aliases')
    .select('shopify_sku, product_sequence_id, product_name')
    .eq('organization_id', organization.id)

  const aliasedSkus = new Set(existingAliases?.map(a => a.shopify_sku) || [])

  // Get shipments and find unknown SKUs
  const { data: shipments } = await supabase
    .from('shipments')
    .select('product_name')
    .eq('organization_id', organization.id)
    .not('product_name', 'is', null)

  // Find unique unknown product names (not in products table AND not already aliased)
  const unknownSkus = new Map<string, number>()
  shipments?.forEach(s => {
    if (
      s.product_name &&
      !knownProducts.has(s.product_name) &&
      !knownSkus.has(s.product_name) &&
      !aliasedSkus.has(s.product_name)
    ) {
      unknownSkus.set(s.product_name, (unknownSkus.get(s.product_name) || 0) + 1)
    }
  })

  const unknownSkusList = Array.from(unknownSkus.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([sku, count]) => ({ sku, count }))

  // Get existing aliases for display
  const existingAliasesList = existingAliases?.map(a => ({
    sku: a.shopify_sku,
    sequence: a.product_sequence_id,
    name: a.product_name,
  })) || []

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-8 h-8 text-[#e07a42]" />
          <h1 className="text-3xl font-bold text-white">SKU Mapper</h1>
        </div>
        <p className="text-[#71717a]">Map product SKUs to box/episode sequence numbers for accurate pack mode</p>
      </div>

      {/* Info Box */}
      <div className="mb-8 p-4 rounded-xl bg-[#e07a42]/5 border border-[#e07a42]/10">
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

      <UnknownSkusClient
        clientSlug={slug}
        unknownSkus={unknownSkusList}
        existingAliases={existingAliasesList}
      />
    </main>
  )
}
