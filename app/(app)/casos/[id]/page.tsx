import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import {
  ESTADO_LABEL,
  ESTADO_COLOR,
  REPARTICION_LABEL,
  ORIGEN_LABEL,
  UGD_LABEL,
  TIPO_CONSECUENCIA_LABEL,
  RESULTADO_DISPOSICION_LABEL,
  CATEGORIA_ADJUNTO_LABEL,
} from '@/lib/labels'
import { formatFechaSolo } from '@/lib/dates'
import { SubirDocumentoForm } from './subir-documento-form'
import { RegistrarDescargoForm } from './registrar-descargo-form'

type Params = Promise<{ id: string }>

const CATEGORIAS_ORDEN = ['GENERAL', 'DESCARGO', 'RECURSO', 'ACTA', 'INFORME_ACTA'] as const

const ESTADOS_TERMINALES = ['RESUELTO', 'CON_ORDEN_DE_PAGO', 'PAGADO']

function adjuntoUrl(rutaArchivo: string, { descargar }: { descargar?: boolean } = {}) {
  const base = `/api/adjuntos/${rutaArchivo.replace(/^uploads\//, '')}`
  return descargar ? `${base}?descargar=1` : base
}

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  )
}

export default async function CasoDetallePage({ params }: { params: Params }) {
  const session = await verifySession()
  const { id } = await params

  const caso = await prisma.caso.findUnique({
    where: { id },
    include: {
      tipoInfraccion: true,
      adjuntos: true,
      descargo: true,
      disposicion: true,
      createdBy: true,
      historialEventos: {
        include: { usuario: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!caso) notFound()

  const puedeResolver = session.rol === 'RESPONSABLE_AREA' || session.rol === 'ADMIN'
  const casoTerminado = ESTADOS_TERMINALES.includes(caso.estado)

  const gruposAdjuntos = CATEGORIAS_ORDEN.map((categoria) => ({
    categoria,
    items: caso.adjuntos.filter((a) => a.categoria === categoria),
  })).filter((g) => g.items.length > 0)

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
          <Dato
            label="Tipo de infracción"
            value={
              caso.tipoInfraccionOtra
                ? `${caso.tipoInfraccion.nombre} (${caso.tipoInfraccionOtra})`
                : caso.tipoInfraccion.nombre
            }
          />
          <Dato label="Sector" value={caso.sector} />
          <Dato label="U.G.D." value={UGD_LABEL[caso.ugd]} />
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

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Descargo</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <Dato label="¿Hubo descargo?" value={caso.huboDescargo ? 'Sí' : 'No'} />
          {caso.descargo && (
            <Dato
              label="Fecha de presentación"
              value={formatFechaSolo(caso.descargo.fechaPresentacion)}
            />
          )}
        </dl>
        {puedeResolver && !casoTerminado && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <RegistrarDescargoForm casoId={caso.id} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Adjuntos</h2>
        {gruposAdjuntos.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">No hay adjuntos cargados.</p>
        )}
        <div className="mt-2 space-y-4">
          {gruposAdjuntos.map(({ categoria, items }) => (
            <div key={categoria}>
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                {CATEGORIA_ADJUNTO_LABEL[categoria]}
              </h3>
              <ul className="mt-2 space-y-3">
                {items.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="flex items-center gap-3">
                      <a
                        href={adjuntoUrl(a.rutaArchivo)}
                        className="text-emerald-800 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {a.nombreArchivo}
                      </a>
                      <a
                        href={adjuntoUrl(a.rutaArchivo, { descargar: true })}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Descargar
                      </a>
                    </div>
                    {a.tipo.startsWith('image/') && (
                      <img
                        src={adjuntoUrl(a.rutaArchivo)}
                        alt={a.nombreArchivo}
                        className="mt-2 max-h-64 rounded-md border border-slate-200"
                      />
                    )}
                    {a.tipo === 'application/pdf' && (
                      <iframe
                        src={adjuntoUrl(a.rutaArchivo)}
                        className="mt-2 h-96 w-full rounded-md border border-slate-200"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {puedeResolver && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <SubirDocumentoForm casoId={caso.id} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Disposición</h2>
        {caso.disposicion ? (
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <Dato label="N° de Disposición" value={caso.disposicion.numero} />
            <Dato
              label="Resultado"
              value={RESULTADO_DISPOSICION_LABEL[caso.disposicion.resultado]}
            />
            <Dato
              label="Monto de la multa"
              value={caso.disposicion.monto ? `$${caso.disposicion.monto}` : '—'}
            />
            <Dato
              label="Consecuencias"
              value={
                caso.disposicion.consecuencias.length > 0
                  ? caso.disposicion.consecuencias
                      .map((c) => TIPO_CONSECUENCIA_LABEL[c])
                      .join(', ')
                  : '—'
              }
            />
            <Dato label="Fecha" value={caso.disposicion.fecha.toLocaleString('es-AR')} />
          </dl>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-slate-400">Todavía no se emitió una Disposición.</p>
            {puedeResolver && (
              <Link
                href={`/casos/${caso.id}/resolver`}
                className="mt-3 inline-block rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Emitir Disposición
              </Link>
            )}
          </div>
        )}
      </div>

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
