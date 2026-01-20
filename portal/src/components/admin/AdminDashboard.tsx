'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Card, TabGroup, TabList, Tab, TabPanels, TabPanel, TextInput, Badge } from '@tremor/react'
import {
  Building2,
  Users,
  Plus,
  ExternalLink,
  CheckCircle2,
  Search,
  LayoutDashboard,
  CreditCard,
  TestTube,
  Trash2,
} from 'lucide-react'
import { Organization, Integration } from '@/lib/supabase/data'

interface AdminDashboardProps {
  organizations: Organization[]
  stats: {
    totalOrgs: number
    liveOrgs: number
    totalSubscribers: number
  }
  adminEmail: string
  integrationsByOrg: Record<string, Integration[]>
}

export default function AdminDashboard({
  organizations,
  stats,
  adminEmail,
  integrationsByOrg,
}: AdminDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [integrationToDelete, setIntegrationToDelete] = useState<{
    orgId: string
    orgName: string
    type: Integration['type']
  } | null>(null)

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-foreground-muted">{adminEmail}</p>
              </div>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-background-surface border-border ring-0" decoration="top" decorationColor="blue">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span className="text-foreground-secondary">Total Organizations</span>
            </div>
            <p className="text-3xl font-semibold text-foreground">{stats.totalOrgs.toLocaleString()}</p>
          </Card>
          <Card className="bg-background-surface border-border ring-0" decoration="top" decorationColor="emerald">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-foreground-secondary">Live</span>
            </div>
            <p className="text-3xl font-semibold text-foreground">{stats.liveOrgs.toLocaleString()}</p>
          </Card>
          <Card className="bg-background-surface border-border ring-0" decoration="top" decorationColor="violet">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-violet-400" />
              <span className="text-foreground-secondary">Total Subscribers</span>
            </div>
            <p className="text-3xl font-semibold text-foreground">{stats.totalSubscribers.toLocaleString()}</p>
          </Card>
        </div>

        {/* Tabs */}
        <TabGroup>
          <TabList className="border-b border-border mb-6">
            <Tab className="text-foreground-secondary data-[selected]:text-foreground data-[selected]:border-accent">
              Overview
            </Tab>
            <Tab className="text-foreground-secondary data-[selected]:text-foreground data-[selected]:border-accent">
              Organizations ({organizations.length})
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <OverviewTab organizations={organizations} />
            </TabPanel>
            <TabPanel>
              <OrganizationsTab
                organizations={filteredOrgs}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onCreateNew={() => setShowCreateModal(true)}
                integrationsByOrg={integrationsByOrg}
                onDeleteIntegration={(orgId, orgName, type) => setIntegrationToDelete({ orgId, orgName, type })}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </main>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrganizationModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Delete Integration Modal */}
      {integrationToDelete && (
        <DeleteIntegrationModal
          orgId={integrationToDelete.orgId}
          orgName={integrationToDelete.orgName}
          integrationType={integrationToDelete.type}
          onClose={() => setIntegrationToDelete(null)}
        />
      )}
    </div>
  )
}

// Overview Tab
function OverviewTab({
  organizations,
}: {
  organizations: Organization[]
}) {
  const recentOrgs = organizations.slice(0, 10)

  return (
    <Card className="bg-background-surface border-border ring-0">
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Organizations</h3>
      <div className="space-y-3">
        {recentOrgs.length === 0 ? (
          <p className="text-foreground-muted">No organizations yet</p>
        ) : (
          recentOrgs.map(org => (
            <div
              key={org.id}
              className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border"
            >
              <div>
                <p className="font-medium text-foreground">{org.name}</p>
                <p className="text-sm text-foreground-muted">{org.slug}</p>
              </div>
              <StatusBadge status={org.status} />
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

// Organizations Tab
function OrganizationsTab({
  organizations,
  searchQuery,
  onSearchChange,
  onCreateNew,
  integrationsByOrg,
  onDeleteIntegration,
}: {
  organizations: Organization[]
  searchQuery: string
  onSearchChange: (query: string) => void
  onCreateNew: () => void
  integrationsByOrg: Record<string, Integration[]>
  onDeleteIntegration: (orgId: string, orgName: string, type: Integration['type']) => void
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (org: Organization) => {
    if (!confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(org.id)

    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: org.id, slug: org.slug }),
      })

      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete organization')
      }
    } catch (error) {
      alert('Failed to delete organization')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <TextInput
          icon={Search}
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-md"
        />
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Organization
        </button>
      </div>

      {/* Organizations Table */}
      <Card className="bg-background-surface border-border ring-0 overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Organization</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Subscription</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Integrations</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Onboarding</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Created</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-foreground-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map(org => (
              <tr key={org.id} className="border-b border-border hover:bg-background-secondary">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-foreground">{org.name}</p>
                    <p className="text-sm text-foreground-muted">{org.slug}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={org.status} />
                </td>
                <td className="px-6 py-4">
                  <SubscriptionBadge
                    status={org.subscription_status}
                    isTestPortal={org.is_test_portal}
                    failedPayments={org.failed_payment_count}
                  />
                </td>
                <td className="px-6 py-4">
                  <IntegrationBadges
                    integrations={integrationsByOrg[org.id] || []}
                    orgId={org.id}
                    orgName={org.name}
                    onDelete={onDeleteIntegration}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${org.step1_complete ? 'bg-emerald-400' : 'bg-foreground-muted/30'}`} />
                    <span className="text-sm text-foreground-tertiary">Step 1</span>
                    <div className={`w-2 h-2 rounded-full ${org.step2_complete ? 'bg-emerald-400' : 'bg-foreground-muted/30'}`} />
                    <span className="text-sm text-foreground-tertiary">Step 2</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-foreground-muted">
                    {new Date(org.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/portal/${org.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-background-elevated transition-colors text-foreground-muted hover:text-foreground"
                      title="View Portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(org)}
                      disabled={deletingId === org.id}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-foreground-muted hover:text-red-400 disabled:opacity-50"
                      title="Delete Organization"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {organizations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-foreground-muted">No organizations found</p>
          </div>
        )}
      </Card>
    </div>
  )
}

// Status Badge Component
function StatusBadge({ status }: { status: Organization['status'] }) {
  const colorMap: Record<Organization['status'], 'blue' | 'violet' | 'amber' | 'orange' | 'pink' | 'emerald'> = {
    Discovery: 'blue',
    Scoping: 'violet',
    Building: 'amber',
    Testing: 'orange',
    Training: 'pink',
    Live: 'emerald',
  }

  return (
    <Badge color={colorMap[status]} size="sm">
      {status}
    </Badge>
  )
}

// Subscription Badge Component
function SubscriptionBadge({
  status,
  isTestPortal,
  failedPayments,
}: {
  status: Organization['subscription_status']
  isTestPortal: boolean | null
  failedPayments: number | null
}) {
  if (isTestPortal) {
    return (
      <Badge color="violet" size="sm">
        Test Portal
      </Badge>
    )
  }

  const statusConfig: Record<string, { color: 'emerald' | 'blue' | 'amber' | 'red' | 'zinc'; label: string }> = {
    active: { color: 'emerald', label: 'Active' },
    trialing: { color: 'blue', label: 'Trial' },
    past_due: { color: 'amber', label: 'Past Due' },
    canceled: { color: 'red', label: 'Canceled' },
    unpaid: { color: 'red', label: 'Unpaid' },
    none: { color: 'zinc', label: 'No Sub' },
  }

  const config = statusConfig[status || 'none'] || statusConfig.none

  return (
    <div className="flex items-center gap-2">
      <Badge color={config.color} size="sm">
        {config.label}
      </Badge>
      {failedPayments && failedPayments > 0 && (
        <span className="text-xs text-red-400">({failedPayments} failed)</span>
      )}
    </div>
  )
}

// Integration Badges Component
function IntegrationBadges({
  integrations,
  orgId,
  orgName,
  onDelete,
}: {
  integrations: Integration[]
  orgId: string
  orgName: string
  onDelete: (orgId: string, orgName: string, type: Integration['type']) => void
}) {
  if (integrations.length === 0) {
    return <span className="text-sm text-foreground-muted">None</span>
  }

  const colorMap: Record<Integration['type'], 'emerald' | 'blue' | 'violet' | 'amber' | 'pink'> = {
    shopify: 'emerald',
    recharge: 'blue',
    klaviyo: 'violet',
    discord: 'amber',
    shipstation: 'pink',
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {integrations.map(integration => (
        <button
          key={integration.type}
          onClick={() => onDelete(orgId, orgName, integration.type)}
          className="group relative"
          title={`Click to delete ${integration.type} integration`}
        >
          <Badge
            color={colorMap[integration.type]}
            size="sm"
            className="cursor-pointer group-hover:opacity-80 transition-opacity"
          >
            {integration.type}
          </Badge>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            ×
          </span>
        </button>
      ))}
    </div>
  )
}

// Delete Integration Modal
function DeleteIntegrationModal({
  orgId,
  orgName,
  integrationType,
  onClose,
}: {
  orgId: string
  orgName: string
  integrationType: Integration['type']
  onClose: () => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Record<string, number> | null>(null)

  const dataWarnings: Record<Integration['type'], string[]> = {
    recharge: [
      'All subscribers with Recharge data will be deleted',
      'Subscription status, prepaid info, and charge dates will be lost',
    ],
    shopify: [
      'All subscribers with Shopify data will be deleted',
      'All shipment records will be deleted',
      'SKU aliases and product mappings will be deleted',
      'Audit logs and migration history will be deleted',
    ],
    shipstation: [
      'Tracking numbers and carrier info will be cleared from shipments',
      'ShipStation order IDs will be removed',
    ],
    klaviyo: [
      'Integration credentials will be removed',
      'Email syncing will stop',
    ],
    discord: [
      'Discord guild connection will be removed',
      'Role mappings will be deleted',
      'Customer Discord connections will be removed',
      'Discord activity logs will be deleted',
    ],
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, integrationType }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data.deleted)
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setError(data.error || 'Failed to delete integration')
        setIsDeleting(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-background-surface border-border ring-0">
        {result ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Integration Deleted</h2>
            <p className="text-foreground-secondary mb-4">
              Successfully deleted {integrationType} integration from {orgName}
            </p>
            <div className="text-sm text-foreground-muted space-y-1">
              {Object.entries(result).map(([key, count]) => (
                <p key={key}>
                  {key}: {count} records
                </p>
              ))}
            </div>
            <p className="text-sm text-foreground-muted mt-4">Refreshing...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Delete Integration</h2>
                <p className="text-sm text-foreground-muted">
                  {integrationType} • {orgName}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <p className="text-sm font-medium text-red-400 mb-2">
                Warning: This action cannot be undone!
              </p>
              <ul className="text-sm text-red-300 space-y-1">
                {dataWarnings[integrationType].map((warning, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-background-secondary text-foreground-tertiary hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Integration'}
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// Create Organization Modal
function CreateOrganizationModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isTestPortal, setIsTestPortal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const res = await fetch('/api/admin/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, isTestPortal, inviteEmail: isTestPortal ? inviteEmail : undefined }),
    })

    const data = await res.json()

    if (res.ok) {
      if (data.invitationSent) {
        alert(`Test portal created! Invitation sent to ${data.inviteEmail}`)
      }
      window.location.reload()
    } else if (res.status === 207) {
      // Partial success - Supabase worked but Clerk failed
      alert(`Warning: ${data.warning}. You may need to manually set up the Clerk organization.`)
      window.location.reload()
    } else {
      setError(data.error || 'Failed to create organization')
      setIsSubmitting(false)
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-background-surface border-border ring-0">
        <h2 className="text-xl font-semibold text-foreground mb-6">Create Organization</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-foreground-secondary mb-2">Organization Name</label>
            <TextInput
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Inc"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-foreground-secondary mb-2">Slug (URL)</label>
            <TextInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-inc"
              required
            />
            <p className="text-xs text-foreground-muted mt-1">
              Portal URL: subscribersync.com/portal/{slug || 'slug'}
            </p>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-background-secondary border border-border hover:border-border-strong transition-colors">
              <input
                type="checkbox"
                checked={isTestPortal}
                onChange={(e) => setIsTestPortal(e.target.checked)}
                className="w-4 h-4 rounded bg-background-elevated border-foreground-muted text-accent focus:ring-accent focus:ring-offset-0"
              />
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4 text-violet-400" />
                <div>
                  <span className="text-sm text-foreground">Create as Test Portal</span>
                  <p className="text-xs text-foreground-muted">Sends invite email to test user</p>
                </div>
              </div>
            </label>
          </div>
          {isTestPortal && (
            <div>
              <label className="block text-sm text-foreground-secondary mb-2">Invite Email Address</label>
              <TextInput
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="testuser@example.com"
                required={isTestPortal}
              />
              <p className="text-xs text-foreground-muted mt-1">
                This email will receive an invitation to join the portal
              </p>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-background-secondary text-foreground-tertiary hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (isTestPortal && !inviteEmail)}
              className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : isTestPortal ? 'Create & Send Invite' : 'Create'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
