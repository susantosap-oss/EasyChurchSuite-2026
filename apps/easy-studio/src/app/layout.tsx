import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'EasyStudio',
  description: 'Church broadcast command center',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} font-sans bg-surface-dark text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
