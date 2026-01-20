import Link from 'next/link'
import { ArrowLeft, TrendingDown, CheckCircle, Clock, ExternalLink, Quote } from 'lucide-react'

export const metadata = {
  title: 'Case Study: Everlore Hollow | SubscriberSync',
  description: 'How Everlore Hollow eliminated pack day panic and reduced shipping costs by 15% with SubscriberSync.',
}

export default function CaseStudyPage() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0c0c0c]/80 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="SubscriberSync" className="h-8" />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/#pricing"
              className="px-4 py-2 text-sm text-[#a1a1aa] hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm text-[#a1a1aa] hover:text-white transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#e07a42]/10 text-[#e07a42] border border-[#e07a42]/20">
              Case Study
            </span>
            <span className="text-sm text-[#666]">Narrative Subscription Box</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            How Everlore Hollow Eliminated "Pack Day Panic" and Reduced Shipping Costs by{' '}
            <span className="text-[#5CB87A]">15%</span>
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-[#a1a1aa] mb-8">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">Company:</span>
              <a
                href="https://everlorehollow.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e07a42] hover:underline flex items-center gap-1"
              >
                Everlore Hollow
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">Industry:</span>
              <span>Sequential Subscription Box</span>
            </div>
          </div>

          {/* Key Results */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <ResultCard
              value="15%"
              label="Reduction in Shipping Costs"
              icon={<TrendingDown className="w-5 h-5" />}
            />
            <ResultCard
              value="0"
              label="Wrong Box Errors"
              icon={<CheckCircle className="w-5 h-5" />}
            />
            <ResultCard
              value="50%"
              label="Faster Packing"
              icon={<Clock className="w-5 h-5" />}
            />
          </div>
        </div>
      </section>

      {/* Challenge Section */}
      <section className="py-16 px-6 bg-[#111]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">The Challenge</h2>
          <p className="text-[#e07a42] font-medium mb-8">Managing sequential box history and merging add-on orders without a 3PL</p>

          <div className="prose prose-invert max-w-none">
            <h3 className="text-xl font-semibold text-white mb-4">The "Garage Phase" Problem</h3>
            
            <p className="text-[#a1a1aa] mb-6">
              For most subscription box owners, growth is a double-edged sword. For Everlore Hollow, 
              a narrative subscription experience that delivers sequential chapters of a story, growth meant complexity.
            </p>

            <p className="text-[#a1a1aa] mb-6">
              Unlike a standard "Month of the Month" club where everyone gets the same soap or coffee, 
              Everlore Hollow's subscribers are all on different timelines. Jane might be receiving Chapter 1, 
              while Mike is on Chapter 5.
            </p>

            <blockquote className="border-l-4 border-[#e07a42] pl-6 my-8 italic">
              <Quote className="w-8 h-8 text-[#e07a42]/30 mb-2" />
              <p className="text-lg text-white">
                "My garage looked like a war zone. I had stacks of Box 1, Box 2, and Box 5. 
                I was printing labels from Shopify, cross-referencing a spreadsheet to check shirt sizes, 
                and praying I didn't send a customer the same box twice."
              </p>
              <cite className="text-sm text-[#a1a1aa] not-italic mt-4 block">— Founder, Everlore Hollow</cite>
            </blockquote>

            <p className="text-[#a1a1aa] mb-6">
              As the subscriber count passed 100, the manual friction began to eat into margins:
            </p>

            <div className="space-y-4 mb-8">
              <PainPoint
                title="The 'Memory Game'"
                description="Shopify and Recharge are great at billing, but terrible at logistics. They couldn't easily tell the packer: 'This is Jane's 3rd month, give her Box 3.'"
              />
              <PainPoint
                title="The 'Double Ship' Leak"
                description="Customers frequently bought one-off items—like narrative-themed candles or teas—days before their subscription renewed. This resulted in shipping two separate boxes to the same house in the same week, doubling postage costs."
              />
              <PainPoint
                title="Pack Day Anxiety"
                description="Printing labels in random order meant running back and forth across the room to find the right inventory."
              />
            </div>

            <p className="text-[#a1a1aa]">
              Everlore Hollow needed a <strong className="text-white">Warehouse Operating System</strong>, 
              but wasn't big enough for an expensive 3PL contract.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">The Solution</h2>
          <p className="text-[#e07a42] font-medium mb-8">SubscriberSync as the "Logic Layer"</p>

          <div className="prose prose-invert max-w-none">
            <p className="text-[#a1a1aa] mb-8">
              Everlore Hollow implemented SubscriberSync to act as the "Logic Layer" between their 
              billing system (Recharge) and their physical fulfillment.
            </p>

            {/* Solution 1 */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-8 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-[#e07a42] flex items-center justify-center text-sm font-bold text-[#0c0c0c]">1</span>
                <h3 className="text-xl font-semibold text-white">The Forensic Audit</h3>
              </div>
              <p className="text-[#a1a1aa] mb-4">
                The first step was trust. Everlore Hollow ran SubscriberSync's <strong className="text-white">Forensic Audit</strong> tool. 
                Instead of trusting the subscription "charge count" (which breaks if a customer pauses or skips), 
                the engine scanned 3 years of Shopify shipping history.
              </p>
              <p className="text-[#a1a1aa]">
                It reconstructed a perfect timeline for every subscriber. The system flagged 5 "Time Travelers"—customers 
                who had somehow received Box 5 before Box 2 due to manual errors in the past—allowing the founder 
                to fix the sequence before the next ship date.
              </p>
            </div>

            {/* Solution 2 */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-8 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-[#e07a42] flex items-center justify-center text-sm font-bold text-[#0c0c0c]">2</span>
                <h3 className="text-xl font-semibold text-white">The "Sidecar" Merge</h3>
              </div>
              <p className="text-[#a1a1aa] mb-4">
                This was the immediate ROI. SubscriberSync introduced <strong className="text-white">Smart Merging</strong>.
              </p>
              <p className="text-[#a1a1aa] mb-4">
                When a subscriber purchased a "Lavender Candle" on Tuesday, SubscriberSync checked their renewal date. 
                Seeing a subscription renewal coming on Friday, the system automatically held the candle order.
              </p>
              <p className="text-[#a1a1aa] mb-6">
                On Friday, the system generated a single shipment: <strong className="text-white">Chapter 5 Box + Lavender Candle</strong>.
              </p>
              <blockquote className="border-l-4 border-[#5CB87A] pl-6 italic">
                <p className="text-white">
                  "We saved about $8 in shipping on that single order. Multiply that by 15-20 customers a month, 
                  and the software pays for itself instantly."
                </p>
                <cite className="text-sm text-[#a1a1aa] not-italic mt-2 block">— Founder, Everlore Hollow</cite>
              </blockquote>
            </div>

            {/* Solution 3 */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-[#e07a42] flex items-center justify-center text-sm font-bold text-[#0c0c0c]">3</span>
                <h3 className="text-xl font-semibold text-white">Pack Mode</h3>
              </div>
              <p className="text-[#a1a1aa] mb-4">
                The chaos of the garage was replaced by the <strong className="text-white">Dual-Screen Pack Mode</strong>.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0c0c0c] rounded-xl p-4 border border-[#333]">
                  <h4 className="font-medium text-white mb-2">TV Scoreboard</h4>
                  <p className="text-sm text-[#a1a1aa]">
                    Mounted on the wall, showing the batch progress and velocity.
                  </p>
                </div>
                <div className="bg-[#0c0c0c] rounded-xl p-4 border border-[#333]">
                  <h4 className="font-medium text-white mb-2">iPad Station</h4>
                  <p className="text-sm text-[#a1a1aa]">
                    Showing only one order at a time with clear instructions.
                  </p>
                </div>
              </div>
              <p className="text-[#a1a1aa]">
                Now, instead of hunting through a stack of labels, the packer simply looks at the iPad. 
                It displays: "Chapter 5 - Large Shirt." Crucially, if a "Sidecar" item is present, 
                the interface locks the "Finish" button until the packer toggles the "Candle" checklist item.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16 px-6 bg-[#111]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">The Results</h2>
          <p className="text-[#e07a42] font-medium mb-8">From stressful burden to streamlined assembly line</p>

          <p className="text-[#a1a1aa] mb-8">
            By switching to SubscriberSync, Everlore Hollow transformed their fulfillment from a 
            stressful administrative burden into a streamlined assembly line.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 text-center">
              <div className="text-4xl font-bold text-[#5CB87A] mb-2">15%</div>
              <div className="text-white font-medium mb-1">Reduction in Shipping Costs</div>
              <p className="text-sm text-[#a1a1aa]">Driven by the "Sidecar" feature merging one-off orders</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 text-center">
              <div className="text-4xl font-bold text-[#5CB87A] mb-2">Zero</div>
              <div className="text-white font-medium mb-1">"Wrong Box" Errors</div>
              <p className="text-sm text-[#a1a1aa]">Sequential logic ensured no duplicate chapters</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 text-center">
              <div className="text-4xl font-bold text-[#5CB87A] mb-2">50%</div>
              <div className="text-white font-medium mb-1">Faster Packing</div>
              <p className="text-sm text-[#a1a1aa]">Sorting by product type eliminated context-switching</p>
            </div>
          </div>

          <blockquote className="border-l-4 border-[#e07a42] pl-6 my-8 italic bg-[#1a1a1a] rounded-r-2xl p-6">
            <Quote className="w-8 h-8 text-[#e07a42]/30 mb-2" />
            <p className="text-xl text-white">
              "It feels like I hired a Warehouse Manager who never sleeps. 
              I just print the batch, launch the iPad, and Pack."
            </p>
            <cite className="text-sm text-[#a1a1aa] not-italic mt-4 block">— Founder, Everlore Hollow</cite>
          </blockquote>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to eliminate your pack day panic?
          </h2>
          <p className="text-[#a1a1aa] mb-8">
            Start your 14-day free trial and see how SubscriberSync can transform your fulfillment.
          </p>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#e07a42] text-white font-semibold rounded-xl hover:bg-[#c96835] transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="SubscriberSync" className="h-6" />
            </Link>
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
          </div>
        </div>
      </footer>
    </div>
  )
}

function ResultCard({
  value,
  label,
  icon,
}: {
  value: string
  label: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-[#5CB87A]/10 flex items-center justify-center text-[#5CB87A]">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-[#5CB87A]">{value}</div>
        <div className="text-sm text-[#a1a1aa]">{label}</div>
      </div>
    </div>
  )
}

function PainPoint({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4 p-4 bg-[#1a1a1a] rounded-xl border border-[#333]">
      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
      <div>
        <h4 className="font-medium text-white mb-1">{title}</h4>
        <p className="text-sm text-[#a1a1aa]">{description}</p>
      </div>
    </div>
  )
}
