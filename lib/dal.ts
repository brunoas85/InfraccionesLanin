import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import type { Rol } from '@/lib/generated/prisma/client'

export const verifySession = cache(async () => {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
})

export async function requireRol(...roles: Rol[]) {
  const session = await verifySession()
  if (!roles.includes(session.rol)) {
    redirect('/')
  }
  return session
}
