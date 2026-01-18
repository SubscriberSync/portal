import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-[#666] mb-8">Last updated: January 18, 2026</p>

          <div className="prose prose-invert prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                Everlore Hollow, LLC d/b/a SubscriberSync ("The Company", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our SubscriberSync platform and related services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li><strong>Account Information:</strong> Name, email address, company name, and password when you create an account</li>
                <li><strong>Payment Information:</strong> Credit card details and billing address (processed securely by Stripe)</li>
                <li><strong>Business Data:</strong> Subscriber information, shipping addresses, order data, and product information you upload or sync to our platform</li>
                <li><strong>Communications:</strong> Information you provide when contacting support or communicating with us</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">2.2 Information Collected Automatically</h3>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li><strong>Usage Data:</strong> How you interact with our services, features used, and actions taken</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers</li>
                <li><strong>Cookies:</strong> We use cookies and similar technologies for authentication and analytics</li>
              </ul>

              <h3 className="text-xl font-medium text-white mb-3 mt-6">2.3 Information from Third Parties</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                When you connect third-party services (Shopify, Recharge, Klaviyo, ShipStation), we receive data from those platforms as authorized by you, including customer information, order data, and shipping details.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-[#a1a1aa] leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Sync data between connected third-party platforms</li>
                <li>Send administrative notifications and service updates</li>
                <li>Respond to your comments, questions, and support requests</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. How We Share Your Information</h2>
              <p className="text-[#a1a1aa] leading-relaxed mb-4">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li><strong>Service Providers:</strong> With third parties who perform services on our behalf (payment processing, hosting, analytics)</li>
                <li><strong>Connected Platforms:</strong> With third-party services you authorize (Shopify, Recharge, Klaviyo, ShipStation)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
              <p className="text-[#a1a1aa] leading-relaxed mt-4">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Data Retention</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide you services. We may retain certain information as required by law or for legitimate business purposes, such as resolving disputes and enforcing our agreements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Data Security</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                We implement appropriate technical and organizational measures to protect your information, including encryption of data in transit and at rest, secure authentication, and regular security assessments. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights and Choices</h2>
              <p className="text-[#a1a1aa] leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate personal information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal requirements</li>
                <li><strong>Data Portability:</strong> Request your data in a machine-readable format</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
              </ul>
              <p className="text-[#a1a1aa] leading-relaxed mt-4">
                To exercise these rights, please contact us at <a href="mailto:support@subscribersync.com" className="text-[#e07a42] hover:underline">support@subscribersync.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Cookies and Tracking</h2>
              <p className="text-[#a1a1aa] leading-relaxed mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc list-inside text-[#a1a1aa] space-y-2">
                <li>Authenticate users and maintain session state</li>
                <li>Remember your preferences</li>
                <li>Analyze how our services are used</li>
                <li>Improve our services and user experience</li>
              </ul>
              <p className="text-[#a1a1aa] leading-relaxed mt-4">
                You can control cookies through your browser settings, though disabling certain cookies may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Third-Party Links</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                Our services may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Children's Privacy</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we learn that we have collected information from a child, we will take steps to delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. International Data Transfers</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. We take appropriate measures to ensure that your information receives adequate protection in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Changes to This Policy</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through our platform. Your continued use of our services after such modifications constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Contact Us</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-[#a1a1aa] mt-4">
                <strong className="text-white">Everlore Hollow, LLC</strong><br />
                Email: <a href="mailto:support@subscribersync.com" className="text-[#e07a42] hover:underline">support@subscribersync.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">14. California Privacy Rights</h2>
              <p className="text-[#a1a1aa] leading-relaxed">
                If you are a California resident, you may have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to delete your information, and the right to opt-out of the sale of personal information. As noted above, we do not sell personal information. To exercise your CCPA rights, please contact us at <a href="mailto:support@subscribersync.com" className="text-[#e07a42] hover:underline">support@subscribersync.com</a>.
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
