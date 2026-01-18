'use client'

import { useState } from 'react'
import { Mail, Copy, Check, ChevronDown, Zap, User, Filter, Target, Sparkles } from 'lucide-react'

// Profile properties automatically synced to Klaviyo
const PROFILE_PROPERTIES = [
  {
    category: 'Subscription Status',
    properties: [
      { name: 'subscription_status', type: 'String', values: 'Active, Paused, Cancelled', description: 'Current subscription state', useCase: 'Segments, Flow triggers' },
      { name: 'is_at_risk', type: 'Boolean', values: 'true, false', description: 'Subscriber flagged as at-risk (2+ skips/delays or paused)', useCase: 'Win-back campaigns' },
    ]
  },
  {
    category: 'Episode Progress',
    properties: [
      { name: 'box_number', type: 'Number', values: '1, 2, 3...', description: 'Current episode/box number', useCase: 'Content unlock, Flow triggers' },
      { name: 'next_box', type: 'Number', values: '2, 3, 4...', description: 'Next episode number (box_number + 1)', useCase: 'Teaser emails' },
      { name: 'total_boxes', type: 'Number', values: '12 (default)', description: 'Total episodes in subscription', useCase: 'Progress calculation' },
      { name: 'boxes_remaining', type: 'Number', values: '0-12', description: 'Episodes left (total - current)', useCase: 'Renewal campaigns' },
      { name: 'journey_stage', type: 'String', values: 'early, middle, late, complete', description: 'Based on % through subscription', useCase: 'Stage-based content' },
      { name: 'content_unlock', type: 'String', values: 'product_1, product_2...', description: 'Content key for current episode', useCase: 'Digital content access' },
    ]
  },
  {
    category: 'Product & SKU',
    properties: [
      { name: 'sku', type: 'String', values: 'Product SKU code', description: 'Current product SKU', useCase: 'Product segments' },
      { name: 'is_digital', type: 'Boolean', values: 'true, false', description: 'True if SKU contains "Digital"', useCase: 'Digital-only flows' },
    ]
  },
  {
    category: 'Billing & Frequency',
    properties: [
      { name: 'frequency', type: 'String', values: 'Monthly, Quarterly, Yearly', description: 'Billing frequency', useCase: 'Frequency segments' },
      { name: 'is_yearly', type: 'Boolean', values: 'true, false', description: 'Annual subscriber flag', useCase: 'VIP treatment' },
      { name: 'is_quarterly', type: 'Boolean', values: 'true, false', description: 'Quarterly subscriber flag', useCase: 'Billing reminders' },
    ]
  },
  {
    category: 'Engagement Metrics',
    properties: [
      { name: 'skip_count', type: 'Number', values: '0, 1, 2...', description: 'Number of skipped shipments', useCase: 'At-risk detection' },
      { name: 'delay_count', type: 'Number', values: '0, 1, 2...', description: 'Number of delayed shipments', useCase: 'At-risk detection' },
      { name: 'has_discord', type: 'Boolean', values: 'true, false', description: 'Joined Discord community', useCase: 'Community engagement' },
      { name: 'discord_user_id', type: 'String', values: 'Discord ID', description: 'Discord user identifier', useCase: 'Cross-platform linking' },
    ]
  },
  {
    category: 'Customer Tags',
    properties: [
      { name: 'is_vip', type: 'Boolean', values: 'true, false', description: 'Tagged as VIP', useCase: 'VIP segments' },
      { name: 'is_influencer', type: 'Boolean', values: 'true, false', description: 'Tagged as Influencer', useCase: 'Influencer outreach' },
      { name: 'is_problem', type: 'Boolean', values: 'true, false', description: 'Tagged as Problem customer', useCase: 'Support workflows' },
      { name: 'is_gift', type: 'Boolean', values: 'true, false', description: 'Gift subscription', useCase: 'Gift messaging' },
    ]
  },
  {
    category: 'Demographics',
    properties: [
      { name: 'state', type: 'String', values: 'CA, NY, TX...', description: 'Shipping state', useCase: 'Regional campaigns' },
      { name: 'country', type: 'String', values: 'US, CA, UK...', description: 'Shipping country', useCase: 'International segments' },
      { name: 'shirt_size', type: 'String', values: 'S, M, L, XL...', description: 'Shirt size preference', useCase: 'Merch offers' },
      { name: 'acquisition_source', type: 'String', values: 'Source name', description: 'How they found you', useCase: 'Attribution analysis' },
    ]
  },
  {
    category: 'Cancellation',
    properties: [
      { name: 'cancel_reason', type: 'String', values: 'Reason text', description: 'Why they cancelled', useCase: 'Win-back personalization' },
    ]
  },
]

// Events sent to Klaviyo
const KLAVIYO_EVENTS = [
  {
    name: 'Subscription Cancelled',
    trigger: 'Status changes to Cancelled',
    properties: ['product', 'last_episode', 'cancel_reason'],
    useCase: 'Trigger win-back flow, collect feedback',
  },
  {
    name: 'Subscription Paused',
    trigger: 'Status changes to Paused',
    properties: ['product'],
    useCase: 'Pause acknowledgment, re-engagement sequence',
  },
  {
    name: 'Subscription Reactivated',
    trigger: 'Status changes back to Active',
    properties: ['product'],
    useCase: 'Welcome back message, set expectations',
  },
  {
    name: 'Episode Shipped',
    trigger: 'Box number increments',
    properties: ['episode_number', 'product', 'sku'],
    useCase: 'Shipping notification, content unlock, tracking info',
  },
  {
    name: 'Switched to Digital',
    trigger: 'SKU changes to include "Digital"',
    properties: ['product', 'last_episode'],
    useCase: 'Digital onboarding, delivery expectations',
  },
  {
    name: 'Joined Discord',
    trigger: 'Discord user ID is added',
    properties: ['discord_user_id'],
    useCase: 'Community welcome, exclusive content announcement',
  },
  {
    name: 'Became At Risk',
    trigger: '2+ skips or delays',
    properties: ['product', 'skip_count', 'delay_count', 'reason'],
    useCase: 'Intervention campaign, special offer',
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#a1a1aa] rounded-md text-xs font-mono transition-colors"
    >
      {text}
      {copied ? (
        <Check className="w-3 h-3 text-[#5CB87A]" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  )
}

function PropertySection({ category, properties }: { category: string; properties: typeof PROFILE_PROPERTIES[0]['properties'] }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <span className="font-semibold text-white">{category}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#52525b]">{properties.length} properties</span>
          <ChevronDown className={`w-5 h-5 text-[#52525b] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-[rgba(255,255,255,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.02)]">
                  <th className="px-5 py-3 text-left text-[#71717a] font-medium">Property</th>
                  <th className="px-5 py-3 text-left text-[#71717a] font-medium">Type</th>
                  <th className="px-5 py-3 text-left text-[#71717a] font-medium">Values</th>
                  <th className="px-5 py-3 text-left text-[#71717a] font-medium">Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                {properties.map((prop) => (
                  <tr key={prop.name} className="hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-5 py-3">
                      <CopyButton text={prop.name} />
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        prop.type === 'Boolean' ? 'bg-purple-500/20 text-purple-400' :
                        prop.type === 'Number' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {prop.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#a1a1aa]">{prop.values}</td>
                    <td className="px-5 py-3 text-[#71717a]">{prop.useCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: typeof KLAVIYO_EVENTS[0] }) {
  return (
    <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[#e07a42]/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-white">{event.name}</h4>
        <Zap className="w-4 h-4 text-[#e07a42]" />
      </div>
      <p className="text-sm text-[#a1a1aa] mb-3">{event.trigger}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {event.properties.map((prop) => (
          <span key={prop} className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] text-[#71717a] rounded text-xs font-mono">
            {prop}
          </span>
        ))}
      </div>
      <p className="text-xs text-[#52525b]">{event.useCase}</p>
    </div>
  )
}

export default function KlaviyoPage() {
  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07a42] to-[#c56a35] flex items-center justify-center shadow-lg shadow-[#e07a42]/20">
          <Mail className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Klaviyo Integration</h1>
          <p className="text-[#71717a]">Profile properties & events for flows and segments</p>
        </div>
      </div>

      {/* Auto-Sync Banner */}
      <div className="mb-8 p-4 rounded-xl bg-[#5CB87A]/10 border border-[#5CB87A]/20 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-[#5CB87A] flex-shrink-0" />
        <p className="text-sm text-[#a1a1aa]">
          <span className="text-[#5CB87A] font-medium">Automatic sync enabled.</span>{' '}
          All properties below are automatically updated on customer profiles whenever their data changes.
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="mb-10 p-6 rounded-2xl bg-gradient-to-r from-[#e07a42]/10 to-purple-500/10 border border-[#e07a42]/20">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Start</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e07a42]/20 flex items-center justify-center flex-shrink-0">
              <Filter className="w-4 h-4 text-[#e07a42]" />
            </div>
            <div>
              <h4 className="font-medium text-white text-sm">Create Segments</h4>
              <p className="text-xs text-[#71717a] mt-1">Use profile properties to build targeted audience segments</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium text-white text-sm">Trigger Flows</h4>
              <p className="text-xs text-[#71717a] mt-1">Use events as flow triggers for automated sequences</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h4 className="font-medium text-white text-sm">Personalize Content</h4>
              <p className="text-xs text-[#71717a] mt-1">Use properties in email templates with dynamic blocks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl">
        {/* Profile Properties Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Profile Properties</h2>
              <p className="text-sm text-[#71717a]">Available on every customer profile in Klaviyo</p>
            </div>
          </div>

          <div className="space-y-4">
            {PROFILE_PROPERTIES.map((section) => (
              <PropertySection key={section.category} category={section.category} properties={section.properties} />
            ))}
          </div>
        </section>

        {/* Events Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Events (Metrics)</h2>
              <p className="text-sm text-[#71717a]">Triggered automatically when specific actions occur</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {KLAVIYO_EVENTS.map((event) => (
              <EventCard key={event.name} event={event} />
            ))}
          </div>
        </section>

        {/* Usage Examples */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Common Use Cases</h2>
              <p className="text-sm text-[#71717a]">Ready-to-use configurations for your flows and segments</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Example 1 */}
            <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <h4 className="font-semibold text-white mb-3">Episode-Specific Content Emails</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">1.</span>
                  <span className="text-[#a1a1aa]">Create Flow with trigger: <CopyButton text="Episode Shipped" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">2.</span>
                  <span className="text-[#a1a1aa]">Add Flow Filter: <CopyButton text="episode_number equals 3" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">3.</span>
                  <span className="text-[#a1a1aa]">Build email with episode 3 specific content</span>
                </div>
              </div>
            </div>

            {/* Example 2 */}
            <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <h4 className="font-semibold text-white mb-3">At-Risk Subscriber Segment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">1.</span>
                  <span className="text-[#a1a1aa]">Create Segment with definition:</span>
                </div>
                <div className="ml-5 p-3 bg-[rgba(255,255,255,0.02)] rounded-lg">
                  <CopyButton text="is_at_risk equals true" />
                </div>
              </div>
            </div>

            {/* Example 3 */}
            <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <h4 className="font-semibold text-white mb-3">Win-Back Flow for Cancelled Subscribers</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">1.</span>
                  <span className="text-[#a1a1aa]">Create Flow with trigger: <CopyButton text="Subscription Cancelled" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">2.</span>
                  <span className="text-[#a1a1aa]">Personalize using: <CopyButton text="cancel_reason" /> and <CopyButton text="last_episode" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">3.</span>
                  <span className="text-[#a1a1aa]">Add time delays between emails (3 days, 7 days, 14 days)</span>
                </div>
              </div>
            </div>

            {/* Example 4 */}
            <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <h4 className="font-semibold text-white mb-3">VIP Customer Segment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">1.</span>
                  <span className="text-[#a1a1aa]">Create Segment with definition:</span>
                </div>
                <div className="ml-5 p-3 bg-[rgba(255,255,255,0.02)] rounded-lg space-y-1">
                  <div><CopyButton text="is_vip equals true" /></div>
                  <div className="text-[#52525b] text-xs">OR</div>
                  <div><CopyButton text="is_yearly equals true" /></div>
                </div>
              </div>
            </div>

            {/* Example 5 */}
            <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <h4 className="font-semibold text-white mb-3">Journey Stage Email Personalization</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#52525b]">1.</span>
                  <span className="text-[#a1a1aa]">Use conditional blocks in emails based on:</span>
                </div>
                <div className="ml-5 p-3 bg-[rgba(255,255,255,0.02)] rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <CopyButton text="journey_stage equals early" />
                    <span className="text-[#52525b]">→ Show onboarding tips</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton text="journey_stage equals middle" />
                    <span className="text-[#52525b]">→ Share community features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton text="journey_stage equals late" />
                    <span className="text-[#52525b]">→ Promote renewal options</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton text="journey_stage equals complete" />
                    <span className="text-[#52525b]">→ Offer next adventure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Help Section */}
        <section className="p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
          <h3 className="font-semibold text-white mb-2">Need Help?</h3>
          <p className="text-sm text-[#a1a1aa] mb-4">
            These properties are automatically synced to Klaviyo profiles whenever subscriber data changes.
            If you&apos;re not seeing expected data, check that the subscriber has the corresponding field filled in their profile.
          </p>
          <p className="text-sm text-[#52525b]">
            For custom properties or additional events, contact your Backstage support team.
          </p>
        </section>
      </div>
    </main>
  )
}
