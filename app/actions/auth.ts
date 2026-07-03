'use server'

import * as z from 'zod'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createSession, deleteSession } from '@/lib/session'

const LoginSchema = z.object({
  email: z.email({ error: 'Ingresá un email válido.' }).trim(),
  password: z.string().min(1, { error: 'Ingresá tu contraseña.' }),
})

export type LoginState =
  | {
      error?: string
    }
  | undefined

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return { error: 'Revisá el email y la contraseña ingresados.' }
  }

  const { email, password } = validatedFields.data

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.activo) {
    return { error: 'Usuario o contraseña incorrectos.' }
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) {
    return { error: 'Usuario o contraseña incorrectos.' }
  }

  await createSession({
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
  })

  redirect('/casos')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
