'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Package, TrendingUp, Sparkles } from 'lucide-react'

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
        const res = await fetch(
          `https://n8n.everlorehollow.com/webhook/backstage/${clientSlug}/forecast`
        )
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

  // Transform data for the chart
  const chartData = data?.boxDistribution?.map(box => ({
    name: `Box ${box.boxNumber}`,
    subscribers: box.count,
    boxNumber: box.boxNumber,
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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-headline text-foreground">Inventory Forecast</h3>
          <p className="text-foreground-secondary text-sm">Plan your next 3 months of inventory</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sequence Histogram - Takes 2 columns */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-background-secondary border border-border">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-foreground">Subscribers by Episode</h4>
            {data?.totalActive && (
              <span className="text-sm text-foreground-tertiary">
                {data.totalActive} active subscribers
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-foreground-tertiary">Loading forecast...</span>
              </div>
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7a87', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7a87', fontSize: 12 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-foreground text-white px-3 py-2 rounded-lg shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm opacity-90">{data.subscribers} subscribers</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="subscribers"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#barGradient)`}
                      />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E07A42" />
                      <stop offset="100%" stopColor="#c96a35" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-foreground-tertiary">
              No episode data available
            </div>
          )}

          {/* Forecast Insight */}
          {nextMonthForecast.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-purple-900 mb-1">Next Month Forecast</p>
                  <p className="text-sm text-purple-700">
                    {nextMonthForecast.map((f, i) => (
                      <span key={f.currentBox}>
                        {i > 0 && ' + '}
                        <span className="font-semibold">{f.units}</span> units of Box {f.nextBox}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidecar Counter - 1 column */}
        <div className="p-6 rounded-2xl bg-background-secondary border border-border">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-amber-500" />
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
                  className="p-4 bg-background-elevated rounded-xl hover:bg-border/50 transition-colors"
                >
                  <div className="mb-2">
                    <span className="text-sm font-medium text-foreground line-clamp-1">
                      {sidecar.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-foreground-secondary">
                        <span className="font-semibold text-foreground">{sidecar.unitsToPack}</span> to pack
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-foreground-secondary">
                        <span className="font-semibold text-foreground">{sidecar.velocity}</span>/mo
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total Summary */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground-secondary">Total to Pack</span>
                  <span className="text-lg font-bold text-foreground">
                    {data.sidecars.reduce((sum, s) => sum + s.unitsToPack, 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-foreground-tertiary text-sm py-12">
              No add-on products
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
