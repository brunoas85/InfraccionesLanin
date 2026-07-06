'use client'

import { usePathname, useRouter } from 'next/navigation'

export function BackButton() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/casos') return null

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-emerald-800"
    >
      ← Atrás
    </button>
  )
}
