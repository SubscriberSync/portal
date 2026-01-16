import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ParticleField from '@/components/ParticleField'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'SubscriberSync Portal',
  description: 'Your subscriber journey system dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className={`${inter.className} bg-[#0a0c10] text-slate-100 antialiased overflow-x-hidden`}>
        {/* Animated background container */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0c10] via-[#0d1117] to-[#0a0c10]" />

          {/* Grid pattern with fade */}
          <div className="absolute inset-0 grid-pattern opacity-40" />
          <div className="absolute inset-0 grid-pattern-dense opacity-20" />

          {/* Morphing gradient orbs */}
          <div
            className="absolute top-[-10%] left-[15%] w-[600px] h-[600px] bg-copper/8 rounded-full blur-[120px] animate-morph animate-float-complex"
            style={{ animationDuration: '15s' }}
          />
          <div
            className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-copper/6 rounded-full blur-[100px] animate-morph animate-float-complex"
            style={{ animationDelay: '3s', animationDuration: '18s' }}
          />
          <div
            className="absolute top-[40%] right-[-5%] w-[400px] h-[400px] bg-emerald-500/4 rounded-full blur-[80px] animate-morph animate-float-complex"
            style={{ animationDelay: '6s', animationDuration: '20s' }}
          />
          <div
            className="absolute bottom-[-10%] left-[30%] w-[350px] h-[350px] bg-purple-500/3 rounded-full blur-[100px] animate-morph animate-float-complex"
            style={{ animationDelay: '9s', animationDuration: '22s' }}
          />

          {/* Orbiting accent */}
          <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2">
            <div
              className="absolute w-3 h-3 bg-copper/40 rounded-full blur-sm animate-orbit"
              style={{ animationDuration: '30s' }}
            />
            <div
              className="absolute w-2 h-2 bg-emerald-400/30 rounded-full blur-sm animate-orbit"
              style={{ animationDuration: '45s', animationDelay: '-15s' }}
            />
          </div>

          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-[#0a0c10]/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10]/30 via-transparent to-[#0a0c10]/30" />

          {/* Corner glows */}
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-copper/5 to-transparent opacity-50" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-copper/3 to-transparent opacity-40" />
        </div>

        {/* Interactive particle field */}
        <ParticleField />

        {/* Scan line effect */}
        <div className="scan-line" />

        {/* Noise texture overlay */}
        <div className="fixed inset-0 pointer-events-none noise-overlay opacity-50" />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  )
}
