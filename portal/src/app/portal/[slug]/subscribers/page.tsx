'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Users, UserCheck, UserX, Pause, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { SubscriberSearch } from '@/components/backstage/SubscriberSearch';

interface SubscriberStats {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  atRisk: number;
  newThisMonth: number;
  churnedThisMonth: number;
}

interface RecentActivity {
  id: string;
  subscriberId: string;
  subscriberName: string;
  action: 'subscribed' | 'paused' | 'cancelled' | 'reactivated' | 'skipped';
  timestamp: string;
}

export default function SubscribersPage() {
  const router = useRouter();
  const params = useParams();
  const clientSlug = params.slug as string;

  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch('/api/subscribers/stats'),
          fetch('/api/subscribers/activity'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
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
  }, [clientSlug]);

  const handleSelect = (subscriberId: string) => {
    router.push(`/portal/${clientSlug}/subscribers/${subscriberId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Subscribers</h1>
        <p className="text-foreground-secondary">
          Search and view subscriber details
        </p>
      </div>

      {/* Search bar - prominent placement */}
      <div>
        <SubscriberSearch clientSlug={clientSlug} onSelect={handleSelect} />
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-background-secondary rounded-xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total"
            value={stats.total}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5" />}
            label="Active"
            value={stats.active}
            iconColor="text-green-600"
            iconBg="bg-green-100"
          />
          <StatCard
            icon={<Pause className="w-5 h-5" />}
            label="Paused"
            value={stats.paused}
            iconColor="text-yellow-600"
            iconBg="bg-yellow-100"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="At Risk"
            value={stats.atRisk}
            iconColor="text-red-600"
            iconBg="bg-red-100"
          />
        </div>
      ) : null}

      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Summary */}
        {stats && (
          <div className="bg-background-secondary rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">This Month</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-foreground-secondary">New Subscribers</span>
                </div>
                <span className="text-xl font-bold text-green-600">+{stats.newThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-foreground-secondary">Churned</span>
                </div>
                <span className="text-xl font-bold text-red-600">-{stats.churnedThisMonth}</span>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-secondary">Net Change</span>
                  <span className={`text-xl font-bold ${stats.newThisMonth - stats.churnedThisMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.newThisMonth - stats.churnedThisMonth >= 0 ? '+' : ''}{stats.newThisMonth - stats.churnedThisMonth}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-background-secondary rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
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
            <p className="text-foreground-secondary text-sm">No recent activity</p>
          )}
        </div>
      </div>

      {/* Help text */}
      <div className="text-center">
        <p className="text-foreground-tertiary text-sm">
          Use the search bar to find any subscriber by name or email address
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="bg-background-secondary rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        <span className="text-sm text-foreground-secondary">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

function ActivityIcon({ action }: { action: RecentActivity['action'] }) {
  const config: Record<RecentActivity['action'], { icon: React.ReactNode; bg: string; color: string }> = {
    subscribed: { icon: <UserCheck className="w-4 h-4" />, bg: 'bg-green-100', color: 'text-green-600' },
    reactivated: { icon: <UserCheck className="w-4 h-4" />, bg: 'bg-blue-100', color: 'text-blue-600' },
    paused: { icon: <Pause className="w-4 h-4" />, bg: 'bg-yellow-100', color: 'text-yellow-600' },
    cancelled: { icon: <UserX className="w-4 h-4" />, bg: 'bg-red-100', color: 'text-red-600' },
    skipped: { icon: <Pause className="w-4 h-4" />, bg: 'bg-gray-100', color: 'text-gray-600' },
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
