import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Backstage',
  description: 'Your premium subscriber command center',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmMono.variable}`}>
      <body className={`${inter.className} bg-[#0c0c0c] text-white antialiased`}>
        {/* Liquid Glass background with burnt orange ambient glow */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Deep black base gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c] via-[#0a0a0a] to-[#080808]" />

          {/* Warm burnt orange ambient glow - top left */}
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[#e07a42]/[0.03] rounded-full blur-[150px]" />

          {/* Subtle orange glow - bottom right (ember effect) */}
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#c96a35]/[0.02] rounded-full blur-[120px]" />

          {/* Very subtle center glow for depth */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#e07a42]/[0.01] rounded-full blur-[200px]" />

          {/* Subtle noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative">
          {children}
        </div>
      </body>
    </html>
  )
}
