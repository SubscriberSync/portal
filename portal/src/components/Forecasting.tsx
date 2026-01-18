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
        <div className="w-10 h-10 rounded-xl bg-[rgba(224,122,66,0.15)] border border-[rgba(224,122,66,0.2)] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#e07a42]" />
        </div>
        <div>
          <h3 className="text-headline text-white">Inventory Forecast</h3>
          <p className="text-[#71717a] text-sm">Plan your next 3 months of inventory</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sequence Histogram - Glass Panel */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-white">Subscribers by Episode</h4>
            {data?.totalActive && (
              <span className="text-sm text-[#71717a]">
                {data.totalActive} active subscribers
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#e07a42] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-[#71717a]">Loading forecast...</span>
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
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-[rgba(255,255,255,0.1)] backdrop-blur-xl text-white px-3 py-2 rounded-lg shadow-lg border border-[rgba(255,255,255,0.1)]">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-[#e4e4e7]">{data.subscribers} subscribers</p>
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
                      <stop offset="0%" stopColor="#e07a42" />
                      <stop offset="100%" stopColor="#c96a35" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#71717a]">
              No episode data available
            </div>
          )}

          {/* Forecast Insight - Glass with Orange accent */}
          {nextMonthForecast.length > 0 && (
            <div className="mt-6 p-4 bg-[rgba(224,122,66,0.1)] border border-[rgba(224,122,66,0.2)] rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(224,122,66,0.2)] flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-[#e07a42]" />
                </div>
                <div>
                  <p className="font-medium text-[#e07a42] mb-1">Next Month Forecast</p>
                  <p className="text-sm text-[#e4e4e7]">
                    {nextMonthForecast.map((f, i) => (
                      <span key={f.currentBox}>
                        {i > 0 && ' + '}
                        <span className="font-semibold text-white">{f.units}</span> units of Box {f.nextBox}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidecar Counter - Glass Panel */}
        <div className="p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-[#e07a42]" />
            <h4 className="font-semibold text-white">Add-On Products</h4>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-[rgba(255,255,255,0.03)] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-[rgba(255,255,255,0.03)] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : data?.sidecars && data.sidecars.length > 0 ? (
            <div className="space-y-3">
              {data.sidecars.map((sidecar) => (
                <div
                  key={sidecar.name}
                  className="p-4 bg-[rgba(255,255,255,0.02)] rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.04)]"
                >
                  <div className="mb-2">
                    <span className="text-sm font-medium text-white line-clamp-1">
                      {sidecar.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#e07a42]" />
                      <span className="text-[#a1a1aa]">
                        <span className="font-semibold text-white">{sidecar.unitsToPack}</span> to pack
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#e8935f]" />
                      <span className="text-[#a1a1aa]">
                        <span className="font-semibold text-white">{sidecar.velocity}</span>/mo
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total Summary */}
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#a1a1aa]">Total to Pack</span>
                  <span className="text-lg font-bold text-[#e07a42]">
                    {data.sidecars.reduce((sum, s) => sum + s.unitsToPack, 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#71717a] text-sm py-12">
              No add-on products
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
