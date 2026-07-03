import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import {
  ESTADO_LABEL,
  ESTADO_COLOR,
  REPARTICION_LABEL,
  ORIGEN_LABEL,
} from '@/lib/labels'
import { formatFechaSolo } from '@/lib/dates'

type Params = Promise<{ id: string }>

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  )
}

export default async function CasoDetallePage({ params }: { params: Params }) {
  await verifySession()
  const { id } = await params

  const caso = await prisma.caso.findUnique({
    where: { id },
    include: {
      tipoInfraccion: true,
      adjuntos: true,
      createdBy: true,
      historialEventos: {
        include: { usuario: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!caso) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">{caso.numeroEE}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLOR[caso.estado]}`}
          >
            {ESTADO_LABEL[caso.estado]}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {REPARTICION_LABEL[caso.reparticion]}
          {caso.reparticionOtra ? ` (${caso.reparticionOtra})` : ''} · {ORIGEN_LABEL[caso.origen]}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <dl className="grid grid-cols-2 gap-4">
          <Dato label="Infractor" value={caso.infractorNombre} />
          <Dato label="DNI" value={caso.infractorDni ?? '—'} />
          <Dato label="Tipo de infracción" value={caso.tipoInfraccion.nombre} />
          <Dato label="Sector" value={caso.sector} />
          <Dato
            label="Fecha de la infracción"
            value={formatFechaSolo(caso.fechaInfraccion)}
          />
          <Dato
            label="Fecha de recepción del EE"
            value={formatFechaSolo(caso.fechaRecepcionEE)}
          />
          <Dato label="Guardaparque interviniente" value={caso.guardaparqueInterviniente} />
          <Dato label="Jefe de Guardaparques" value={caso.jefeGuardaparques} />
          <Dato label="Registrado por" value={caso.createdBy.nombre} />
          <Dato
            label="Registrado el"
            value={caso.createdAt.toLocaleString('es-AR')}
          />
        </dl>
        {caso.descripcion && (
          <div className="mt-4">
            <dt className="text-xs font-medium uppercase text-slate-500">Descripción</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
              {caso.descripcion}
            </dd>
          </div>
        )}
      </div>

      {caso.adjuntos.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900">Adjuntos</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {caso.adjuntos.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/adjuntos/${a.rutaArchivo.replace(/^uploads\//, '')}`}
                  className="text-emerald-800 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {a.nombreArchivo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Historial</h2>
        <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">
          {caso.historialEventos.map((evento) => (
            <li key={evento.id}>
              <p className="text-sm text-slate-800">{evento.detalle ?? evento.tipo}</p>
              <p className="text-xs text-slate-400">
                {evento.usuario.nombre} — {evento.createdAt.toLocaleString('es-AR')}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
