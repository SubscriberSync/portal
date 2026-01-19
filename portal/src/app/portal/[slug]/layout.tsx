import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { getOrganizationBySlug, upsertOrganization } from '@/lib/supabase/data'
import { checkPortalAccess } from '@/lib/subscription'
import PortalSidebar from '@/components/PortalSidebar'
import SubscriptionBlockedPage from '@/components/SubscriptionBlockedPage'
import SubscriptionWarningBanner from '@/components/SubscriptionWarningBanner'

interface PortalLayoutProps {
  children: React.ReactNode
  params: { slug: string }
}

export default async function PortalLayout({ children, params }: PortalLayoutProps) {
  const { orgId, orgSlug } = await auth()

  // Verify the user has access to this organization
  if (orgSlug !== params.slug) {
    notFound()
  }

  // Get or create organization in Supabase
  let organization = await getOrganizationBySlug(params.slug)

  if (!organization && orgId) {
    organization = await upsertOrganization({
      id: orgId,
      name: params.slug,
      slug: params.slug,
      status: 'Building',
    })
  }

  if (!organization) {
    notFound()
  }

  // Check subscription status
  const accessResult = checkPortalAccess(organization)

  // If access is blocked, show the blocked page
  if (!accessResult.allowed && accessResult.reason) {
    return (
      <SubscriptionBlockedPage
        reason={accessResult.reason}
        organization={organization}
        canManageBilling={accessResult.canManageBilling}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      {/* Sidebar */}
      <PortalSidebar
        clientSlug={params.slug}
        company={organization.name}
        logoUrl={organization.logo_url || undefined}
        status={organization.status}
      />

      {/* Main Content - offset by sidebar width */}
      <div className="ml-64 min-h-screen transition-all duration-300">
        {/* Show warning banner if subscription has issues but still allowing access */}
        {accessResult.showWarning && accessResult.warningMessage && (
          <SubscriptionWarningBanner message={accessResult.warningMessage} />
        )}
        {children}
      </div>
    </div>
  )
}
