'use client'

import { ClientData } from '@/lib/types'
import { Mail, Wrench, Calendar, Shield } from 'lucide-react'

interface SupportSectionProps {
  client: ClientData
}

export default function SupportSection({ client }: SupportSectionProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div>
        <h3 className="text-headline text-[#F5F0E8] mb-2">Concierge</h3>
        <p className="text-sm text-[#6B6660]">White-glove support when you need it</p>
      </div>

      {/* Support Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Email Support */}
        <div className="group relative p-6 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] hover:border-[rgba(245,240,232,0.1)] transition-all overflow-hidden">
          {/* Subtle hover glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#C9A962]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C9A962]/10 border border-[#C9A962]/20 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-[#C9A962]" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-[#F5F0E8] mb-1.5">Direct Line</h4>
              <p className="text-sm text-[#6B6660] mb-4 leading-relaxed">
                Questions or issues with your system? We're here to help.
              </p>
              <a
                href="mailto:travis@subscribersync.com"
                className="inline-flex items-center gap-2 text-[#C9A962] hover:text-[#D4B977] transition-colors font-medium text-sm"
              >
                <span>travis@subscribersync.com</span>
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 12L12 4M12 4H5M12 4V11" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Custom Changes */}
        <div className="group relative p-6 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] hover:border-[rgba(245,240,232,0.1)] transition-all overflow-hidden">
          {/* Subtle hover glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B7355]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#8B7355]/10 border border-[#8B7355]/20 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-[#8B7355]" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-[#F5F0E8] mb-1.5">Custom Work</h4>
              <p className="text-sm text-[#6B6660] mb-4 leading-relaxed">
                Need modifications? We build to your specifications.
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-[#F5F0E8] tracking-tight">$150</span>
                <span className="text-sm text-[#6B6660]">per request</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hosting Renewal */}
      {client.hostingRenewal && (
        <div className="relative p-6 rounded-2xl bg-[#151515] border border-[rgba(245,240,232,0.06)] overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[rgba(245,240,232,0.1)] to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] border border-[rgba(245,240,232,0.08)] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#A8A39B]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#6B6660] mb-1">
                  Hosting Renewal
                </p>
                <p className="text-lg font-medium text-[#F5F0E8]">
                  {formatDate(client.hostingRenewal)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#5CB87A]/10 border border-[#5CB87A]/15">
              <Shield className="w-4 h-4 text-[#5CB87A]" />
              <span className="text-xs text-[#5CB87A] font-medium">Auto-renew enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
