import { CheckCircle, Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#5CB87A]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#5CB87A]" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to SubscriberSync!
          </h1>

          <p className="text-[#a1a1aa] mb-8">
            Your subscription is now active. We've sent you an email to set up your account.
          </p>

          <div className="bg-[#0c0c0c] rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#e07a42]/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#e07a42]" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Check your inbox</p>
                <p className="text-sm text-[#666]">Look for an invitation email</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-[#a1a1aa] text-left">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center flex-shrink-0 text-xs font-semibold">1</span>
                <span>Open the invitation email from SubscriberSync</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center flex-shrink-0 text-xs font-semibold">2</span>
                <span>Click the link to create your account</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center flex-shrink-0 text-xs font-semibold">3</span>
                <span>Access your portal and start managing subscribers</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/sign-in"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#e07a42] text-white font-semibold rounded-xl hover:bg-[#c86a35] transition-colors"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-xs text-[#666]">
              Didn't receive the email? Check your spam folder or{' '}
              <a href="mailto:support@subscribersync.com" className="text-[#e07a42] hover:underline">
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
