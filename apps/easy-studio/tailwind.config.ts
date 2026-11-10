import type { Config } from 'tailwindcss'
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { dark: '#0a0f1e', mid: '#111827', light: '#1f2937', border: '#374151' },
        studio: { red: '#ef4444', green: '#22c55e', amber: '#f59e0b', blue: '#3b82f6' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config
