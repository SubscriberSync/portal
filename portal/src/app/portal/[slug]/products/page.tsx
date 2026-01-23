import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug } from '@/lib/supabase/data'
import { createServiceClient } from '@/lib/supabase/service'
import ProductsClient from './ProductsClient'

export const dynamic = 'force-dynamic'

interface ProductsPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductsPage({ params }: ProductsPageProps) {
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

  // Fetch product variations with their story and tier relationships
  const { data: productVariations } = await supabase
    .from('product_variations')
    .select(`
      *,
      story:stories(id, name, slug),
      tier:story_tiers(id, name)
    `)
    .eq('organization_id', organization.id)
    .order('product_name', { ascending: true })

  // Fetch existing SKU aliases
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

  // Find unique unknown product names
  const knownProducts = new Set(productVariations?.filter(pv => pv.story_id).map(p => p.product_name) || [])
  const knownSkus = new Set(productVariations?.filter(pv => pv.story_id).map(p => p.sku).filter(Boolean) || [])

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

  const existingAliasesList = existingAliases?.map(a => ({
    sku: a.shopify_sku,
    sequence: a.product_sequence_id,
    name: a.product_name,
  })) || []

  return (
    <ProductsClient
      clientSlug={slug}
      productVariations={productVariations || []}
      unknownSkus={unknownSkusList}
      existingAliases={existingAliasesList}
    />
  )
}
