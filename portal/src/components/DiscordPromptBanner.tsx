'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, X, Clock, XCircle, Loader2, Users, Zap } from 'lucide-react'

interface DiscordPromptBannerProps {
  clientSlug: string
  onDismiss?: () => void
}

export default function DiscordPromptBanner({ clientSlug, onDismiss }: DiscordPromptBannerProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  const handleConnect = () => {
    router.push(`/portal/${clientSlug}/discord`)
  }

  const handleClose = () => {
    setShowModal(true)
  }

  const handleRemindLater = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/discord/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remind_later' }),
      })

      if (response.ok) {
        setShowModal(false)
        setIsHidden(true)
        onDismiss?.()
      }
    } catch (error) {
      console.error('Error setting reminder:', error)
    }
    setIsLoading(false)
  }

  const handleDismiss = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/discord/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })

      if (response.ok) {
        setShowModal(false)
        setIsHidden(true)
        onDismiss?.()
      }
    } catch (error) {
      console.error('Error dismissing:', error)
    }
    setIsLoading(false)
  }

  if (isHidden) {
    return null
  }

  return (
    <>
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5865F2]/10 via-[#151515] to-[#151515] border border-[#5865F2]/20">
        {/* Decorative top line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5865F2]/40 to-transparent" />
        
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#5865F2]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#5865F2]/5 rounded-full blur-3xl" />

        <div className="relative p-6">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-[#6B6660] hover:text-[#F5F0E8] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-5">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-7 h-7 text-[#5865F2]" />
            </div>

            {/* Content */}
            <div className="flex-1 pr-8">
              <h3 className="text-lg font-semibold text-[#F5F0E8] mb-1">
                Connect Your Discord Community
              </h3>
              <p className="text-sm text-[#A8A39B] mb-4">
                Automatically manage subscriber roles and give your customers access to exclusive Discord channels based on their subscription.
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-4 mb-5">
                <div className="flex items-center gap-2 text-sm text-[#6B6660]">
                  <Users className="w-4 h-4 text-[#5865F2]" />
                  <span>Auto-assign roles</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6B6660]">
                  <Zap className="w-4 h-4 text-[#5865F2]" />
                  <span>Real-time sync</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleConnect}
                className="px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Connect Discord
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dismiss Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-2xl border border-[rgba(255,255,255,0.1)] p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-[#5865F2]" />
              </div>
              <h3 className="text-xl font-semibold text-[#F5F0E8] mb-2">
                Set Up Discord Later?
              </h3>
              <p className="text-sm text-[#A8A39B]">
                You can always connect Discord from your Settings page when you&apos;re ready.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleRemindLater}
                disabled={isLoading}
                className="w-full px-5 py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#5865F2]/50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                Remind me in a few days
              </button>

              <button
                onClick={handleDismiss}
                disabled={isLoading}
                className="w-full px-5 py-3 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#A8A39B] hover:text-[#F5F0E8] font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                No thanks, I&apos;ll set it up in Settings
              </button>

              <button
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="w-full px-5 py-2 text-[#6B6660] hover:text-[#A8A39B] text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
