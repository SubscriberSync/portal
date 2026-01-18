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
  accentColor = 'gold',
  isLoading = false,
  delay = 0,
}: {
  label: string
  value: number
  icon: React.ElementType
  accentColor?: 'gold' | 'success' | 'warning' | 'muted'
  isLoading?: boolean
  delay?: number
}) {
  const colorStyles = {
    gold: {
      icon: 'text-[#C9A962]',
      iconBg: 'bg-[#C9A962]/10',
      value: 'text-[#C9A962]',
      border: 'border-[#C9A962]/10',
    },
    success: {
      icon: 'text-[#5CB87A]',
      iconBg: 'bg-[#5CB87A]/10',
      value: 'text-[#5CB87A]',
      border: 'border-[#5CB87A]/10',
    },
    warning: {
      icon: 'text-[#D4A853]',
      iconBg: 'bg-[#D4A853]/10',
      value: 'text-[#D4A853]',
      border: 'border-[#D4A853]/10',
    },
    muted: {
      icon: 'text-[#6B6660]',
      iconBg: 'bg-[#6B6660]/10',
      value: 'text-[#6B6660]',
      border: 'border-[rgba(245,240,232,0.06)]',
    },
  }

  const colors = colorStyles[accentColor]

  return (
    <div
      className={`relative p-6 rounded-2xl bg-[#151515] border ${colors.border} overflow-hidden animate-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      {/* Top accent line for gold cards */}
      {accentColor === 'gold' && (
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#C9A962]/40 to-transparent" />
      )}

      <div className="relative">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center mb-4`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        {/* Label */}
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6B6660] mb-2">
          {label}
        </p>

        {/* Value */}
        {isLoading ? (
          <div className="h-12 w-24 rounded-lg bg-[#1A1A1A] animate-shimmer" />
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
    <div className="space-y-8">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline text-[#F5F0E8] mb-1">Subscriber Overview</h2>
          <p className="text-sm text-[#6B6660]">Real-time metrics from your subscriber base</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-[#151515] border border-[rgba(245,240,232,0.08)] rounded-xl hover:bg-[#1A1A1A] hover:border-[rgba(245,240,232,0.12)] transition-all"
          >
            <span className="text-sm font-medium text-[#F5F0E8]">{selectedOption?.label}</span>
            <ChevronDown className={`w-4 h-4 text-[#6B6660] transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#151515] rounded-xl shadow-2xl border border-[rgba(245,240,232,0.08)] overflow-hidden z-50 animate-in">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateRange(option.value)
                      setShowDropdown(false)
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      dateRange === option.value
                        ? 'text-[#C9A962] font-medium bg-[#C9A962]/5'
                        : 'text-[#A8A39B] hover:bg-[#1A1A1A] hover:text-[#F5F0E8]'
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
          accentColor="gold"
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

      {/* Summary Bar */}
      <div className="flex items-center justify-center gap-8 py-5 px-6 rounded-2xl bg-[#151515]/50 border border-[rgba(245,240,232,0.04)]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#5CB87A]" />
          <span className="text-sm text-[#A8A39B]">
            <span className="text-[#5CB87A] font-semibold">{activeRate}%</span> active rate
          </span>
        </div>

        <div className="w-px h-4 bg-[rgba(245,240,232,0.08)]" />

        <div className="flex items-center gap-3">
          <div className="relative w-2.5 h-2.5">
            <div className="absolute inset-0 bg-[#C9A962] rounded-full" />
            <div className="absolute inset-0 bg-[#C9A962] rounded-full animate-ping opacity-40" />
          </div>
          <span className="text-sm text-[#A8A39B]">
            Real-time sync
          </span>
        </div>

        {isLoading && (
          <>
            <div className="w-px h-4 bg-[rgba(245,240,232,0.08)]" />
            <span className="text-xs text-[#6B6660] font-medium">Refreshing...</span>
          </>
        )}
      </div>
    </div>
  )
}
