'use server'

import * as z from 'zod'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireRol } from '@/lib/dal'
import { RESULTADO_DISPOSICION_LABEL } from '@/lib/labels'

const EmitirDisposicionSchema = z.object({
  casoId: z.string().min(1),
  numero: z.string().trim().min(1, { error: 'Ingresá el N° de Disposición.' }),
  resultado: z.enum(['SANCIONADO', 'ARCHIVADO', 'SOBRESEIDO'], {
    error: 'Seleccioná el resultado.',
  }),
  monto: z.coerce.number().nonnegative().optional(),
  consecuencias: z.array(z.enum(['DECOMISO', 'APERCIBIMIENTO', 'MULTA'])).default([]),
})

export type DisposicionState =
  | {
      error?: string
      fieldErrors?: Record<string, string[]>
    }
  | undefined

export async function emitirDisposicion(
  _state: DisposicionState,
  formData: FormData,
): Promise<DisposicionState> {
  const session = await requireRol('RESPONSABLE_AREA', 'ADMIN')

  const montoRaw = formData.get('monto')

  const validatedFields = EmitirDisposicionSchema.safeParse({
    casoId: formData.get('casoId'),
    numero: formData.get('numero'),
    resultado: formData.get('resultado'),
    monto: montoRaw ? montoRaw : undefined,
    consecuencias: formData.getAll('consecuencias'),
  })

  if (!validatedFields.success) {
    return {
      error: 'Revisá los datos ingresados.',
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    }
  }

  const { casoId, numero, resultado, monto, consecuencias } = validatedFields.data

  const caso = await prisma.caso.findUnique({
    where: { id: casoId },
    include: { disposicion: true },
  })

  if (!caso) {
    return { error: 'El caso indicado no existe.' }
  }

  if (caso.disposicion || ['RESUELTO', 'CON_ORDEN_DE_PAGO', 'PAGADO'].includes(caso.estado)) {
    return { error: 'Este caso ya tiene una Disposición emitida.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.disposicion.create({
      data: {
        casoId,
        numero,
        resultado,
        monto: monto ?? null,
        consecuencias,
      },
    })

    await tx.caso.update({
      where: { id: casoId },
      data: { estado: 'RESUELTO' },
    })

    await tx.historialEvento.create({
      data: {
        casoId,
        tipo: 'DISPOSICION_EMITIDA',
        detalle: `Disposición N° ${numero} — ${RESULTADO_DISPOSICION_LABEL[resultado]}.`,
        usuarioId: session.userId,
      },
    })
  })

  redirect(`/casos/${casoId}`)
}
