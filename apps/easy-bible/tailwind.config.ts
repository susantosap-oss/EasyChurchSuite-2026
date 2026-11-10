import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        bible: ['Georgia', 'serif'],
      },
      colors: {
        brand: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
      },
    },
  },
  plugins: [],
} satisfies Config
