'use client'

import { useState } from 'react'

interface ReferenceItem {
  title: string
  content: React.ReactNode
}

export default function KlaviyoReference() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const references: ReferenceItem[] = [
    {
      title: 'Trigger email when someone gets Box 3',
      content: (
        <ol className="space-y-3 text-muted">
          <li className="flex gap-3">
            <span className="text-copper font-medium">1.</span>
            <span>Create a new Flow in Klaviyo</span>
          </li>
          <li className="flex gap-3">
            <span className="text-copper font-medium">2.</span>
            <span>Trigger: Metric → <code className="bg-ink px-2 py-0.5 rounded text-light">Box Shipped</code></span>
          </li>
          <li className="flex gap-3">
            <span className="text-copper font-medium">3.</span>
            <span>Add Flow Filter: <code className="bg-ink px-2 py-0.5 rounded text-light">box_number equals 3</code></span>
          </li>
          <li className="flex gap-3">
            <span className="text-copper font-medium">4.</span>
            <span>Build your email content</span>
          </li>
        </ol>
      ),
    },
    {
      title: 'Segment subscribers by box number',
      content: (
        <ol className="space-y-3 text-muted">
          <li className="flex gap-3">
            <span className="text-copper font-medium">1.</span>
            <span>Go to Audience → Lists & Segments</span>
          </li>
          <li className="flex gap-3">
            <span className="text-copper font-medium">2.</span>
            <span>Create Segment</span>
          </li>
          <li className="flex gap-3">
            <span className="text-copper font-medium">3.</span>
            <span>Condition: <code className="bg-ink px-2 py-0.5 rounded text-light">current_box is at least 5</code></span>
          </li>
        </ol>
      ),
    },
    {
      title: 'Available profile properties',
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted font-medium">Property</th>
                <th className="text-left py-2 text-muted font-medium">Values</th>
                <th className="text-left py-2 text-muted font-medium">Use for</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-b border-border/50">
                <td className="py-3"><code className="text-copper">subscriber_status</code></td>
                <td>active, paused, cancelled</td>
                <td>Segments, flow filters</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3"><code className="text-copper">current_box</code></td>
                <td>1, 2, 3, 4...</td>
                <td>Flow triggers, segments</td>
              </tr>
              <tr>
                <td className="py-3"><code className="text-copper">subscription_date</code></td>
                <td>Date</td>
                <td>Anniversary flows</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
  ]

  return (
    <div className="bg-slate rounded-2xl border border-border overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-light flex items-center gap-2">
          <span>🎯</span> Klaviyo Quick Reference
        </h2>
      </div>
      
      <div className="divide-y divide-border">
        {references.map((ref, index) => (
          <div key={index}>
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-ink/50 transition-colors"
            >
              <span className="font-medium text-light">{ref.title}</span>
              <svg
                className={`w-5 h-5 text-muted transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openIndex === index && (
              <div className="px-5 pb-5">
                <div className="p-4 bg-ink rounded-xl">
                  {ref.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
