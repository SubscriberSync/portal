'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface HelpPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  helpText: string
  loomUrl?: string
  steps?: string[]
}

export default function HelpPanel({
  isOpen,
  onClose,
  title,
  description,
  helpText,
  loomUrl,
  steps
}: HelpPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Extract Loom video ID from URL
  const getLoomEmbedUrl = (url: string) => {
    const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
    if (match) {
      return `https://www.loom.com/embed/${match[1]}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`
    }
    return url
  }

  // Don't render anything if not open
  if (!isOpen) return null

  // Use portal to render at document body level
  if (typeof window === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-background-secondary border-l border-border shadow-2xl z-50 animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-foreground-secondary mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-elevated transition-colors text-foreground-tertiary hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-88px)]">
          {/* Loom Video */}
          {loomUrl && (
            <div className="mb-6">
              <div className="aspect-video rounded-xl overflow-hidden bg-background-elevated border border-border">
                <iframe
                  src={getLoomEmbedUrl(loomUrl)}
                  frameBorder="0"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Quick Reference */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600">💡</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Quick Reference</p>
                <p className="text-sm text-foreground-secondary">{helpText}</p>
              </div>
            </div>
          </div>

          {/* Step by Step (if provided) */}
          {steps && steps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-4">Step by Step</h3>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground-secondary pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No video fallback */}
          {!loomUrl && (
            <div className="text-center py-8 text-foreground-tertiary">
              <div className="w-12 h-12 rounded-full bg-background-elevated flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎬</span>
              </div>
              <p className="text-sm">Video tutorial coming soon</p>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
