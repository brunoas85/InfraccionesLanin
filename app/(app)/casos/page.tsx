import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma/client'
import { ESTADO_LABEL, ESTADO_COLOR, REPARTICION_LABEL, ORIGEN_LABEL, UGD_LABEL } from '@/lib/labels'
import { formatFechaSolo } from '@/lib/dates'

type SearchParams = Promise<{
  q?: string
  estado?: string
  tipoInfraccionId?: string
  origen?: string
  ugd?: string
  fechaInfraccionDesde?: string
  fechaInfraccionHasta?: string
  montoDesde?: string
  montoHasta?: string
}>

function dateRange(desde?: string, hasta?: string): Prisma.DateTimeFilter | undefined {
  if (!desde && !hasta) return undefined
  const filter: Prisma.DateTimeFilter = {}
  if (desde) filter.gte = new Date(`${desde}T00:00:00.000Z`)
  if (hasta) filter.lte = new Date(`${hasta}T23:59:59.999Z`)
  return filter
}

function montoRange(desde?: string, hasta?: string): Prisma.DecimalFilter | undefined {
  if (!desde && !hasta) return undefined
  const filter: Prisma.DecimalFilter = {}
  if (desde) filter.gte = desde
  if (hasta) filter.lte = hasta
  return filter
}

export default async function CasosPage({ searchParams }: { searchParams: SearchParams }) {
  await verifySession()
  const params = await searchParams

  const tipos = await prisma.tipoInfraccion.findMany({ orderBy: { nombre: 'asc' } })

  const where: Prisma.CasoWhereInput = {
    ...(params.estado ? { estado: params.estado as never } : {}),
    ...(params.tipoInfraccionId ? { tipoInfraccionId: params.tipoInfraccionId } : {}),
    ...(params.origen ? { origen: params.origen as never } : {}),
    ...(params.ugd ? { ugd: params.ugd as never } : {}),
    ...(params.q
      ? {
          OR: [
            { numeroEE: { contains: params.q, mode: 'insensitive' } },
            { infractorNombre: { contains: params.q, mode: 'insensitive' } },
            { infractorDni: { contains: params.q, mode: 'insensitive' } },
            { disposicion: { numero: { contains: params.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const fechaInfraccion = dateRange(params.fechaInfraccionDesde, params.fechaInfraccionHasta)
  if (fechaInfraccion) where.fechaInfraccion = fechaInfraccion

  const monto = montoRange(params.montoDesde, params.montoHasta)
  if (monto) where.disposicion = { monto }

  const casos = await prisma.caso.findMany({
    where,
    include: {
      tipoInfraccion: true,
      adjuntos: { where: { categoria: 'ACTA' }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const inputClass =
    'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Casos</h1>

      <form className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <div className="col-span-2 md:col-span-4">
          <label className="block text-xs font-medium text-slate-600">Búsqueda libre</label>
          <input
            name="q"
            defaultValue={params.q}
            placeholder="N° de EE, N° de Disposición, infractor…"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Estado</label>
          <select name="estado" defaultValue={params.estado ?? ''} className={inputClass}>
            <option value="">Todos</option>
            {Object.entries(ESTADO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Tipo de infracción</label>
          <select
            name="tipoInfraccionId"
            defaultValue={params.tipoInfraccionId ?? ''}
            className={inputClass}
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Origen</label>
          <select name="origen" defaultValue={params.origen ?? ''} className={inputClass}>
            <option value="">Todos</option>
            <option value="GDE">GDE</option>
            <option value="TAD">TAD</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">U.G.D.</label>
          <select name="ugd" defaultValue={params.ugd ?? ''} className={inputClass}>
            <option value="">Todas</option>
            {Object.entries(UGD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Fecha infracción — desde
            </label>
            <input
              type="date"
              name="fechaInfraccionDesde"
              defaultValue={params.fechaInfraccionDesde}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Fecha infracción — hasta
            </label>
            <input
              type="date"
              name="fechaInfraccionHasta"
              defaultValue={params.fechaInfraccionHasta}
              className={inputClass}
            />
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              ¿Qué multa se aplicó? — desde
            </label>
            <input
              type="number"
              inputMode="decimal"
              name="montoDesde"
              defaultValue={params.montoDesde}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              ¿Qué multa se aplicó? — hasta
            </label>
            <input
              type="number"
              inputMode="decimal"
              name="montoHasta"
              defaultValue={params.montoHasta}
              className={inputClass}
            />
          </div>
        </div>

        <div className="col-span-2 flex items-end gap-2 md:col-span-4">
          <button
            type="submit"
            className="rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Buscar
          </button>
          <Link href="/casos" className="text-sm text-slate-500 hover:underline">
            Limpiar filtros
          </Link>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">N° de EE</th>
              <th className="px-4 py-2">Repartición</th>
              <th className="px-4 py-2">U.G.D.</th>
              <th className="px-4 py-2">Infractor</th>
              <th className="px-4 py-2">Tipo de infracción</th>
              <th className="px-4 py-2">Fecha infracción</th>
              <th className="px-4 py-2">Recepción EE</th>
              <th className="px-4 py-2">Descargo</th>
              <th className="px-4 py-2">Acta</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {casos.map((caso) => (
              <tr key={caso.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/casos/${caso.id}`} className="font-medium text-emerald-800 hover:underline">
                    {caso.numeroEE}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {REPARTICION_LABEL[caso.reparticion]} · {ORIGEN_LABEL[caso.origen]}
                </td>
                <td className="px-4 py-2 text-slate-600">{UGD_LABEL[caso.ugd]}</td>
                <td className="px-4 py-2 text-slate-600">{caso.infractorNombre}</td>
                <td className="px-4 py-2 text-slate-600">
                  {caso.tipoInfraccionOtra
                    ? `${caso.tipoInfraccion.nombre} (${caso.tipoInfraccionOtra})`
                    : caso.tipoInfraccion.nombre}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {formatFechaSolo(caso.fechaInfraccion)}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {formatFechaSolo(caso.fechaRecepcionEE)}
                </td>
                <td className="px-4 py-2 text-slate-600">{caso.huboDescargo ? 'Sí' : 'No'}</td>
                <td className="px-4 py-2 text-slate-600">
                  {caso.adjuntos.length > 0 ? 'Sí' : 'No'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLOR[caso.estado]}`}
                  >
                    {ESTADO_LABEL[caso.estado]}
                  </span>
                </td>
              </tr>
            ))}
            {casos.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  No se encontraron casos con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
