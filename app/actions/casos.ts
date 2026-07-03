'use server'

import * as z from 'zod'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireRol } from '@/lib/dal'
import { normalizeNumeroEE, isValidNumeroEEShape, origenDeReparticion } from '@/lib/ee'

const CasoSchema = z
  .object({
    numeroEE: z.string().min(5, { error: 'Ingresá el N° de Expediente Electrónico.' }),
    reparticion: z.enum(['DGA_APNAC', 'DGAJ_APNAC', 'DC_APNAC', 'OTRA'], {
      error: 'Seleccioná la repartición.',
    }),
    reparticionOtra: z.string().trim().optional(),
    origenManual: z.enum(['GDE', 'TAD']).optional(),
    infractorNombre: z.string().trim().min(2, { error: 'Ingresá el nombre del infractor.' }),
    infractorDni: z.string().trim().optional(),
    tipoInfraccionId: z.string().min(1, { error: 'Seleccioná el tipo de infracción.' }),
    fechaInfraccion: z.coerce.date({ error: 'Ingresá una fecha de infracción válida.' }),
    fechaRecepcionEE: z.coerce.date({ error: 'Ingresá una fecha de recepción de EE válida.' }),
    sector: z.string().trim().min(2, { error: 'Ingresá el sector del parque.' }),
    guardaparqueInterviniente: z
      .string()
      .trim()
      .min(2, { error: 'Ingresá el guardaparque interviniente.' }),
    jefeGuardaparques: z
      .string()
      .trim()
      .min(2, { error: 'Ingresá quién elevó el caso.' }),
    descripcion: z.string().trim().optional(),
  })
  .refine((data) => data.reparticion !== 'OTRA' || !!data.reparticionOtra, {
    error: 'Ingresá el código de la repartición.',
    path: ['reparticionOtra'],
  })
  .refine((data) => data.reparticion !== 'OTRA' || !!data.origenManual, {
    error: 'Indicá si el expediente viene de GDE o de TAD.',
    path: ['origenManual'],
  })

export type CasoState =
  | {
      error?: string
      fieldErrors?: Record<string, string[]>
    }
  | undefined

export async function registrarEE(_state: CasoState, formData: FormData): Promise<CasoState> {
  const session = await requireRol('MESA_DE_ENTRADAS', 'ADMIN')

  const validatedFields = CasoSchema.safeParse({
    numeroEE: formData.get('numeroEE'),
    reparticion: formData.get('reparticion'),
    reparticionOtra: formData.get('reparticionOtra') || undefined,
    origenManual: formData.get('origenManual') || undefined,
    infractorNombre: formData.get('infractorNombre'),
    infractorDni: formData.get('infractorDni') || undefined,
    tipoInfraccionId: formData.get('tipoInfraccionId'),
    fechaInfraccion: formData.get('fechaInfraccion'),
    fechaRecepcionEE: formData.get('fechaRecepcionEE'),
    sector: formData.get('sector'),
    guardaparqueInterviniente: formData.get('guardaparqueInterviniente'),
    jefeGuardaparques: formData.get('jefeGuardaparques'),
    descripcion: formData.get('descripcion') || undefined,
  })

  if (!validatedFields.success) {
    return {
      error: 'Revisá los datos ingresados.',
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    }
  }

  const data = validatedFields.data
  const numeroEE = normalizeNumeroEE(data.numeroEE)

  if (!isValidNumeroEEShape(numeroEE)) {
    return {
      error: 'El N° de EE no tiene el formato esperado (EX-AAAA-NNNNNNNN-...).',
      fieldErrors: { numeroEE: ['Formato inválido.'] },
    }
  }

  const existente = await prisma.caso.findUnique({ where: { numeroEE } })
  if (existente) {
    return {
      error: `Ya existe un caso cargado con ese N° de EE (caso ${existente.id}).`,
      fieldErrors: { numeroEE: ['N° de EE duplicado.'] },
    }
  }

  const origen = data.reparticion === 'OTRA' ? data.origenManual! : origenDeReparticion(data.reparticion)!

  const adjuntos = formData
    .getAll('adjuntos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  const caso = await prisma.$transaction(async (tx) => {
    const nuevoCaso = await tx.caso.create({
      data: {
        numeroEE,
        reparticion: data.reparticion,
        reparticionOtra: data.reparticion === 'OTRA' ? data.reparticionOtra : null,
        origen,
        infractorNombre: data.infractorNombre,
        infractorDni: data.infractorDni || null,
        tipoInfraccionId: data.tipoInfraccionId,
        fechaInfraccion: data.fechaInfraccion,
        fechaRecepcionEE: data.fechaRecepcionEE,
        sector: data.sector,
        guardaparqueInterviniente: data.guardaparqueInterviniente,
        jefeGuardaparques: data.jefeGuardaparques,
        descripcion: data.descripcion || null,
        createdById: session.userId,
      },
    })

    await tx.historialEvento.create({
      data: {
        casoId: nuevoCaso.id,
        tipo: 'CASO_CREADO',
        detalle: `Caso registrado a partir del EE ${numeroEE}.`,
        usuarioId: session.userId,
      },
    })

    return nuevoCaso
  })

  if (adjuntos.length > 0) {
    const casoDir = path.join(process.cwd(), 'uploads', caso.id)
    await mkdir(casoDir, { recursive: true })

    for (const file of adjuntos) {
      const safeName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const filePath = path.join(casoDir, safeName)
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      await prisma.adjunto.create({
        data: {
          casoId: caso.id,
          nombreArchivo: file.name,
          rutaArchivo: `uploads/${caso.id}/${safeName}`,
          tipo: file.type || 'application/octet-stream',
        },
      })
    }
  }

  redirect(`/casos/${caso.id}`)
}
