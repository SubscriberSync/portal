import { ClientData } from '@/lib/types'

interface StatsGridProps {
  client: ClientData
}

export default function StatsGrid({ client }: StatsGridProps) {
  const stats = [
    {
      label: 'Total Subscribers',
      value: client.totalSubscribers.toLocaleString(),
      icon: '👥',
      color: 'bg-blue-500/10 border-blue-500/20',
      textColor: 'text-blue-400'
    },
    {
      label: 'Active',
      value: client.activeSubscribers.toLocaleString(),
      icon: '🟢',
      color: 'bg-green-500/10 border-green-500/20',
      textColor: 'text-green-400'
    },
    {
      label: 'Paused',
      value: client.pausedSubscribers.toLocaleString(),
      icon: '⏸️',
      color: 'bg-yellow-500/10 border-yellow-500/20',
      textColor: 'text-yellow-400'
    },
    {
      label: 'Cancelled',
      value: client.cancelledSubscribers.toLocaleString(),
      icon: '🔴',
      color: 'bg-red-500/10 border-red-500/20',
      textColor: 'text-red-400'
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`p-5 rounded-xl border ${stat.color}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{stat.icon}</span>
            <span className="text-sm text-muted">{stat.label}</span>
          </div>
          <div className={`text-2xl font-bold ${stat.textColor}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  )
}
