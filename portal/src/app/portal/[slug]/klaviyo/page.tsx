'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Copy, Check, ChevronDown, Zap, User, Filter, Target } from 'lucide-react';

// Profile properties synced from Airtable to Klaviyo
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
      { name: 'is_vip', type: 'Boolean', values: 'true, false', description: 'Tagged as VIP in Airtable', useCase: 'VIP segments' },
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
];

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
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-background-elevated hover:bg-border text-foreground-secondary rounded-md text-xs font-mono transition-colors"
    >
      {text}
      {copied ? (
        <Check className="w-3 h-3 text-success" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}

function PropertySection({ category, properties }: { category: string; properties: typeof PROFILE_PROPERTIES[0]['properties'] }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-background-elevated/50 transition-colors bg-background-secondary"
      >
        <span className="font-semibold text-foreground">{category}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-tertiary">{properties.length} properties</span>
          <ChevronDown className={`w-5 h-5 text-foreground-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-elevated/50">
                  <th className="px-5 py-3 text-left text-foreground-secondary font-medium">Property</th>
                  <th className="px-5 py-3 text-left text-foreground-secondary font-medium">Type</th>
                  <th className="px-5 py-3 text-left text-foreground-secondary font-medium">Values</th>
                  <th className="px-5 py-3 text-left text-foreground-secondary font-medium">Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {properties.map((prop) => (
                  <tr key={prop.name} className="hover:bg-background-elevated/30">
                    <td className="px-5 py-3">
                      <CopyButton text={prop.name} />
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        prop.type === 'Boolean' ? 'bg-purple-100 text-purple-700' :
                        prop.type === 'Number' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {prop.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-foreground-secondary">{prop.values}</td>
                    <td className="px-5 py-3 text-foreground-tertiary">{prop.useCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: typeof KLAVIYO_EVENTS[0] }) {
  return (
    <div className="p-5 bg-background-secondary rounded-xl border border-border hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-foreground">{event.name}</h4>
        <Zap className="w-4 h-4 text-accent" />
      </div>
      <p className="text-sm text-foreground-secondary mb-3">{event.trigger}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {event.properties.map((prop) => (
          <span key={prop} className="px-2 py-0.5 bg-background-elevated text-foreground-tertiary rounded text-xs font-mono">
            {prop}
          </span>
        ))}
      </div>
      <p className="text-xs text-foreground-tertiary">{event.useCase}</p>
    </div>
  );
}

export default function KlaviyoPage() {
  const params = useParams();
  const clientSlug = params.slug as string;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/portal/${clientSlug}`}
              className="text-foreground-secondary hover:text-foreground transition-colors"
            >
              &larr; Back to Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Klaviyo Properties Reference</h1>
            <p className="text-foreground-secondary">All synced properties and events for flows & segments</p>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mb-12 p-6 bg-gradient-to-r from-accent/10 to-purple-500/10 rounded-2xl border border-accent/20">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Start</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Filter className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">Create Segments</h4>
                <p className="text-xs text-foreground-secondary mt-1">Use profile properties to build targeted audience segments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">Trigger Flows</h4>
                <p className="text-xs text-foreground-secondary mt-1">Use events as flow triggers for automated sequences</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm">Personalize Content</h4>
                <p className="text-xs text-foreground-secondary mt-1">Use properties in email templates with dynamic blocks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Properties Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Profile Properties</h2>
              <p className="text-sm text-foreground-secondary">Synced automatically when data changes in Airtable</p>
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
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Events (Metrics)</h2>
              <p className="text-sm text-foreground-secondary">Triggered automatically when specific actions occur</p>
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
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Common Use Cases</h2>
              <p className="text-sm text-foreground-secondary">Ready-to-use configurations for your flows and segments</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Example 1 */}
            <div className="p-5 bg-background-secondary rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-2">Episode-Specific Content Emails</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">1.</span>
                  <span className="text-foreground-secondary">Create Flow with trigger: <CopyButton text="Episode Shipped" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">2.</span>
                  <span className="text-foreground-secondary">Add Flow Filter: <CopyButton text="episode_number equals 3" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">3.</span>
                  <span className="text-foreground-secondary">Build email with episode 3 specific content</span>
                </div>
              </div>
            </div>

            {/* Example 2 */}
            <div className="p-5 bg-background-secondary rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-2">At-Risk Subscriber Segment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">1.</span>
                  <span className="text-foreground-secondary">Create Segment with definition:</span>
                </div>
                <div className="ml-5 p-3 bg-background-elevated rounded-lg font-mono text-xs text-foreground-secondary">
                  <CopyButton text="is_at_risk equals true" />
                </div>
              </div>
            </div>

            {/* Example 3 */}
            <div className="p-5 bg-background-secondary rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-2">Win-Back Flow for Cancelled Subscribers</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">1.</span>
                  <span className="text-foreground-secondary">Create Flow with trigger: <CopyButton text="Subscription Cancelled" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">2.</span>
                  <span className="text-foreground-secondary">Personalize using: <CopyButton text="cancel_reason" /> and <CopyButton text="last_episode" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">3.</span>
                  <span className="text-foreground-secondary">Add time delays between emails (3 days, 7 days, 14 days)</span>
                </div>
              </div>
            </div>

            {/* Example 4 */}
            <div className="p-5 bg-background-secondary rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-2">VIP Customer Segment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">1.</span>
                  <span className="text-foreground-secondary">Create Segment with definition:</span>
                </div>
                <div className="ml-5 p-3 bg-background-elevated rounded-lg font-mono text-xs text-foreground-secondary space-y-1">
                  <div><CopyButton text="is_vip equals true" /></div>
                  <div className="text-foreground-tertiary">OR</div>
                  <div><CopyButton text="is_yearly equals true" /></div>
                </div>
              </div>
            </div>

            {/* Example 5 */}
            <div className="p-5 bg-background-secondary rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-2">Journey Stage Email Personalization</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-foreground-tertiary">1.</span>
                  <span className="text-foreground-secondary">Use conditional blocks in emails based on:</span>
                </div>
                <div className="ml-5 p-3 bg-background-elevated rounded-lg font-mono text-xs text-foreground-secondary space-y-1">
                  <div><CopyButton text="journey_stage equals early" /> - Show onboarding tips</div>
                  <div><CopyButton text="journey_stage equals middle" /> - Share community features</div>
                  <div><CopyButton text="journey_stage equals late" /> - Promote renewal options</div>
                  <div><CopyButton text="journey_stage equals complete" /> - Offer next adventure</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Help Section */}
        <section className="p-6 bg-background-secondary rounded-2xl border border-border">
          <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
          <p className="text-sm text-foreground-secondary mb-4">
            These properties sync automatically whenever data changes in your Airtable. If you&apos;re not seeing expected data in Klaviyo,
            check that the subscriber has the corresponding field filled in Airtable.
          </p>
          <p className="text-sm text-foreground-tertiary">
            For custom properties or additional events, contact your SubscriberSync support team.
          </p>
        </section>
      </div>
    </div>
  );
}
