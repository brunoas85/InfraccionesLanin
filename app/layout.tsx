import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Infracciones Lanín',
  description: 'Gestión de expedientes de infracciones — Parque Nacional Lanín',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  )
}
