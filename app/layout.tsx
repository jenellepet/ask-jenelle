import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jenelle',
  description: 'A private decision-clarity SaaS for founders',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
