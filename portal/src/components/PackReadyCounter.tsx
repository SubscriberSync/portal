'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, ArrowRight } from 'lucide-react'

interface PackReadyData {
  total: number
  subscriptions: number
  directOrders: number
}

interface PackReadyCounterProps {
  clientSlug: string
}

export default function PackReadyCounter({ clientSlug }: PackReadyCounterProps) {
  const [data, setData] = useState<PackReadyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPackReady() {
      try {
        const res = await fetch('/api/pack/ready-count')
        if (!res.ok) {
          throw new Error('Failed to fetch pack ready data')
        }
        const responseData: PackReadyData = await res.json()
        setData(responseData)
      } catch (err) {
        console.error('Failed to fetch pack ready data:', err)
        setError('Unable to load data')
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPackReady()
  }, [clientSlug])

  if (isLoading) {
    return (
      <div className="bg-background-secondary rounded-2xl border border-border p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-16 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-background-secondary rounded-2xl border border-border p-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
            <Package className="w-7 h-7 text-gray-400" />
          </div>
          <div>
            <h3 className="text-title text-foreground mb-1">Pack Ready</h3>
            <p className="text-sm text-foreground-secondary">{error || 'No data available'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-secondary rounded-2xl border border-border p-8">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wider mb-2">
              Pack Ready
            </h3>
            <div className="text-5xl font-bold text-foreground mb-3">
              {data.total.toLocaleString()}
            </div>
            <p className="text-foreground-secondary">
              Unfulfilled Shipments
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-foreground-secondary">
                <span className="font-semibold text-foreground">{data.subscriptions.toLocaleString()}</span> Subs
              </span>
              <span className="text-foreground-tertiary">•</span>
              <span className="text-foreground-secondary">
                <span className="font-semibold text-foreground">{data.directOrders.toLocaleString()}</span> Direct Orders
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/portal/${clientSlug}/pack`}
          className="flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors"
        >
          Start Packing
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
