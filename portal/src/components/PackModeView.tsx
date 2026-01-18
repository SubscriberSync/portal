'use client'

import { useState, useEffect } from 'react'
import { X, RefreshCw, Package, CheckCircle2 } from 'lucide-react'

interface PackBatch {
  batch: string
  box: string
  total: number
  packed: number
  sizeBreakdown: Record<string, number>
  records: any[]
}

interface PackModeViewProps {
  onExit: () => void
  clientSlug?: string
}

export default function PackModeView({ onExit, clientSlug }: PackModeViewProps) {
  const [batches, setBatches] = useState<PackBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<number>(0)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Include client slug to fetch from their specific base
      const url = clientSlug ? `/api/packing?client=${clientSlug}` : '/api/packing'
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setBatches(data.batches || [])
    } catch (err) {
      setError('Failed to load packing data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const currentBatch = batches[selectedBatch]

  // Sort sizes in a logical order
  const sortedSizes = currentBatch
    ? Object.entries(currentBatch.sizeBreakdown).sort((a, b) => {
        const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'N/A']
        const aIndex = order.indexOf(a[0])
        const bIndex = order.indexOf(b[0])
        if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0])
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    : []

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black border-b-4 border-yellow-500 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Package className="w-10 h-10 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-black tracking-tight">PACK MODE</h1>
            <p className="text-yellow-500 text-sm font-medium">Optimized for warehouse viewing</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-lg transition-colors"
          >
            <X className="w-6 h-6" />
            EXIT
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="text-center">
            <RefreshCw className="w-16 h-16 animate-spin mx-auto mb-4 text-yellow-500" />
            <p className="text-2xl font-bold">Loading packing data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-8 py-4 bg-yellow-500 text-black font-bold text-xl rounded-xl"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && !error && batches.length === 0 && (
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="text-center">
            <Package className="w-24 h-24 mx-auto mb-4 text-zinc-600" />
            <p className="text-3xl font-bold text-zinc-400">No packing data found</p>
            <p className="text-xl text-zinc-500 mt-2">Add Batch and Box fields to your subscribers table</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && batches.length > 0 && currentBatch && (
        <div className="p-8">
          {/* Batch Selector */}
          {batches.length > 1 && (
            <div className="flex gap-3 mb-8 flex-wrap">
              {batches.map((batch, index) => (
                <button
                  key={`${batch.batch}-${batch.box}`}
                  onClick={() => setSelectedBatch(index)}
                  className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                    index === selectedBatch
                      ? 'bg-yellow-500 text-black'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {batch.batch}: {batch.box}
                </button>
              ))}
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Batch Info */}
            <div className="bg-zinc-900 rounded-3xl p-8 border-4 border-zinc-700">
              <p className="text-yellow-500 text-xl font-bold mb-2">BATCH</p>
              <h2 className="text-5xl font-black mb-6">{currentBatch.batch}</h2>

              <p className="text-yellow-500 text-xl font-bold mb-2">BOX</p>
              <h3 className="text-4xl font-bold text-zinc-300">{currentBatch.box}</h3>
            </div>

            {/* Center Column - Total Count */}
            <div className="bg-zinc-900 rounded-3xl p-8 border-4 border-yellow-500 flex flex-col items-center justify-center">
              <p className="text-yellow-500 text-2xl font-bold mb-4">TOTAL UNITS</p>
              <div className="text-[10rem] font-black leading-none text-yellow-500">
                {currentBatch.total}
              </div>
              {currentBatch.packed > 0 && (
                <div className="flex items-center gap-2 mt-4 text-green-500">
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="text-2xl font-bold">{currentBatch.packed} packed</span>
                </div>
              )}
            </div>

            {/* Right Column - Size Breakdown */}
            <div className="bg-zinc-900 rounded-3xl p-8 border-4 border-zinc-700">
              <p className="text-yellow-500 text-xl font-bold mb-6">SIZE BREAKDOWN</p>

              <div className="space-y-4">
                {sortedSizes.map(([size, count]) => (
                  <div
                    key={size}
                    className="flex items-center justify-between bg-zinc-800 rounded-2xl px-6 py-4"
                  >
                    <span className="text-3xl font-black">{size}</span>
                    <span className="text-4xl font-black text-yellow-500">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {currentBatch.packed > 0 && (
            <div className="mt-8">
              <div className="flex justify-between text-xl font-bold mb-2">
                <span>Progress</span>
                <span>{Math.round((currentBatch.packed / currentBatch.total) * 100)}%</span>
              </div>
              <div className="h-8 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(currentBatch.packed / currentBatch.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
