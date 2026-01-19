'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, TrendingUp, Users, Pause, XCircle } from 'lucide-react'

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
  icon: Icon,
  accentColor = 'orange',
  isLoading = false,
  delay = 0,
}: {
  label: string
  value: number
  icon: React.ElementType
  accentColor?: 'orange' | 'success' | 'warning' | 'muted'
  isLoading?: boolean
  delay?: number
}) {
  const colorStyles = {
    orange: {
      icon: 'text-[#e07a42]',
      iconBg: 'bg-[rgba(224,122,66,0.1)]',
      value: 'text-[#e07a42]',
      hasAccentLine: true,
    },
    success: {
      icon: 'text-[#e07a42]',
      iconBg: 'bg-[rgba(224,122,66,0.1)]',
      value: 'text-[#e07a42]',
      hasAccentLine: false,
    },
    warning: {
      icon: 'text-[#fbbf24]',
      iconBg: 'bg-[rgba(251,191,36,0.1)]',
      value: 'text-[#fbbf24]',
      hasAccentLine: false,
    },
    muted: {
      icon: 'text-[#71717a]',
      iconBg: 'bg-[rgba(255,255,255,0.03)]',
      value: 'text-[#71717a]',
      hasAccentLine: false,
    },
  }

  const colors = colorStyles[accentColor]

  return (
    <div
      className="relative p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] overflow-hidden animate-in shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top accent line for primary cards */}
      {colors.hasAccentLine && (
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#e07a42]/50 to-transparent" />
      )}

      <div className="relative">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center mb-4 backdrop-blur-sm`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        {/* Label */}
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#71717a] mb-2">
          {label}
        </p>

        {/* Value */}
        {isLoading ? (
          <div className="h-12 w-24 rounded-lg bg-[rgba(255,255,255,0.03)] animate-shimmer" />
        ) : (
          <p className={`text-4xl font-semibold font-mono tracking-tight ${colors.value}`}>
            {value.toLocaleString()}
          </p>
        )}
      </div>
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
        const res = await fetch('/api/subscribers/stats')
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
    <div className="space-y-8">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline text-white mb-1">Subscriber Overview</h2>
          <p className="text-sm text-[#71717a]">Real-time metrics from your subscriber base</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-xl hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all"
          >
            <span className="text-sm font-medium text-white">{selectedOption?.label}</span>
            <ChevronDown className={`w-4 h-4 text-[#71717a] transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl rounded-xl shadow-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden z-50 animate-in">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateRange(option.value)
                      setShowDropdown(false)
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      dateRange === option.value
                        ? 'text-[#e07a42] font-medium bg-[rgba(224,122,66,0.1)]'
                        : 'text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.03)] hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Subscribers"
          value={stats?.total ?? 0}
          icon={Users}
          accentColor="orange"
          isLoading={isLoading}
          delay={0}
        />
        <StatCard
          label="Active"
          value={stats?.active ?? 0}
          icon={TrendingUp}
          accentColor="success"
          isLoading={isLoading}
          delay={80}
        />
        <StatCard
          label="Paused"
          value={stats?.paused ?? 0}
          icon={Pause}
          accentColor="warning"
          isLoading={isLoading}
          delay={160}
        />
        <StatCard
          label="Cancelled"
          value={stats?.cancelled ?? 0}
          icon={XCircle}
          accentColor="muted"
          isLoading={isLoading}
          delay={240}
        />
      </div>

      {/* Summary Bar - Glass */}
      <div className="flex items-center justify-center gap-8 py-5 px-6 rounded-2xl bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#e07a42]" />
          <span className="text-sm text-[#a1a1aa]">
            <span className="text-[#e07a42] font-semibold">{activeRate}%</span> active rate
          </span>
        </div>

        <div className="w-px h-4 bg-[rgba(255,255,255,0.08)]" />

        <div className="flex items-center gap-3">
          <div className="relative w-2.5 h-2.5">
            <div className="absolute inset-0 bg-[#e07a42] rounded-full" />
            <div className="absolute inset-0 bg-[#e07a42] rounded-full animate-ping opacity-40" />
          </div>
          <span className="text-sm text-[#a1a1aa]">
            Real-time sync
          </span>
        </div>

        {isLoading && (
          <>
            <div className="w-px h-4 bg-[rgba(255,255,255,0.08)]" />
            <span className="text-xs text-[#71717a] font-medium">Refreshing...</span>
          </>
        )}
      </div>
    </div>
  )
}
