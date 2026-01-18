import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
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
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${ibmMono.variable}`}>
      <body className={`${dmSans.className} bg-[#0D0D0D] text-[#F5F0E8] antialiased`}>
        {/* Premium dark gradient background with subtle texture */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0D] via-[#111111] to-[#0A0A0A]" />

          {/* Warm gold ambient glow - top left */}
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[#C9A962]/[0.04] rounded-full blur-[150px]" />

          {/* Subtle warm glow - bottom right */}
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#8B7355]/[0.03] rounded-full blur-[120px]" />

          {/* Subtle noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.015]"
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
