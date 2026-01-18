'use client'

import { Mail, Wrench, Calendar, Shield } from 'lucide-react'

interface SupportSectionProps {
  client: {
    hostingRenewal?: string | null
  }
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
        <h3 className="text-headline text-white mb-2">Concierge</h3>
        <p className="text-sm text-[#71717a]">White-glove support when you need it</p>
      </div>

      {/* Support Cards - Glass Panels */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Email Support */}
        <div className="group relative p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
          {/* Subtle hover glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(224,122,66,0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[rgba(224,122,66,0.1)] border border-[rgba(224,122,66,0.2)] flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-[#e07a42]" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1.5">Direct Line</h4>
              <p className="text-sm text-[#71717a] mb-4 leading-relaxed">
                Questions or issues with your system? We're here to help.
              </p>
              <a
                href="mailto:travis@subscribersync.com"
                className="inline-flex items-center gap-2 text-[#e07a42] hover:text-[#e8935f] transition-colors font-medium text-sm"
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
        <div className="group relative p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] transition-all overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
          {/* Subtle hover glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,255,255,0.02)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-[#a1a1aa]" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1.5">Custom Work</h4>
              <p className="text-sm text-[#71717a] mb-4 leading-relaxed">
                Need modifications? We build to your specifications.
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-white tracking-tight">$150</span>
                <span className="text-sm text-[#71717a]">per request</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hosting Renewal - Glass Panel */}
      {client.hostingRenewal && (
        <div className="relative p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_20px_40px_rgba(0,0,0,0.3)]">
          {/* Top accent line */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#a1a1aa]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#71717a] mb-1">
                  Hosting Renewal
                </p>
                <p className="text-lg font-medium text-white">
                  {formatDate(client.hostingRenewal)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[rgba(224,122,66,0.1)] border border-[rgba(224,122,66,0.2)] backdrop-blur-xl">
              <Shield className="w-4 h-4 text-[#e07a42]" />
              <span className="text-xs text-[#e07a42] font-medium">Auto-renew enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
