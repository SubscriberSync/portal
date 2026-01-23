import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface UnknownSkusPageProps {
  params: Promise<{ slug: string }>
}

// This page has been merged into the Products page
// Redirect to Products page (SKU Mapper is now a tab there)
export default async function UnknownSkusPage({ params }: UnknownSkusPageProps) {
  const { slug } = await params
  redirect(`/portal/${slug}/products`)
}
