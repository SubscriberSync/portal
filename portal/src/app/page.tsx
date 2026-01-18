import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  BarChart3,
  Truck,
  Check,
  Mail,
  Zap,
  Shield,
} from 'lucide-react'
import CheckoutForm from '@/components/CheckoutForm'

export default async function HomePage({
  searchParams,
}: {
  searchParams: { canceled?: string }
}) {
  const { userId, orgSlug } = await auth()

  // Has an active organization - redirect to their portal
  if (userId && orgSlug) {
    redirect(`/portal/${orgSlug}`)
  }

  // Signed in but no organization - show org selection
  if (userId) {
    const user = await currentUser()
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-2xl border border-[var(--glass-border)] p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#0c0c0c]">B</span>
              </div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                Welcome to SubscriberSync
              </h1>
              <p className="text-[var(--foreground-secondary)]">
                Hi {user?.firstName || 'there'}! Select or create an organization to get started.
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/create-organization"
                className="block w-full py-3 px-4 bg-[var(--accent)] text-[#0c0c0c] font-semibold rounded-xl text-center hover:opacity-90 transition-opacity"
              >
                Create Organization
              </Link>

              <p className="text-center text-sm text-[var(--foreground-tertiary)]">
                Or ask your admin to invite you to an existing organization.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not signed in - show landing page
  const canceled = searchParams.canceled === 'true'

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0c0c0c]/80 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="SubscriberSync" className="h-8" />
          </div>
          <Link
            href="/sign-in"
            className="px-4 py-2 text-sm text-[#a1a1aa] hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {canceled && (
            <div className="mb-8 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              Checkout was canceled. Ready to try again when you are!
            </div>
          )}

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your Premium Subscriber
            <br />
            <span className="text-[#e07a42]">Command Center</span>
          </h1>

          <p className="text-xl text-[#a1a1aa] mb-8 max-w-2xl mx-auto">
            Manage your subscription box business with powerful automation.
            Sync subscribers, automate shipping, and delight customers.
          </p>

          <div className="flex items-center justify-center gap-4 text-sm text-[#666] mb-12">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#5CB87A]" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#5CB87A]" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#5CB87A]" />
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-[#111]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to run your subscription box
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Subscriber Management"
              description="Sync from Recharge, track box numbers, manage preferences, and see your entire subscriber base at a glance."
            />
            <FeatureCard
              icon={<Truck className="w-8 h-8" />}
              title="Shipping Automation"
              description="Generate labels in bulk, merge shipments automatically, and integrate with ShipStation seamlessly."
            />
            <FeatureCard
              icon={<Mail className="w-8 h-8" />}
              title="Klaviyo Integration"
              description="Automatic profile syncing with custom properties for powerful email flows and segmentation."
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Real-time Analytics"
              description="Track shipments, monitor packing progress, and get insights into your fulfillment operations."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6" id="pricing">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-[#a1a1aa] text-center mb-12">
            One plan, everything included. Start your 14-day free trial today.
          </p>

          <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-8">
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-bold">$49</span>
                <span className="text-[#666]">/month</span>
              </div>
              <p className="text-[#a1a1aa]">per portal</p>
            </div>

            <div className="space-y-3 mb-8">
              <PricingFeature text="Unlimited subscribers" />
              <PricingFeature text="Unlimited shipments" />
              <PricingFeature text="Recharge & Shopify sync" />
              <PricingFeature text="Klaviyo integration" />
              <PricingFeature text="ShipStation integration" />
              <PricingFeature text="Bulk label generation" />
              <PricingFeature text="Packing station interface" />
              <PricingFeature text="Team member access" />
              <PricingFeature text="Priority support" />
            </div>

            <CheckoutForm />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6 bg-[#111]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <Zap className="w-10 h-10 text-[#e07a42] mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Fast Setup</h3>
              <p className="text-sm text-[#a1a1aa]">
                Connect your accounts and start managing your subscribers in minutes.
              </p>
            </div>
            <div>
              <Shield className="w-10 h-10 text-[#e07a42] mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-sm text-[#a1a1aa]">
                Your data is encrypted and backed up. We take security seriously.
              </p>
            </div>
            <div>
              <Users className="w-10 h-10 text-[#e07a42] mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Built for Teams</h3>
              <p className="text-sm text-[#a1a1aa]">
                Invite your team members and collaborate on fulfillment together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="SubscriberSync" className="h-6" />
            </div>
            <div className="flex items-center gap-6 text-sm text-[#666]">
              <a href="mailto:support@subscribersync.com" className="hover:text-white transition-colors">
                Contact
              </a>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/sign-in" className="hover:text-white transition-colors">
                Sign In
              </Link>
            </div>
          </div>
          <div className="text-center text-sm text-[#666]">
            <p>&copy; {new Date().getFullYear()} SubscriberSync. All rights reserved.</p>
            <p className="mt-1 text-[#555]">SubscriberSync is a product of Everlore Hollow, LLC.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 rounded-xl bg-[#1a1a1a] border border-[#333] hover:border-[#e07a42]/50 transition-colors">
      <div className="text-[#e07a42] mb-4">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[#a1a1aa]">{description}</p>
    </div>
  )
}

function PricingFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <Check className="w-5 h-5 text-[#5CB87A] flex-shrink-0" />
      <span className="text-[#e5e5e5]">{text}</span>
    </div>
  )
}
