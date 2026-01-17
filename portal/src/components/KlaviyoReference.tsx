'use client'

import { useState } from 'react'

interface AccordionItemProps {
  title: string
  icon: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function AccordionItem({ title, icon, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-background-elevated/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-foreground-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-200 ease-out
          ${isOpen ? 'max-h-[500px]' : 'max-h-0'}
        `}
      >
        <div className="px-5 pb-5 pt-2 border-t border-border">
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
      className="inline-flex items-center gap-2 px-2.5 py-1 bg-background-elevated text-accent text-sm rounded-lg cursor-pointer hover:bg-background-elevated/80 transition-colors font-mono"
      onClick={handleCopy}
    >
      {children}
      <span className={`text-xs ${isCopied ? 'text-success' : 'text-foreground-tertiary'}`}>
        {isCopied ? 'Copied' : ''}
      </span>
    </code>
  )
}

export default function KlaviyoReference() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-headline text-foreground mb-2">Klaviyo Integration</h3>
        <p className="text-foreground-secondary">Email automation guides</p>
      </div>

      <div className="space-y-3">
        <AccordionItem
          icon="📧"
          title="Trigger email for specific box number"
          defaultOpen={true}
        >
          <ol className="space-y-3 text-foreground-secondary">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/10 text-accent text-xs font-medium flex items-center justify-center">1</span>
              <span>Create new Flow in Klaviyo</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/10 text-accent text-xs font-medium flex items-center justify-center">2</span>
              <span className="flex flex-wrap items-center gap-2">
                Trigger: Metric → <CodeBlock>Box Shipped</CodeBlock>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/10 text-accent text-xs font-medium flex items-center justify-center">3</span>
              <span className="flex flex-wrap items-center gap-2">
                Flow Filter: <CodeBlock>box_number equals 3</CodeBlock>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/10 text-accent text-xs font-medium flex items-center justify-center">4</span>
              <span>Build your email</span>
            </li>
          </ol>
        </AccordionItem>

        <AccordionItem icon="👥" title="Segment by subscription status">
          <ol className="space-y-3 text-foreground-secondary">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/10 text-accent text-xs font-medium flex items-center justify-center">1</span>
              <span>Create new Segment</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-accent/10 text-accent text-xs font-medium flex items-center justify-center">2</span>
              <span className="flex flex-wrap items-center gap-2">
                Condition: <CodeBlock>current_box is at least 5</CodeBlock>
              </span>
            </li>
          </ol>
        </AccordionItem>

        <AccordionItem icon="📊" title="Profile properties reference">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 text-left text-foreground-secondary font-medium">Property</th>
                  <th className="py-3 text-left text-foreground-secondary font-medium">Values</th>
                  <th className="py-3 text-left text-foreground-secondary font-medium">Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3"><CodeBlock>subscriber_status</CodeBlock></td>
                  <td className="py-3 text-foreground-secondary">active, paused, cancelled</td>
                  <td className="py-3 text-foreground-tertiary">Segments</td>
                </tr>
                <tr>
                  <td className="py-3"><CodeBlock>current_box</CodeBlock></td>
                  <td className="py-3 text-foreground-secondary">1, 2, 3...</td>
                  <td className="py-3 text-foreground-tertiary">Flow triggers</td>
                </tr>
                <tr>
                  <td className="py-3"><CodeBlock>subscription_start</CodeBlock></td>
                  <td className="py-3 text-foreground-secondary">Date</td>
                  <td className="py-3 text-foreground-tertiary">Anniversary flows</td>
                </tr>
                <tr>
                  <td className="py-3"><CodeBlock>next_charge_date</CodeBlock></td>
                  <td className="py-3 text-foreground-secondary">Date</td>
                  <td className="py-3 text-foreground-tertiary">Reminders</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AccordionItem>
      </div>
    </div>
  )
}
