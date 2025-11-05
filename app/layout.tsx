import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Streaming Alerts - Upcoming Movies & TV Shows',
  description: 'Discover upcoming movies and TV shows across Netflix, Amazon Prime, Hulu, Paramount+, HBO Max, Disney+, and Apple TV+',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
