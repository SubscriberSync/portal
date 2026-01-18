'use client'

import { ThemeProvider } from '@/contexts/ThemeContext'
import ThemedBackground from './ThemedBackground'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemedBackground />
      <div className="relative">
        {children}
      </div>
    </ThemeProvider>
  )
}
