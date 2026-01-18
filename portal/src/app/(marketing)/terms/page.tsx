import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0c0c0c]/80 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="SubscriberSync" className="h-8" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#a1a1aa] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-[#666] mb-8">Last updated: January 18, 2026</p>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                Everlore Hollow, LLC d/b/a SubscriberSync ("The Company", "we", "us", or "our") operates the SubscriberSync platform and related services. By accessing or using our services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Services</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                SubscriberSync is a subscription management platform that provides tools for managing subscription box businesses, including subscriber management, shipping automation, and integration with third-party services such as Shopify, Recharge, Klaviyo, and ShipStation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Account Registration</h2>
              <p className="text-[#a1a1aa] leading-relaxed mb-4">
                To use our services, you must create an account and provide accurate, complete, and current information. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li>Ensuring that your use complies with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Subscription and Payment</h2>
              <p className="text-[#a1a1aa] leading-relaxed mb-4">
                Our services are provided on a subscription basis. By subscribing, you agree to:
              </p>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li>Pay all fees associated with your subscription plan</li>
                <li>Provide valid payment information</li>
                <li>Authorize us to charge your payment method on a recurring basis</li>
              </ul>
              <p className="text-[#a1a1aa] leading-relaxed mt-4">
                Subscriptions automatically renew unless canceled before the renewal date. After three (3) failed payment attempts, your account may be suspended until payment is resolved.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Cancellation and Refunds</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                You may cancel your subscription at any time through your account settings or by contacting support. Cancellations take effect at the end of the current billing period. We do not provide refunds for partial months of service or unused features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Acceptable Use</h2>
              <p className="text-[#a1a1aa] leading-relaxed mb-4">
                You agree not to use our services to:
              </p>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful code or malware</li>
                <li>Interfere with or disrupt our services</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Collect or harvest user data without consent</li>
                <li>Engage in any activity that could harm The Company or other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Third-Party Integrations</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                Our services integrate with third-party platforms including Shopify, Recharge, Klaviyo, and ShipStation. Your use of these integrations is subject to the respective third party's terms of service and privacy policies. We are not responsible for the availability, accuracy, or performance of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Intellectual Property</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                The SubscriberSync platform, including its design, features, and content, is owned by The Company and protected by intellectual property laws. You retain ownership of your data but grant us a license to use it as necessary to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Data and Privacy</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                Your use of our services is also governed by our <Link href="/privacy" className="text-[#e07a42] hover:underline">Privacy Policy</Link>, which describes how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Disclaimer of Warranties</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                Our services are provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that our services will be uninterrupted, secure, or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Limitation of Liability</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                To the maximum extent permitted by law, The Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Indemnification</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                You agree to indemnify and hold harmless The Company and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of our services or violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Modifications to Terms</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify you of significant changes by email or through our platform. Your continued use of our services after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">14. Governing Law</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">15. Contact Information</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-[#a1a1aa] mt-4">
                <strong className="text-white">Everlore Hollow, LLC</strong><br />
                Email: <a href="mailto:support@subscribersync.com" className="text-[#e07a42] hover:underline">support@subscribersync.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto text-center text-sm text-[#666]">
          <p>&copy; {new Date().getFullYear()} SubscriberSync. All rights reserved.</p>
          <p className="mt-1 text-[#555]">SubscriberSync is a product of Everlore Hollow, LLC.</p>
        </div>
      </footer>
    </div>
  )
}
