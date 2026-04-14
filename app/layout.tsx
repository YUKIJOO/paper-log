import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Paper Log',
  description: '읽은 논문을 정리하고 기록하는 공간',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
