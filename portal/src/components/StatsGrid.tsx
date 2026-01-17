'use client'

import { ClientData } from '@/lib/types'

interface StatsGridProps {
  client: ClientData
}

function StatCard({
  label,
  value,
  color = 'default',
}: {
  label: string
  value: number
  color?: 'default' | 'success' | 'warning' | 'muted'
}) {
  const colorClasses = {
    default: 'text-accent',
    success: 'text-success',
    warning: 'text-amber-400',
    muted: 'text-foreground-secondary',
  }

  return (
    <div className="p-6 rounded-2xl bg-background-secondary border border-border">
      <p className="text-sm text-foreground-secondary mb-2">{label}</p>
      <p className={`text-4xl font-semibold font-mono ${colorClasses[color]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

export default function StatsGrid({ client }: StatsGridProps) {
  const activeRate = client.totalSubscribers > 0
    ? Math.round((client.activeSubscribers / client.totalSubscribers) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Subscribers"
          value={client.totalSubscribers}
          color="default"
        />
        <StatCard
          label="Active"
          value={client.activeSubscribers}
          color="success"
        />
        <StatCard
          label="Paused"
          value={client.pausedSubscribers}
          color="warning"
        />
        <StatCard
          label="Cancelled"
          value={client.cancelledSubscribers}
          color="muted"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span>
            <span className="text-success font-medium">{activeRate}%</span> active rate
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <div className="w-2 h-2 rounded-full bg-foreground-tertiary" />
          <span>Real-time sync</span>
        </div>
      </div>
    </div>
  )
}
