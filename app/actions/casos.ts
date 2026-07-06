'use server'

import * as z from 'zod'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireRol } from '@/lib/dal'
import { normalizeNumeroEE, isValidNumeroEEShape, origenDeReparticion } from '@/lib/ee'
import { TIPO_INFRACCION_OTROS_NOMBRE } from '@/lib/tipos'
import { CATEGORIA_ADJUNTO_LABEL } from '@/lib/labels'
import type { CategoriaAdjunto } from '@/lib/generated/prisma/client'

async function guardarAdjuntos(casoId: string, files: File[], categoria: CategoriaAdjunto) {
  if (files.length === 0) return

  const casoDir = path.join(process.cwd(), 'uploads', casoId)
  await mkdir(casoDir, { recursive: true })

  for (const file of files) {
    const safeName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(casoDir, safeName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    await prisma.adjunto.create({
      data: {
        casoId,
        nombreArchivo: file.name,
        rutaArchivo: `uploads/${casoId}/${safeName}`,
        tipo: file.type || 'application/octet-stream',
        categoria,
      },
    })
  }
}

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
    tipoInfraccionOtra: z.string().trim().optional(),
    fechaInfraccion: z.coerce.date({ error: 'Ingresá una fecha de infracción válida.' }),
    fechaRecepcionEE: z.coerce.date({ error: 'Ingresá una fecha de recepción de EE válida.' }),
    sector: z.string().trim().min(2, { error: 'Ingresá el sector del parque.' }),
    ugd: z.enum(['SUR', 'CENTRO', 'NORTE'], { error: 'Seleccioná la U.G.D.' }),
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
  const session = await requireRol('MESA_DE_ENTRADAS', 'RESPONSABLE_AREA', 'ADMIN')

  const validatedFields = CasoSchema.safeParse({
    numeroEE: formData.get('numeroEE'),
    reparticion: formData.get('reparticion'),
    reparticionOtra: formData.get('reparticionOtra') || undefined,
    origenManual: formData.get('origenManual') || undefined,
    infractorNombre: formData.get('infractorNombre'),
    infractorDni: formData.get('infractorDni') || undefined,
    tipoInfraccionId: formData.get('tipoInfraccionId'),
    tipoInfraccionOtra: formData.get('tipoInfraccionOtra') || undefined,
    fechaInfraccion: formData.get('fechaInfraccion'),
    fechaRecepcionEE: formData.get('fechaRecepcionEE'),
    sector: formData.get('sector'),
    ugd: formData.get('ugd'),
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

  const tipoInfraccion = await prisma.tipoInfraccion.findUnique({
    where: { id: data.tipoInfraccionId },
  })
  if (!tipoInfraccion) {
    return {
      error: 'El tipo de infracción seleccionado no es válido.',
      fieldErrors: { tipoInfraccionId: ['Seleccioná un tipo de infracción válido.'] },
    }
  }
  const esOtroTipo = tipoInfraccion.nombre === TIPO_INFRACCION_OTROS_NOMBRE
  if (esOtroTipo && !data.tipoInfraccionOtra) {
    return {
      error: 'Especificá el tipo de infracción.',
      fieldErrors: { tipoInfraccionOtra: ['Especificá el tipo de infracción.'] },
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
        tipoInfraccionOtra: esOtroTipo ? data.tipoInfraccionOtra : null,
        fechaInfraccion: data.fechaInfraccion,
        fechaRecepcionEE: data.fechaRecepcionEE,
        sector: data.sector,
        ugd: data.ugd,
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

  await guardarAdjuntos(caso.id, adjuntos, 'GENERAL')

  redirect(`/casos/${caso.id}`)
}

const SubirDocumentoSchema = z.object({
  casoId: z.string().min(1),
  categoria: z.enum(['RECURSO', 'ACTA', 'INFORME_ACTA'], {
    error: 'Seleccioná la categoría del documento.',
  }),
})

export async function subirDocumento(_state: CasoState, formData: FormData): Promise<CasoState> {
  const session = await requireRol('RESPONSABLE_AREA', 'ADMIN')

  const validatedFields = SubirDocumentoSchema.safeParse({
    casoId: formData.get('casoId'),
    categoria: formData.get('categoria'),
  })

  if (!validatedFields.success) {
    return {
      error: 'Revisá los datos ingresados.',
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    }
  }

  const { casoId, categoria } = validatedFields.data

  const caso = await prisma.caso.findUnique({ where: { id: casoId } })
  if (!caso) {
    return { error: 'El caso indicado no existe.' }
  }

  const archivos = formData
    .getAll('archivos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  if (archivos.length === 0) {
    return { error: 'Adjuntá al menos un archivo.', fieldErrors: { archivos: ['Requerido.'] } }
  }

  await guardarAdjuntos(casoId, archivos, categoria)

  await prisma.historialEvento.create({
    data: {
      casoId,
      tipo: 'DOCUMENTO_CARGADO',
      detalle: `Se cargó ${archivos.length === 1 ? 'un documento' : `${archivos.length} documentos`} en la categoría ${CATEGORIA_ADJUNTO_LABEL[categoria]}.`,
      usuarioId: session.userId,
    },
  })

  redirect(`/casos/${casoId}`)
}

const RegistrarDescargoSchema = z.object({
  casoId: z.string().min(1),
  fechaPresentacion: z.coerce.date({ error: 'Ingresá una fecha de presentación válida.' }),
})

export async function registrarDescargo(_state: CasoState, formData: FormData): Promise<CasoState> {
  const session = await requireRol('RESPONSABLE_AREA', 'ADMIN')

  const validatedFields = RegistrarDescargoSchema.safeParse({
    casoId: formData.get('casoId'),
    fechaPresentacion: formData.get('fechaPresentacion'),
  })

  if (!validatedFields.success) {
    return {
      error: 'Revisá los datos ingresados.',
      fieldErrors: z.flattenError(validatedFields.error).fieldErrors,
    }
  }

  const { casoId, fechaPresentacion } = validatedFields.data

  const caso = await prisma.caso.findUnique({ where: { id: casoId } })
  if (!caso) {
    return { error: 'El caso indicado no existe.' }
  }
  if (['RESUELTO', 'CON_ORDEN_DE_PAGO', 'PAGADO'].includes(caso.estado)) {
    return { error: 'No se puede registrar un descargo en un caso ya resuelto.' }
  }

  const archivos = formData
    .getAll('archivos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  await prisma.$transaction(async (tx) => {
    await tx.descargo.upsert({
      where: { casoId },
      create: { casoId, fechaPresentacion },
      update: { fechaPresentacion },
    })

    await tx.caso.update({
      where: { id: casoId },
      data: { huboDescargo: true, estado: 'CON_DESCARGO' },
    })

    await tx.historialEvento.create({
      data: {
        casoId,
        tipo: 'DESCARGO_REGISTRADO',
        detalle: `Descargo presentado el ${fechaPresentacion.toISOString().slice(0, 10)}.`,
        usuarioId: session.userId,
      },
    })
  })

  await guardarAdjuntos(casoId, archivos, 'DESCARGO')

  redirect(`/casos/${casoId}`)
}
