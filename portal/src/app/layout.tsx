import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import Providers from '@/components/Providers'

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
  title: 'SubscriberSync',
  description: 'Your premium subscriber command center',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-[var(--background)] text-[var(--foreground)] antialiased transition-colors duration-300`}>
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: '#e07a42',
              colorText: '#F5F0E8',
              colorTextSecondary: '#a1a1aa',
              colorBackground: '#1a1a1a',
              colorInputBackground: '#252525',
              colorInputText: '#F5F0E8',
              colorNeutral: '#F5F0E8',
            },
            elements: {
              formButtonPrimary: {
                backgroundColor: '#e07a42',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#c86a35',
                },
              },
              card: {
                backgroundColor: '#1a1a1a',
                borderColor: '#333',
              },
              headerTitle: {
                color: '#F5F0E8',
              },
              headerSubtitle: {
                color: '#a1a1aa',
              },
              socialButtonsBlockButton: {
                borderColor: '#333',
                color: '#F5F0E8',
                '&:hover': {
                  backgroundColor: '#252525',
                },
              },
              formFieldLabel: {
                color: '#a1a1aa',
              },
              formFieldInput: {
                backgroundColor: '#252525',
                borderColor: '#333',
                color: '#F5F0E8',
                '&:focus': {
                  borderColor: '#e07a42',
                },
              },
              footerActionLink: {
                color: '#e07a42',
                '&:hover': {
                  color: '#c86a35',
                },
              },
              identityPreviewText: {
                color: '#F5F0E8',
              },
              identityPreviewEditButton: {
                color: '#e07a42',
              },
              formFieldSuccessText: {
                color: '#5CB87A',
              },
              alert: {
                color: '#F5F0E8',
              },
              alertText: {
                color: '#F5F0E8',
              },
            },
          }}
        >
          <Providers>
            {children}
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
