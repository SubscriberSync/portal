'use client'

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

export default function CheckoutForm() {
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, companyName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      setError('Failed to start checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333] text-white placeholder-[#666] focus:outline-none focus:border-[#e07a42] focus:ring-1 focus:ring-[#e07a42] transition-colors"
        />
      </div>
      <div>
        <input
          type="text"
          placeholder="Company / Brand name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333] text-white placeholder-[#666] focus:outline-none focus:border-[#e07a42] focus:ring-1 focus:ring-[#e07a42] transition-colors"
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !email || !companyName}
        className="w-full px-6 py-3 rounded-lg bg-[#e07a42] hover:bg-[#c86a35] text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Redirecting to checkout...
          </>
        ) : (
          <>
            Get Started - $49/month
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
      <p className="text-xs text-[#666] text-center">
        Cancel anytime. No long-term contracts.
      </p>
    </form>
  )
}
