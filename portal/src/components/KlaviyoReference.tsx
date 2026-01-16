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
    <div className={`
      border rounded-xl overflow-hidden transition-all duration-300
      ${isOpen ? 'border-copper/30 bg-slate-800/30' : 'border-slate-700/50 bg-slate-900/30'}
    `}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center transition-colors
            ${isOpen ? 'bg-copper/20' : 'bg-slate-800/80'}
          `}>
            <span className="text-lg">{icon}</span>
          </div>
          <span className={`font-medium transition-colors ${isOpen ? 'text-copper' : 'text-slate-200'}`}>
            {title}
          </span>
        </div>
        <svg 
          className={`w-5 h-5 transition-all duration-300 ${isOpen ? 'rotate-180 text-copper' : 'text-slate-500'}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div className={`
        overflow-hidden transition-all duration-300 ease-out
        ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
      `}>
        <div className="px-5 pb-5 pt-2 border-t border-slate-700/30">
          {children}
        </div>
      </div>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <code className="px-2 py-1 bg-slate-900 text-copper font-data text-sm rounded border border-slate-700/50">
      {children}
    </code>
  )
}

export default function KlaviyoReference() {
  return (
    <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
          <span>🎯</span>
        </div>
        <h2 className="text-lg font-semibold text-slate-100">Klaviyo Integration</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
      </div>
      
      <div className="space-y-3">
        <AccordionItem 
          icon="📧" 
          title="Trigger email for specific box number"
          defaultOpen={true}
        >
          <ol className="space-y-3 text-slate-300 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-copper/20 text-copper rounded-lg flex items-center justify-center text-xs font-bold font-data">01</span>
              <span>Create new Flow in Klaviyo</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-copper/20 text-copper rounded-lg flex items-center justify-center text-xs font-bold font-data">02</span>
              <span>Trigger: Metric → <CodeBlock>Box Shipped</CodeBlock></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-copper/20 text-copper rounded-lg flex items-center justify-center text-xs font-bold font-data">03</span>
              <span>Flow Filter: <CodeBlock>box_number equals 3</CodeBlock></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-copper/20 text-copper rounded-lg flex items-center justify-center text-xs font-bold font-data">04</span>
              <span>Build your email</span>
            </li>
          </ol>
        </AccordionItem>
        
        <AccordionItem icon="👥" title="Segment by subscription status">
          <ol className="space-y-3 text-slate-300 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-copper/20 text-copper rounded-lg flex items-center justify-center text-xs font-bold font-data">01</span>
              <span>Create new Segment</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-copper/20 text-copper rounded-lg flex items-center justify-center text-xs font-bold font-data">02</span>
              <span>Condition: <CodeBlock>current_box is at least 5</CodeBlock></span>
            </li>
          </ol>
        </AccordionItem>
        
        <AccordionItem icon="📊" title="Profile properties reference">
          <div className="overflow-hidden rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80">
                  <th className="px-4 py-3 text-left text-slate-400 font-medium font-data text-xs uppercase tracking-wider">Property</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium font-data text-xs uppercase tracking-wider">Values</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium font-data text-xs uppercase tracking-wider">Use Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3"><CodeBlock>subscriber_status</CodeBlock></td>
                  <td className="px-4 py-3 text-slate-300">active, paused, cancelled</td>
                  <td className="px-4 py-3 text-slate-500">Segments</td>
                </tr>
                <tr className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3"><CodeBlock>current_box</CodeBlock></td>
                  <td className="px-4 py-3 text-slate-300">1, 2, 3...</td>
                  <td className="px-4 py-3 text-slate-500">Flow triggers</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AccordionItem>
      </div>
    </section>
  )
}
