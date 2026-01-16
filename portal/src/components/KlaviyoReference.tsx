'use client'

import { useState } from 'react'

interface AccordionItemProps {
  title: string
  icon: string
  children: React.ReactNode
  defaultOpen?: boolean
  index: number
}

function AccordionItem({ title, icon, children, defaultOpen = false, index }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`
        relative border rounded-2xl overflow-hidden transition-all duration-500
        ${isOpen
          ? 'border-copper/30 bg-gradient-to-br from-copper/10 via-copper/5 to-transparent shadow-glow-sm'
          : 'border-slate-700/50 glass'}
      `}
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern-dense opacity-20" />
      {isOpen && (
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-copper/10 rounded-full blur-3xl" />
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-800/20 transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
              ${isOpen
                ? 'bg-gradient-to-br from-copper/30 to-copper/10 border border-copper/30'
                : 'glass border border-slate-700/50'}
              ${isHovered && !isOpen ? 'scale-105' : ''}
            `}
          >
            <span className="text-xl filter drop-shadow">{icon}</span>
          </div>
          <span
            className={`
              font-semibold transition-colors duration-300
              ${isOpen ? 'text-copper' : 'text-slate-200'}
            `}
          >
            {title}
          </span>
        </div>
        <div
          className={`
            w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
            ${isOpen ? 'bg-copper/20 rotate-180' : 'bg-slate-800/50'}
          `}
        >
          <svg
            className={`w-5 h-5 transition-colors ${isOpen ? 'text-copper' : 'text-slate-500'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-500 ease-out-expo
          ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-6 pb-6 pt-2 border-t border-slate-700/30">
          {children}
        </div>
      </div>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <code
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 text-copper font-data text-sm rounded-lg border border-slate-700/50 cursor-pointer hover:border-copper/30 hover:bg-slate-900 transition-all duration-200 group"
      onClick={handleCopy}
    >
      {children}
      <span className={`text-[10px] transition-opacity ${isCopied ? 'text-emerald-400' : 'text-slate-600 opacity-0 group-hover:opacity-100'}`}>
        {isCopied ? 'Copied!' : 'Click to copy'}
      </span>
    </code>
  )
}

function StepNumber({ number }: { number: number }) {
  return (
    <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-copper/30 to-copper/10 text-copper rounded-lg flex items-center justify-center text-xs font-bold font-data border border-copper/20">
      {String(number).padStart(2, '0')}
    </span>
  )
}

export default function KlaviyoReference() {
  return (
    <section className="relative glass-strong rounded-3xl border border-slate-700/50 p-8 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div
        className="absolute -top-32 -left-32 w-64 h-64 bg-copper/10 rounded-full blur-3xl animate-morph"
        style={{ animationDuration: '18s' }}
      />

      <div className="relative">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-slate-700/50">
            <span className="text-2xl">🎯</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Klaviyo Integration</h2>
            <p className="text-xs text-slate-500 font-data tracking-wider">EMAIL AUTOMATION GUIDES</p>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
        </div>

        {/* Accordion items */}
        <div className="space-y-4">
          <AccordionItem
            icon="📧"
            title="Trigger email for specific box number"
            defaultOpen={true}
            index={0}
          >
            <ol className="space-y-4 text-slate-300">
              <li className="flex items-start gap-4">
                <StepNumber number={1} />
                <span>Create new Flow in Klaviyo</span>
              </li>
              <li className="flex items-start gap-4">
                <StepNumber number={2} />
                <span className="flex flex-wrap items-center gap-2">
                  Trigger: Metric → <CodeBlock>Box Shipped</CodeBlock>
                </span>
              </li>
              <li className="flex items-start gap-4">
                <StepNumber number={3} />
                <span className="flex flex-wrap items-center gap-2">
                  Flow Filter: <CodeBlock>box_number equals 3</CodeBlock>
                </span>
              </li>
              <li className="flex items-start gap-4">
                <StepNumber number={4} />
                <span>Build your email</span>
              </li>
            </ol>
          </AccordionItem>

          <AccordionItem icon="👥" title="Segment by subscription status" index={1}>
            <ol className="space-y-4 text-slate-300">
              <li className="flex items-start gap-4">
                <StepNumber number={1} />
                <span>Create new Segment</span>
              </li>
              <li className="flex items-start gap-4">
                <StepNumber number={2} />
                <span className="flex flex-wrap items-center gap-2">
                  Condition: <CodeBlock>current_box is at least 5</CodeBlock>
                </span>
              </li>
            </ol>
          </AccordionItem>

          <AccordionItem icon="📊" title="Profile properties reference" index={2}>
            <div className="overflow-hidden rounded-xl border border-slate-700/50 glass">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700/50">
                    <th className="px-5 py-4 text-left text-slate-400 font-semibold font-data text-xs uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-5 py-4 text-left text-slate-400 font-semibold font-data text-xs uppercase tracking-wider">
                      Values
                    </th>
                    <th className="px-5 py-4 text-left text-slate-400 font-semibold font-data text-xs uppercase tracking-wider">
                      Use Case
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <CodeBlock>subscriber_status</CodeBlock>
                    </td>
                    <td className="px-5 py-4 text-slate-300">active, paused, cancelled</td>
                    <td className="px-5 py-4 text-slate-500">Segments</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <CodeBlock>current_box</CodeBlock>
                    </td>
                    <td className="px-5 py-4 text-slate-300">1, 2, 3...</td>
                    <td className="px-5 py-4 text-slate-500">Flow triggers</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <CodeBlock>subscription_start</CodeBlock>
                    </td>
                    <td className="px-5 py-4 text-slate-300">Date</td>
                    <td className="px-5 py-4 text-slate-500">Anniversary flows</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <CodeBlock>next_charge_date</CodeBlock>
                    </td>
                    <td className="px-5 py-4 text-slate-300">Date</td>
                    <td className="px-5 py-4 text-slate-500">Reminders</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AccordionItem>
        </div>
      </div>
    </section>
  )
}
