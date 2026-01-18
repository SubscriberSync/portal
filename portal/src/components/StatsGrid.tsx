'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface StatsGridProps {
  clientSlug: string
}

interface SubscriberStats {
  total: number
  active: number
  paused: number
  cancelled: number
}

type DateRange = '30' | '60' | '90' | 'all'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '30', label: 'Last 30 Days' },
  { value: '60', label: 'Last 60 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
]

function StatCard({
  label,
  value,
  color = 'default',
  isLoading = false,
}: {
  label: string
  value: number
  color?: 'default' | 'success' | 'warning' | 'muted'
  isLoading?: boolean
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
      {isLoading ? (
        <div className="h-10 w-20 bg-background-elevated rounded animate-pulse" />
      ) : (
        <p className={`text-4xl font-semibold font-mono ${colorClasses[color]}`}>
          {value.toLocaleString()}
        </p>
      )}
    </div>
  )
}

export default function StatsGrid({ clientSlug }: StatsGridProps) {
  const [stats, setStats] = useState<SubscriberStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true)
      try {
        const url = `https://n8n.everlorehollow.com/webhook/backstage/${clientSlug}/subscribers/stats${dateRange !== 'all' ? `?days=${dateRange}` : ''}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setStats({
            total: data.total || 0,
            active: data.active || 0,
            paused: data.paused || 0,
            cancelled: data.cancelled || 0,
          })
        }
      } catch (err) {
        console.error('Failed to fetch subscriber stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [clientSlug, dateRange])

  const activeRate = stats && stats.total > 0
    ? Math.round((stats.active / stats.total) * 100)
    : 0

  const selectedOption = DATE_RANGE_OPTIONS.find(opt => opt.value === dateRange)

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-background-secondary border border-border rounded-xl hover:bg-background-elevated transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{selectedOption?.label}</span>
            <ChevronDown className={`w-4 h-4 text-foreground-tertiary transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateRange(option.value)
                      setShowDropdown(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-background-elevated transition-colors ${
                      dateRange === option.value
                        ? 'text-accent font-medium bg-accent/5'
                        : 'text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {isLoading && (
          <span className="text-xs text-foreground-tertiary">Updating...</span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Subscribers"
          value={stats?.total ?? 0}
          color="default"
          isLoading={isLoading}
        />
        <StatCard
          label="Active"
          value={stats?.active ?? 0}
          color="success"
          isLoading={isLoading}
        />
        <StatCard
          label="Paused"
          value={stats?.paused ?? 0}
          color="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Cancelled"
          value={stats?.cancelled ?? 0}
          color="muted"
          isLoading={isLoading}
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
