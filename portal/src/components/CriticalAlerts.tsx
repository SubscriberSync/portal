'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, MapPin, ChevronRight } from 'lucide-react'

interface Alert {
  id: string
  type: 'no_box' | 'address_issue'
  severity: 'red' | 'orange'
  count: number
  message: string
  actionUrl?: string
}

interface AlertsResponse {
  alerts: Alert[]
}

interface CriticalAlertsProps {
  clientSlug: string
}

export default function CriticalAlerts({ clientSlug }: CriticalAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alerts')
        if (!res.ok) {
          throw new Error('Failed to fetch alerts')
        }
        const data: AlertsResponse = await res.json()
        setAlerts(data.alerts || [])
      } catch (err) {
        console.error('Failed to fetch critical alerts:', err)
        setError('Unable to load alerts')
        setAlerts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlerts()
  }, [clientSlug])

  if (isLoading) {
    return (
      <div className="bg-background-secondary rounded-2xl border border-border p-6">
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-200" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  // Don't show section if no alerts and no error
  if (!error && alerts.length === 0) {
    return null
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'no_box':
        return <AlertTriangle className="w-6 h-6" />
      case 'address_issue':
        return <MapPin className="w-6 h-6" />
      default:
        return <AlertTriangle className="w-6 h-6" />
    }
  }

  const getAlertStyles = (severity: Alert['severity']) => {
    switch (severity) {
      case 'red':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'bg-red-100 text-red-600',
          text: 'text-red-800',
          subtext: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 text-white',
        }
      case 'orange':
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'bg-orange-100 text-orange-600',
          text: 'text-orange-800',
          subtext: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700 text-white',
        }
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'bg-gray-100 text-gray-600',
          text: 'text-gray-800',
          subtext: 'text-gray-600',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
        }
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-headline text-foreground mb-2">Critical Alerts</h3>
        <p className="text-foreground-secondary">Issues that need your attention</p>
      </div>

      {error ? (
        <div className="bg-background-secondary rounded-2xl border border-border p-6">
          <p className="text-foreground-secondary text-sm">{error}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const styles = getAlertStyles(alert.severity)
            return (
              <div
                key={alert.id}
                className={`rounded-2xl border p-5 ${styles.container}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.icon}`}
                  >
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${styles.text}`}>
                      {alert.message}
                    </p>
                    <p className={`text-sm mt-0.5 ${styles.subtext}`}>
                      {alert.count} {alert.count === 1 ? 'subscriber' : 'subscribers'} affected
                    </p>
                  </div>
                  {alert.actionUrl && (
                    <a
                      href={alert.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors flex-shrink-0 ${styles.button}`}
                    >
                      Click to Fix
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
