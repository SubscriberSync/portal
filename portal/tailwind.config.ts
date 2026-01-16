import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0a0c10',
        slate: '#161B26',
        copper: '#E07A42',
        'copper-dark': '#c56835',
        'copper-light': '#f09060',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        data: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-shine': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-complex': 'float-complex 10s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'gradient': 'gradient-shift 8s ease infinite',
        'morph': 'morph 8s ease-in-out infinite',
        'rotate-gradient': 'rotate-gradient 8s linear infinite',
        'slide-up': 'slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slide-down-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'border-pulse': 'border-pulse 2s ease-in-out infinite',
        'text-reveal': 'text-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'glow-ring': 'glow-ring 2s ease-out infinite',
        'orbit': 'orbit 20s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'holographic': 'holographic 6s ease infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(224, 122, 66, 0.3), 0 0 40px rgba(224, 122, 66, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(224, 122, 66, 0.6), 0 0 80px rgba(224, 122, 66, 0.2)',
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-8px) rotate(1deg)' },
          '50%': { transform: 'translateY(-12px) rotate(0deg)' },
          '75%': { transform: 'translateY(-8px) rotate(-1deg)' },
        },
        'float-complex': {
          '0%, 100%': { transform: 'translateY(0px) scale(1) rotate(0deg)', opacity: '0.6' },
          '33%': { transform: 'translateY(-15px) scale(1.02) rotate(2deg)', opacity: '0.8' },
          '66%': { transform: 'translateY(-8px) scale(0.98) rotate(-1deg)', opacity: '0.7' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'morph': {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%': { borderRadius: '50% 60% 30% 60% / 40% 70% 40% 60%' },
          '75%': { borderRadius: '60% 30% 60% 40% / 70% 50% 60% 30%' },
        },
        'rotate-gradient': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'slide-up-fade': {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down-fade': {
          '0%': { transform: 'translateY(-30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
          '70%': { transform: 'scale(0.9)', opacity: '0.9' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'border-pulse': {
          '0%, 100%': { borderColor: 'rgba(224, 122, 66, 0.2)' },
          '50%': { borderColor: 'rgba(224, 122, 66, 0.5)' },
        },
        'text-reveal': {
          '0%': { clipPath: 'inset(0 100% 0 0)', opacity: '0' },
          '100%': { clipPath: 'inset(0 0 0 0)', opacity: '1' },
        },
        'glow-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg) translateX(100px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(100px) rotate(-360deg)' },
        },
        'wave': {
          '0%, 100%': { transform: 'translateY(0) scaleY(1)' },
          '50%': { transform: 'translateY(-5px) scaleY(1.1)' },
        },
        'holographic': {
          '0%': { backgroundPosition: '0% 50%', filter: 'hue-rotate(0deg)' },
          '50%': { backgroundPosition: '100% 50%', filter: 'hue-rotate(15deg)' },
          '100%': { backgroundPosition: '0% 50%', filter: 'hue-rotate(0deg)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-back': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(224, 122, 66, 0.3)',
        'glow': '0 0 30px rgba(224, 122, 66, 0.4)',
        'glow-lg': '0 0 50px rgba(224, 122, 66, 0.5)',
        'glow-copper': '0 0 20px rgba(224, 122, 66, 0.4), 0 0 40px rgba(224, 122, 66, 0.2)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)',
        'inner-glow': 'inset 0 0 20px rgba(224, 122, 66, 0.1)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(224, 122, 66, 0.05)',
        'card-hover': '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(224, 122, 66, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
    },
  },
  plugins: [],
}
export default config
