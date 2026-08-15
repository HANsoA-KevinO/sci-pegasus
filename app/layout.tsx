import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ChatProvider } from '@/contexts/ChatContext'

export const metadata: Metadata = {
  title: {
    default: 'Sci-Pegasus',
    template: '%s · Sci-Pegasus',
  },
  description: '材料科学文献驱动的科学发现智能体',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const mediaCdnOrigin = process.env.NEXT_PUBLIC_MEDIA_CDN_BASE_URL?.trim()
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      {mediaCdnOrigin && (
        <head>
          <link rel="dns-prefetch" href={mediaCdnOrigin} />
          <link rel="preconnect" href={mediaCdnOrigin} crossOrigin="anonymous" />
        </head>
      )}
      <body className="antialiased">
        <AuthProvider>
          <ChatProvider>{children}</ChatProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
