'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Badge, Select, SelectItem, BarChart } from '@tremor/react';
import {
  Users,
  UserCheck,
  UserX,
  Pause,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Loader2,
} from 'lucide-react';
import { SubscriberSearch } from '@/components/backstage/SubscriberSearch';

interface SubscriberMetrics {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  expired: number;
  at_risk: number;
  new_this_month: number;
  churned_this_month: number;
  by_episode: { episode: number; count: number }[];
  by_tenure: { months: number; count: number }[];
  products: string[];
}

interface RecentActivity {
  id: string;
  subscriberId: string;
  subscriberName: string;
  action: 'subscribed' | 'paused' | 'cancelled' | 'reactivated' | 'skipped';
  timestamp: string;
}

type ViewMode = 'episode' | 'tenure';

export default function SubscribersPage() {
  const router = useRouter();
  const params = useParams();
  const clientSlug = params.slug as string;

  const [metrics, setMetrics] = useState<SubscriberMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('episode');

  // Fetch metrics when SKU filter changes
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const skuParam = selectedSku === 'all' ? '' : `?sku=${encodeURIComponent(selectedSku)}`;
        const [metricsRes, activityRes] = await Promise.all([
          fetch(`/api/subscribers/metrics${skuParam}`),
          fetch('/api/subscribers/activity'),
        ]);

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        }

        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setRecentActivity(activityData.activities || []);
        }
      } catch (err) {
        console.error('Failed to fetch subscriber data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedSku]);

  // Determine if this is a sequential product (has multiple episodes)
  const isSequentialProduct = useMemo(() => {
    if (!metrics?.by_episode || metrics.by_episode.length === 0) return false;
    const maxEpisode = Math.max(...metrics.by_episode.map(e => e.episode));
    return maxEpisode > 1;
  }, [metrics]);

  // Auto-select view mode based on product type
  useEffect(() => {
    if (metrics) {
      setViewMode(isSequentialProduct ? 'episode' : 'tenure');
    }
  }, [isSequentialProduct, metrics]);

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!metrics) return [];

    if (viewMode === 'episode') {
      return metrics.by_episode.map(e => ({
        name: `Ep ${e.episode}`,
        Subscribers: e.count,
      }));
    } else {
      return metrics.by_tenure.map(t => ({
        name: `${t.months}mo`,
        Subscribers: t.count,
      }));
    }
  }, [metrics, viewMode]);

  const handleSelect = (subscriberId: string) => {
    router.push(`/portal/${clientSlug}/subscribers/${subscriberId}`);
  };

  const netChange = metrics ? metrics.new_this_month - metrics.churned_this_month : 0;

  return (
    <main className="min-h-screen p-8">
      <div className="space-y-6">
        {/* Header with Product Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Subscribers</h1>
            <p className="text-foreground-secondary">
              Your subscriber metrics hub
            </p>
          </div>

          {/* Product Filter */}
          {metrics && metrics.products.length > 0 && (
            <Select
              value={selectedSku}
              onValueChange={setSelectedSku}
              className="w-48"
            >
              <SelectItem value="all">All Products</SelectItem>
              {metrics.products.map((product) => (
                <SelectItem key={product} value={product}>
                  {product}
                </SelectItem>
              ))}
            </Select>
          )}
        </div>

        {/* Stats Cards Row */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-background-surface border-border ring-0">
                <div className="h-4 bg-background-elevated rounded w-1/2 mb-3 animate-pulse" />
                <div className="h-8 bg-background-elevated rounded w-1/3 animate-pulse" />
              </Card>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-background-surface border-border ring-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm text-foreground-secondary">Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.total.toLocaleString()}</p>
            </Card>
            <Card className="bg-background-surface border-border ring-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-sm text-foreground-secondary">Active</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.active.toLocaleString()}</p>
            </Card>
            <Card className="bg-background-surface border-border ring-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Pause className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-sm text-foreground-secondary">Paused</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.paused.toLocaleString()}</p>
            </Card>
            <Card className="bg-background-surface border-border ring-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-sm text-foreground-secondary">At Risk</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.at_risk.toLocaleString()}</p>
            </Card>
            <Card className="bg-background-surface border-border ring-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-sm text-foreground-secondary">Churned</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.churned_this_month.toLocaleString()}</p>
              <p className="text-xs text-foreground-tertiary">this month</p>
            </Card>
          </div>
        ) : null}

        {/* Two Column Analytics Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Distribution Chart (2/3 width) */}
          <Card className="lg:col-span-2 bg-background-surface border-border ring-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  {viewMode === 'episode' ? (
                    <BarChart3 className="w-5 h-5 text-accent" />
                  ) : (
                    <Clock className="w-5 h-5 text-accent" />
                  )}
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {viewMode === 'episode' ? 'Episode Distribution' : 'Subscriber Tenure'}
                </h2>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('episode')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    viewMode === 'episode'
                      ? 'bg-accent text-white'
                      : 'text-foreground-secondary hover:bg-background-elevated'
                  }`}
                >
                  Episode
                </button>
                <button
                  onClick={() => setViewMode('tenure')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    viewMode === 'tenure'
                      ? 'bg-accent text-white'
                      : 'text-foreground-secondary hover:bg-background-elevated'
                  }`}
                >
                  Tenure
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <span className="text-sm text-foreground-muted">Loading metrics...</span>
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <BarChart
                className="h-[300px]"
                data={chartData}
                index="name"
                categories={['Subscribers']}
                colors={['orange']}
                showLegend={false}
                showGridLines={false}
                yAxisWidth={40}
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <span className="text-foreground-muted">
                  {viewMode === 'episode'
                    ? 'No episode data available'
                    : 'No tenure data available'}
                </span>
              </div>
            )}

            {/* Distribution Summary */}
            {chartData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-foreground-secondary">
                  {viewMode === 'episode' ? (
                    <>
                      Showing active subscribers across {chartData.length} episodes.
                      {metrics && metrics.active > 0 && (
                        <span className="text-foreground ml-1">
                          Avg {Math.round(metrics.active / chartData.length)} per episode.
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Subscriber retention across tenure milestones (1, 3, 6, 12, 18, 24+ months).
                    </>
                  )}
                </p>
              </div>
            )}
          </Card>

          {/* This Month Summary (1/3 width) */}
          {metrics && (
            <Card className="bg-background-surface border-border ring-0">
              <h2 className="text-lg font-semibold text-foreground mb-4">This Month</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-foreground-secondary">New Subscribers</span>
                  </div>
                  <Badge color="emerald" size="lg">+{metrics.new_this_month}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-foreground-secondary">Churned</span>
                  </div>
                  <Badge color="red" size="lg">-{metrics.churned_this_month}</Badge>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground-secondary">Net Change</span>
                    <Badge
                      color={netChange >= 0 ? 'emerald' : 'red'}
                      size="lg"
                    >
                      {netChange >= 0 ? '+' : ''}{netChange}
                    </Badge>
                  </div>
                </div>

                {/* Retention Rate */}
                {metrics.active > 0 && metrics.total > 0 && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-foreground-secondary">Active Rate</span>
                      <span className="text-lg font-semibold text-foreground">
                        {Math.round((metrics.active / metrics.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-background-elevated rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(metrics.active / metrics.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Search and Activity Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <Card className="bg-background-surface border-border ring-0">
            <h2 className="text-lg font-semibold text-foreground mb-4">Find Subscriber</h2>
            <SubscriberSearch clientSlug={clientSlug} onSelect={handleSelect} />
            <p className="text-sm text-foreground-tertiary mt-3">
              Search by name or email address
            </p>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-background-surface border-border ring-0">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-background-elevated rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 bg-background-elevated rounded w-2/3 mb-1 animate-pulse" />
                      <div className="h-3 bg-background-elevated rounded w-1/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => handleSelect(activity.subscriberId)}
                    className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-background-elevated transition-colors text-left"
                  >
                    <ActivityIcon action={activity.action} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.subscriberName}
                      </p>
                      <p className="text-xs text-foreground-tertiary">
                        {getActionLabel(activity.action)} • {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-foreground-secondary">No recent activity</p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

function ActivityIcon({ action }: { action: RecentActivity['action'] }) {
  const config: Record<RecentActivity['action'], { icon: React.ReactNode; bg: string; color: string }> = {
    subscribed: { icon: <UserCheck className="w-4 h-4" />, bg: 'bg-green-500/10', color: 'text-green-400' },
    reactivated: { icon: <UserCheck className="w-4 h-4" />, bg: 'bg-blue-500/10', color: 'text-blue-400' },
    paused: { icon: <Pause className="w-4 h-4" />, bg: 'bg-yellow-500/10', color: 'text-yellow-400' },
    cancelled: { icon: <UserX className="w-4 h-4" />, bg: 'bg-red-500/10', color: 'text-red-400' },
    skipped: { icon: <Pause className="w-4 h-4" />, bg: 'bg-zinc-500/10', color: 'text-zinc-400' },
  };

  const { icon, bg, color } = config[action] || config.subscribed;

  return (
    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center ${color}`}>
      {icon}
    </div>
  );
}

function getActionLabel(action: RecentActivity['action']): string {
  const labels: Record<RecentActivity['action'], string> = {
    subscribed: 'Subscribed',
    reactivated: 'Reactivated',
    paused: 'Paused',
    cancelled: 'Cancelled',
    skipped: 'Skipped delivery',
  };
  return labels[action] || action;
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
