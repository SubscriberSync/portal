'use client'

import { ClientData } from '@/lib/types'

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
    <div className="space-y-6">
      <div>
        <h3 className="text-headline text-foreground mb-2">Support</h3>
        <p className="text-foreground-secondary">Get help when you need it</p>
      </div>

      {/* Support Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Email Support */}
        <div className="p-6 rounded-2xl bg-background-secondary border border-border">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📧</span>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Need Help?</h4>
              <p className="text-sm text-foreground-secondary mb-3">
                Questions or issues with your system
              </p>
              <a
                href="mailto:travis@subscribersync.com"
                className="text-accent hover:text-accent-hover transition-colors font-medium"
              >
                travis@subscribersync.com
              </a>
            </div>
          </div>
        </div>

        {/* Custom Changes */}
        <div className="p-6 rounded-2xl bg-background-secondary border border-border">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🛠</span>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Need Changes?</h4>
              <p className="text-sm text-foreground-secondary mb-3">
                Custom modifications available
              </p>
              <p className="text-3xl font-semibold text-foreground">
                $150<span className="text-sm text-foreground-secondary font-normal ml-1">/ request</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hosting Renewal */}
      {client.hostingRenewal && (
        <div className="p-6 rounded-2xl bg-background-secondary border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-background-elevated flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <p className="text-xs text-foreground-tertiary uppercase tracking-wider mb-1">
                  Hosting Renewal
                </p>
                <p className="text-lg font-medium text-foreground">
                  {formatDate(client.hostingRenewal)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs text-success font-medium">Auto-reminder enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
