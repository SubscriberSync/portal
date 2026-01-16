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
        // SubscriberSync Brand Colors
        ink: '#0C0F17',
        slate: '#161B26',
        border: '#2A3142',
        muted: '#8B95A8',
        light: '#E8ECF2',
        copper: '#E07A42',
        'copper-dark': '#C4652F',
        success: '#22c55e',
        'success-dark': '#1a3d2e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
