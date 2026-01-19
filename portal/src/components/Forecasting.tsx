'use client'

import { useState, useEffect } from 'react'
import { BarChart, Card } from '@tremor/react'
import { Package, TrendingUp, Sparkles, Loader2 } from 'lucide-react'

interface ForecastingProps {
  clientSlug: string
}

interface BoxDistribution {
  boxNumber: number
  count: number
  label: string
}

interface SidecarProduct {
  name: string
  unitsToPack: number
  velocity: number
}

interface ForecastData {
  boxDistribution: BoxDistribution[]
  sidecars: SidecarProduct[]
  totalActive: number
}

export default function Forecasting({ clientSlug }: ForecastingProps) {
  const [data, setData] = useState<ForecastData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchForecast() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/forecasting')
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (err) {
        console.error('Failed to fetch forecast data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchForecast()
  }, [clientSlug])

  // Transform data for Tremor chart
  const chartData = data?.boxDistribution?.map(box => ({
    name: `Box ${box.boxNumber}`,
    Subscribers: box.count,
  })) || []

  // Calculate next month's needs
  const nextMonthForecast = data?.boxDistribution
    ?.filter(box => box.count > 0)
    ?.map(box => ({
      currentBox: box.boxNumber,
      nextBox: box.boxNumber + 1,
      units: box.count,
    })) || []

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-headline text-foreground">Inventory Forecast</h3>
          <p className="text-foreground-muted text-sm">Plan your next 3 months of inventory</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sequence Histogram - Tremor Card */}
        <Card className="lg:col-span-2 bg-background-surface border-border ring-0">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground">Subscribers by Episode</h4>
            {data?.totalActive && (
              <span className="text-sm text-foreground-muted">
                {data.totalActive} active subscribers
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <span className="text-sm text-foreground-muted">Loading forecast...</span>
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
              <span className="text-foreground-muted">No episode data available</span>
            </div>
          )}

          {/* Forecast Insight */}
          {nextMonthForecast.length > 0 && (
            <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-accent mb-1">Next Month Forecast</p>
                  <p className="text-sm text-foreground-secondary">
                    {nextMonthForecast.map((f, i) => (
                      <span key={f.currentBox}>
                        {i > 0 && ' + '}
                        <span className="font-semibold text-foreground">{f.units}</span> units of Box {f.nextBox}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Sidecar Counter - Tremor Card */}
        <Card className="bg-background-surface border-border ring-0">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-accent" />
            <h4 className="font-semibold text-foreground">Add-On Products</h4>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-background-elevated rounded w-3/4 mb-2" />
                  <div className="h-3 bg-background-elevated rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : data?.sidecars && data.sidecars.length > 0 ? (
            <div className="space-y-3">
              {data.sidecars.map((sidecar) => (
                <div
                  key={sidecar.name}
                  className="p-4 bg-background-secondary rounded-xl hover:bg-background-elevated transition-colors border border-border"
                >
                  <div className="mb-2">
                    <span className="text-sm font-medium text-foreground line-clamp-1">
                      {sidecar.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-foreground-tertiary">
                        <span className="font-semibold text-foreground">{sidecar.unitsToPack}</span> to pack
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-accent-light" />
                      <span className="text-foreground-tertiary">
                        <span className="font-semibold text-foreground">{sidecar.velocity}</span>/mo
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total Summary */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground-tertiary">Total to Pack</span>
                  <span className="text-lg font-bold text-accent">
                    {data.sidecars.reduce((sum, s) => sum + s.unitsToPack, 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center py-12">
              <span className="text-foreground-muted">No add-on products</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
