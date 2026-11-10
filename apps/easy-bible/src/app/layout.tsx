import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'EasyBible',
  description: 'Alkitab digital ringan untuk ibadah dan PA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans bg-slate-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
