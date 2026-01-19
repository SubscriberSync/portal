'use client'

import { useState, useEffect } from 'react'
import { Card, Metric, Text, Flex, Grid, Select, SelectItem } from '@tremor/react'
import { ChevronDown, TrendingUp, Users, Pause, XCircle, Loader2 } from 'lucide-react'

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
  color = 'orange',
  isLoading = false,
  showDecoration = false,
}: {
  label: string
  value: number
  icon: React.ElementType
  color?: 'orange' | 'amber' | 'zinc'
  isLoading?: boolean
  showDecoration?: boolean
}) {
  const colorMap = {
    orange: { icon: 'text-accent', bg: 'bg-accent/10', metric: 'text-accent' },
    amber: { icon: 'text-yellow-400', bg: 'bg-yellow-400/10', metric: 'text-yellow-400' },
    zinc: { icon: 'text-foreground-muted', bg: 'bg-foreground-muted/10', metric: 'text-foreground-muted' },
  }
  const colors = colorMap[color]

  return (
    <Card 
      className="bg-background-surface border-border ring-0"
      decoration={showDecoration ? 'top' : undefined}
      decorationColor={showDecoration ? 'orange' : undefined}
    >
      <Flex justifyContent="start" alignItems="center" className="gap-4 mb-4">
        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        <Text className="text-foreground-muted text-xs font-semibold tracking-wider uppercase">
          {label}
        </Text>
      </Flex>
      {isLoading ? (
        <div className="h-10 w-24 rounded-lg bg-background-elevated animate-pulse" />
      ) : (
        <Metric className={`font-mono ${colors.metric}`}>
          {value.toLocaleString()}
        </Metric>
      )}
    </Card>
  )
}

export default function StatsGrid({ clientSlug }: StatsGridProps) {
  const [stats, setStats] = useState<SubscriberStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30')

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

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <Flex justifyContent="between" alignItems="center">
        <div>
          <Text className="text-xl font-semibold text-foreground mb-1">Subscriber Overview</Text>
          <Text className="text-foreground-muted">Real-time metrics from your subscriber base</Text>
        </div>

        <Select
          value={dateRange}
          onValueChange={(value) => setDateRange(value as DateRange)}
          className="w-40"
        >
          {DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
      </Flex>

      {/* Stats Grid */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <StatCard
          label="Total Subscribers"
          value={stats?.total ?? 0}
          icon={Users}
          color="orange"
          isLoading={isLoading}
          showDecoration={true}
        />
        <StatCard
          label="Active"
          value={stats?.active ?? 0}
          icon={TrendingUp}
          color="orange"
          isLoading={isLoading}
        />
        <StatCard
          label="Paused"
          value={stats?.paused ?? 0}
          icon={Pause}
          color="amber"
          isLoading={isLoading}
        />
        <StatCard
          label="Cancelled"
          value={stats?.cancelled ?? 0}
          icon={XCircle}
          color="zinc"
          isLoading={isLoading}
        />
      </Grid>

      {/* Summary Bar */}
      <Card className="bg-background-secondary border-border ring-0">
        <Flex justifyContent="center" alignItems="center" className="gap-8">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            <Text className="text-foreground-tertiary">
              <span className="text-accent font-semibold">{activeRate}%</span> active rate
            </Text>
          </div>

          <div className="w-px h-4 bg-border" />

          <div className="flex items-center gap-3">
            <div className="relative w-2.5 h-2.5">
              <div className="absolute inset-0 bg-accent rounded-full" />
              <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-40" />
            </div>
            <Text className="text-foreground-tertiary">Real-time sync</Text>
          </div>

          {isLoading && (
            <>
              <div className="w-px h-4 bg-border" />
              <Flex justifyContent="start" alignItems="center" className="gap-2">
                <Loader2 className="w-3 h-3 text-foreground-muted animate-spin" />
                <Text className="text-foreground-muted text-xs">Refreshing...</Text>
              </Flex>
            </>
          )}
        </Flex>
      </Card>
    </div>
  )
}
