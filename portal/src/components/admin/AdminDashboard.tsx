'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import {
  Building2,
  Users,
  FileCheck,
  AlertCircle,
  Plus,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  LayoutDashboard,
} from 'lucide-react'
import { Organization, IntakeSubmission } from '@/lib/supabase/data'

interface AdminDashboardProps {
  organizations: Organization[]
  intakeSubmissions: (IntakeSubmission & { organization_name?: string })[]
  stats: {
    totalOrgs: number
    liveOrgs: number
    pendingIntake: number
    totalSubscribers: number
  }
  adminEmail: string
}

export default function AdminDashboard({
  organizations,
  intakeSubmissions,
  stats,
  adminEmail,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'intake'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingSubmissions = intakeSubmissions.filter(s => s.status === 'Submitted')

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(245,240,232,0.08)] bg-[#0D0D0D]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e07a42] to-[#c56a35] flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#F5F0E8]">Admin Dashboard</h1>
                <p className="text-sm text-[#6B6660]">{adminEmail}</p>
              </div>
            </div>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Building2}
            label="Total Organizations"
            value={stats.totalOrgs}
            color="blue"
          />
          <StatCard
            icon={CheckCircle2}
            label="Live"
            value={stats.liveOrgs}
            color="green"
          />
          <StatCard
            icon={AlertCircle}
            label="Pending Review"
            value={stats.pendingIntake}
            color="orange"
          />
          <StatCard
            icon={Users}
            label="Total Subscribers"
            value={stats.totalSubscribers}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-[rgba(245,240,232,0.08)]">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabButton>
          <TabButton
            active={activeTab === 'organizations'}
            onClick={() => setActiveTab('organizations')}
          >
            Organizations ({organizations.length})
          </TabButton>
          <TabButton
            active={activeTab === 'intake'}
            onClick={() => setActiveTab('intake')}
          >
            Intake Queue {pendingSubmissions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-[#e07a42] text-white rounded-full">
                {pendingSubmissions.length}
              </span>
            )}
          </TabButton>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            organizations={organizations}
            intakeSubmissions={intakeSubmissions}
          />
        )}

        {activeTab === 'organizations' && (
          <OrganizationsTab
            organizations={filteredOrgs}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCreateNew={() => setShowCreateModal(true)}
          />
        )}

        {activeTab === 'intake' && (
          <IntakeTab intakeSubmissions={intakeSubmissions} />
        )}
      </main>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrganizationModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any
  label: string
  value: number
  color: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
    green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
    orange: 'from-[#e07a42]/20 to-[#e07a42]/10 border-[#e07a42]/20 text-[#e07a42]',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-400',
  }

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${colors[color]} border backdrop-blur-xl`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-5 h-5" />
        <span className="text-sm text-[#A8A39B]">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-[#F5F0E8]">{value.toLocaleString()}</p>
    </div>
  )
}

// Tab Button Component
function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium transition-colors relative ${
        active ? 'text-[#F5F0E8]' : 'text-[#6B6660] hover:text-[#A8A39B]'
      }`}
    >
      {children}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e07a42]" />
      )}
    </button>
  )
}

// Overview Tab
function OverviewTab({
  organizations,
  intakeSubmissions,
}: {
  organizations: Organization[]
  intakeSubmissions: (IntakeSubmission & { organization_name?: string })[]
}) {
  const recentOrgs = organizations.slice(0, 5)
  const recentSubmissions = intakeSubmissions.slice(0, 5)

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Recent Organizations */}
      <div className="p-6 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)]">
        <h3 className="text-lg font-semibold text-[#F5F0E8] mb-4">Recent Organizations</h3>
        <div className="space-y-3">
          {recentOrgs.length === 0 ? (
            <p className="text-sm text-[#6B6660]">No organizations yet</p>
          ) : (
            recentOrgs.map(org => (
              <div
                key={org.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.04)]"
              >
                <div>
                  <p className="font-medium text-[#F5F0E8]">{org.name}</p>
                  <p className="text-sm text-[#6B6660]">{org.slug}</p>
                </div>
                <StatusBadge status={org.status} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="p-6 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)]">
        <h3 className="text-lg font-semibold text-[#F5F0E8] mb-4">Recent Submissions</h3>
        <div className="space-y-3">
          {recentSubmissions.length === 0 ? (
            <p className="text-sm text-[#6B6660]">No submissions yet</p>
          ) : (
            recentSubmissions.map(sub => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.04)]"
              >
                <div>
                  <p className="font-medium text-[#F5F0E8]">{sub.item_type}</p>
                  <p className="text-sm text-[#6B6660]">{sub.organization_name}</p>
                </div>
                <IntakeStatusBadge status={sub.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
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
  return (
    <div>
      {/* Actions Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6660]" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#151515] border border-[rgba(245,240,232,0.08)] text-[#F5F0E8] placeholder-[#6B6660] focus:outline-none focus:border-[#e07a42]/50"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e07a42] hover:bg-[#c56a35] text-white font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Organization
        </button>
      </div>

      {/* Organizations Table */}
      <div className="rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(245,240,232,0.06)]">
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6B6660]">Organization</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6B6660]">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6B6660]">Onboarding</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6B6660]">Created</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-[#6B6660]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map(org => (
              <tr key={org.id} className="border-b border-[rgba(245,240,232,0.04)] hover:bg-[#1A1A1A]">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-[#F5F0E8]">{org.name}</p>
                    <p className="text-sm text-[#6B6660]">{org.slug}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={org.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${org.step1_complete ? 'bg-emerald-400' : 'bg-[#4A4743]'}`} />
                    <span className="text-sm text-[#A8A39B]">Step 1</span>
                    <div className={`w-2 h-2 rounded-full ${org.step2_complete ? 'bg-emerald-400' : 'bg-[#4A4743]'}`} />
                    <span className="text-sm text-[#A8A39B]">Step 2</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#6B6660]">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/portal/${org.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-[#252525] transition-colors text-[#6B6660] hover:text-[#F5F0E8]"
                      title="View Portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {organizations.length === 0 && (
          <div className="text-center py-12 text-[#6B6660]">
            No organizations found
          </div>
        )}
      </div>
    </div>
  )
}

// Intake Tab
function IntakeTab({
  intakeSubmissions,
}: {
  intakeSubmissions: (IntakeSubmission & { organization_name?: string })[]
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const filteredSubmissions = intakeSubmissions.filter(sub => {
    if (filter === 'pending') return sub.status === 'Submitted'
    if (filter === 'approved') return sub.status === 'Approved'
    if (filter === 'rejected') return sub.status === 'Rejected'
    return true
  })

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[#e07a42] text-white'
                : 'bg-[#151515] text-[#6B6660] hover:text-[#A8A39B]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-[#6B6660]">
            No submissions found
          </div>
        ) : (
          filteredSubmissions.map(sub => (
            <IntakeSubmissionCard key={sub.id} submission={sub} />
          ))
        )}
      </div>
    </div>
  )
}

// Intake Submission Card
function IntakeSubmissionCard({
  submission,
}: {
  submission: IntakeSubmission & { organization_name?: string }
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleApprove = async () => {
    const res = await fetch('/api/admin/intake/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.id, status: 'Approved' }),
    })
    if (res.ok) {
      window.location.reload()
    }
  }

  const handleReject = async () => {
    const note = prompt('Rejection reason (optional):')
    const res = await fetch('/api/admin/intake/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.id, status: 'Rejected', rejectionNote: note }),
    })
    if (res.ok) {
      window.location.reload()
    }
  }

  return (
    <div className="p-4 rounded-xl bg-[#151515] border border-[rgba(245,240,232,0.06)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-medium text-[#F5F0E8]">{submission.item_type}</p>
            <p className="text-sm text-[#6B6660]">{submission.organization_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <IntakeStatusBadge status={submission.status} />
          {submission.status === 'Submitted' && (
            <>
              <button
                onClick={handleApprove}
                className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                title="Approve"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleReject}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-[#6B6660] hover:text-[#A8A39B]"
          >
            {isExpanded ? 'Hide' : 'Show'} Value
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 p-3 rounded-lg bg-[#0D0D0D] border border-[rgba(245,240,232,0.04)]">
          <code className="text-sm text-[#A8A39B] break-all">
            {submission.value_encrypted}
          </code>
        </div>
      )}
      {submission.rejection_note && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
          <p className="text-sm text-red-400">
            <strong>Rejection reason:</strong> {submission.rejection_note}
          </p>
        </div>
      )}
      <div className="mt-3 text-xs text-[#4A4743]">
        Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Unknown'}
        {submission.reviewed_at && ` • Reviewed ${new Date(submission.reviewed_at).toLocaleString()}`}
      </div>
    </div>
  )
}

// Status Badge Component
function StatusBadge({ status }: { status: Organization['status'] }) {
  const colors: Record<Organization['status'], string> = {
    Discovery: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Scoping: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Building: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Testing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Training: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    Live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${colors[status]}`}>
      {status}
    </span>
  )
}

// Intake Status Badge Component
function IntakeStatusBadge({ status }: { status: IntakeSubmission['status'] }) {
  const config = {
    Pending: { icon: Clock, color: 'text-[#6B6660]', bg: 'bg-[#252525]' },
    Submitted: { icon: AlertCircle, color: 'text-[#e07a42]', bg: 'bg-[#e07a42]/10' },
    Approved: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    Rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  }

  const { icon: Icon, color, bg } = config[status]

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${color} ${bg}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

// Create Organization Modal
function CreateOrganizationModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const res = await fetch('/api/admin/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    })

    if (res.ok) {
      window.location.reload()
    } else {
      alert('Failed to create organization')
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
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.08)]">
        <h2 className="text-xl font-semibold text-[#F5F0E8] mb-6">Create Organization</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#A8A39B] mb-2">Organization Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Inc"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[#0D0D0D] border border-[rgba(245,240,232,0.08)] text-[#F5F0E8] placeholder-[#6B6660] focus:outline-none focus:border-[#e07a42]/50"
            />
          </div>
          <div>
            <label className="block text-sm text-[#A8A39B] mb-2">Slug (URL)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-inc"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[#0D0D0D] border border-[rgba(245,240,232,0.08)] text-[#F5F0E8] placeholder-[#6B6660] focus:outline-none focus:border-[#e07a42]/50"
            />
            <p className="text-xs text-[#6B6660] mt-1">
              Portal URL: subscribersync.com/portal/{slug || 'slug'}
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#252525] text-[#A8A39B] hover:text-[#F5F0E8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#e07a42] hover:bg-[#c56a35] text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
