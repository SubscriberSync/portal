import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core - Deep Black
        background: '#0c0c0c',
        'background-secondary': '#111111',
        'background-elevated': '#161616',
        'background-surface': '#1a1a1a',

        // Glass Surfaces
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          hover: 'rgba(255, 255, 255, 0.06)',
          border: 'rgba(255, 255, 255, 0.06)',
          'border-hover': 'rgba(255, 255, 255, 0.1)',
        },

        // Text - Cool & Refined
        foreground: '#ffffff',
        'foreground-secondary': '#e4e4e7',
        'foreground-tertiary': '#a1a1aa',
        'foreground-muted': '#71717a',

        // Accent - Burnt Orange
        accent: {
          DEFAULT: '#e07a42',
          light: '#e8935f',
          dark: '#c96a35',
        },
        'accent-glow': 'rgba(224, 122, 66, 0.15)',
        'accent-glow-strong': 'rgba(224, 122, 66, 0.25)',

        // Status Colors
        success: '#e07a42', // Orange as success for differentiation
        warning: '#fbbf24',
        error: '#ef4444',
        info: '#3b82f6',

        // Borders
        border: 'rgba(255, 255, 255, 0.06)',
        'border-strong': 'rgba(255, 255, 255, 0.1)',
        'border-accent': 'rgba(224, 122, 66, 0.3)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display': ['clamp(2rem, 5vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '600' }],
        'headline': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'title': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      backdropBlur: {
        'glass': '20px',
        'glass-lg': '24px',
      },
      boxShadow: {
        'glass': '0 0 0 1px rgba(255,255,255,0.05) inset, 0 20px 40px rgba(0,0,0,0.3)',
        'glass-hover': '0 0 0 1px rgba(255,255,255,0.05) inset, 0 25px 50px rgba(0,0,0,0.4)',
        'accent-glow': '0 0 30px rgba(224, 122, 66, 0.15)',
        'accent-glow-strong': '0 0 40px rgba(224, 122, 66, 0.25)',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-up': 'scale-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'ember-pulse': 'ember-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-up': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'ember-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(224, 122, 66, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(224, 122, 66, 0.3)' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
