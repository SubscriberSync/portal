'use client'

import { useState } from 'react'
import { Download, Loader2, FileSpreadsheet } from 'lucide-react'

interface ShippingDownloadProps {
  clientSlug?: string
}

export default function ShippingDownload({ clientSlug }: ShippingDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsDownloading(true)
    setError(null)

    try {
      // Include client slug to fetch from their specific base
      const url = clientSlug ? `/api/shipping/csv?client=${clientSlug}` : '/api/shipping/csv'
      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Download failed')
      }

      // Get the blob and trigger download
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `shipping-${clientSlug || 'all'}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="bg-background-secondary rounded-2xl border border-border p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-6 h-6 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Download Shipping CSV</h3>
          <p className="text-sm text-foreground-secondary mt-1">
            Export your shipping data formatted for ShipStation or PirateShip
          </p>

          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="mt-4 flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white rounded-xl font-medium transition-colors"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download Shipping CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
