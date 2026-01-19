'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Card, Metric, Text, Flex, Grid, TabGroup, TabList, Tab, TabPanels, TabPanel, TextInput, Badge } from '@tremor/react'
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
import { Organization } from '@/lib/supabase/data'

interface AdminDashboardProps {
  organizations: Organization[]
  stats: {
    totalOrgs: number
    liveOrgs: number
    totalSubscribers: number
  }
  adminEmail: string
}

export default function AdminDashboard({
  organizations,
  stats,
  adminEmail,
}: AdminDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Flex justifyContent="between" alignItems="center">
            <Flex justifyContent="start" alignItems="center" className="gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
                <Text className="text-foreground-muted">{adminEmail}</Text>
              </div>
            </Flex>
            <UserButton afterSignOutUrl="/sign-in" />
          </Flex>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <Grid numItemsSm={1} numItemsMd={3} className="gap-4 mb-8">
          <Card className="bg-background-surface border-border ring-0" decoration="top" decorationColor="blue">
            <Flex justifyContent="start" alignItems="center" className="gap-3 mb-3">
              <Building2 className="w-5 h-5 text-blue-400" />
              <Text className="text-foreground-secondary">Total Organizations</Text>
            </Flex>
            <Metric className="text-foreground">{stats.totalOrgs.toLocaleString()}</Metric>
          </Card>
          <Card className="bg-background-surface border-border ring-0" decoration="top" decorationColor="emerald">
            <Flex justifyContent="start" alignItems="center" className="gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <Text className="text-foreground-secondary">Live</Text>
            </Flex>
            <Metric className="text-foreground">{stats.liveOrgs.toLocaleString()}</Metric>
          </Card>
          <Card className="bg-background-surface border-border ring-0" decoration="top" decorationColor="violet">
            <Flex justifyContent="start" alignItems="center" className="gap-3 mb-3">
              <Users className="w-5 h-5 text-violet-400" />
              <Text className="text-foreground-secondary">Total Subscribers</Text>
            </Flex>
            <Metric className="text-foreground">{stats.totalSubscribers.toLocaleString()}</Metric>
          </Card>
        </Grid>

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
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </main>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrganizationModal onClose={() => setShowCreateModal(false)} />
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
          <Text className="text-foreground-muted">No organizations yet</Text>
        ) : (
          recentOrgs.map(org => (
            <div
              key={org.id}
              className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border"
            >
              <div>
                <Text className="font-medium text-foreground">{org.name}</Text>
                <Text className="text-foreground-muted">{org.slug}</Text>
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
}: {
  organizations: Organization[]
  searchQuery: string
  onSearchChange: (query: string) => void
  onCreateNew: () => void
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
      <Flex justifyContent="between" alignItems="center" className="mb-6 gap-4">
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
      </Flex>

      {/* Organizations Table */}
      <Card className="bg-background-surface border-border ring-0 overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Organization</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-foreground-muted">Subscription</th>
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
                    <Text className="font-medium text-foreground">{org.name}</Text>
                    <Text className="text-foreground-muted">{org.slug}</Text>
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
                  <Flex justifyContent="start" alignItems="center" className="gap-2">
                    <div className={`w-2 h-2 rounded-full ${org.step1_complete ? 'bg-emerald-400' : 'bg-foreground-muted/30'}`} />
                    <Text className="text-foreground-tertiary">Step 1</Text>
                    <div className={`w-2 h-2 rounded-full ${org.step2_complete ? 'bg-emerald-400' : 'bg-foreground-muted/30'}`} />
                    <Text className="text-foreground-tertiary">Step 2</Text>
                  </Flex>
                </td>
                <td className="px-6 py-4">
                  <Text className="text-foreground-muted">
                    {new Date(org.created_at).toLocaleDateString()}
                  </Text>
                </td>
                <td className="px-6 py-4">
                  <Flex justifyContent="end" alignItems="center" className="gap-2">
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
                  </Flex>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {organizations.length === 0 && (
          <div className="text-center py-12">
            <Text className="text-foreground-muted">No organizations found</Text>
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
      <Badge color="violet" size="sm" icon={TestTube}>
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
    <Flex justifyContent="start" alignItems="center" className="gap-2">
      <Badge color={config.color} size="sm" icon={CreditCard}>
        {config.label}
      </Badge>
      {failedPayments && failedPayments > 0 && (
        <Text className="text-xs text-red-400">({failedPayments} failed)</Text>
      )}
    </Flex>
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
            <Text className="text-foreground-secondary mb-2">Organization Name</Text>
            <TextInput
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Inc"
              required
            />
          </div>
          <div>
            <Text className="text-foreground-secondary mb-2">Slug (URL)</Text>
            <TextInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-inc"
              required
            />
            <Text className="text-foreground-muted text-xs mt-1">
              Portal URL: subscribersync.com/portal/{slug || 'slug'}
            </Text>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-background-secondary border border-border hover:border-border-strong transition-colors">
              <input
                type="checkbox"
                checked={isTestPortal}
                onChange={(e) => setIsTestPortal(e.target.checked)}
                className="w-4 h-4 rounded bg-background-elevated border-foreground-muted text-accent focus:ring-accent focus:ring-offset-0"
              />
              <Flex justifyContent="start" alignItems="center" className="gap-2">
                <TestTube className="w-4 h-4 text-violet-400" />
                <div>
                  <Text className="text-foreground">Create as Test Portal</Text>
                  <Text className="text-foreground-muted text-xs">Sends invite email to test user</Text>
                </div>
              </Flex>
            </label>
          </div>
          {isTestPortal && (
            <div>
              <Text className="text-foreground-secondary mb-2">Invite Email Address</Text>
              <TextInput
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="testuser@example.com"
                required={isTestPortal}
              />
              <Text className="text-foreground-muted text-xs mt-1">
                This email will receive an invitation to join the portal
              </Text>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <Text className="text-red-400">{error}</Text>
            </div>
          )}
          <Flex justifyContent="end" className="gap-3 pt-4">
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
          </Flex>
        </form>
      </Card>
    </div>
  )
}
