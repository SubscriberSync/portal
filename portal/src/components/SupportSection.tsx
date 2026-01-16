import { ClientData } from '@/lib/types'

interface SupportSectionProps {
  client: ClientData
}

export default function SupportSection({ client }: SupportSectionProps) {
  return (
    <div className="bg-slate rounded-2xl border border-border p-6">
      <h2 className="text-lg font-semibold text-light mb-6 flex items-center gap-2">
        <span>💬</span> Support
      </h2>
      
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 bg-ink rounded-xl">
          <div className="w-10 h-10 bg-copper/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">✉️</span>
          </div>
          <div>
            <div className="font-medium text-light mb-1">Need help?</div>
            <div className="text-muted text-sm">
              Email{' '}
              <a href="mailto:travis@subscribersync.com" className="text-copper hover:underline">
                travis@subscribersync.com
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-ink rounded-xl">
          <div className="w-10 h-10 bg-copper/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">🔧</span>
          </div>
          <div>
            <div className="font-medium text-light mb-1">Need changes?</div>
            <div className="text-muted text-sm">
              $150/request — just describe what you need
            </div>
          </div>
        </div>

        {client.hostingRenewal && (
          <div className="flex items-start gap-4 p-4 bg-ink rounded-xl">
            <div className="w-10 h-10 bg-copper/20 rounded-lg flex items-center justify-center">
              <span className="text-lg">📅</span>
            </div>
            <div>
              <div className="font-medium text-light mb-1">Hosting renewal</div>
              <div className="text-muted text-sm">
                {new Date(client.hostingRenewal).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                <span className="text-muted/70"> — I&apos;ll remind you 2 weeks before</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
