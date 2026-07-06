import { notFound, redirect } from 'next/navigation'
import { requireRol } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { EmitirDisposicionForm } from './emitir-disposicion-form'

type Params = Promise<{ id: string }>

const ESTADOS_TERMINALES = ['RESUELTO', 'CON_ORDEN_DE_PAGO', 'PAGADO']

export default async function ResolverCasoPage({ params }: { params: Params }) {
  await requireRol('RESPONSABLE_AREA', 'ADMIN')
  const { id } = await params

  const caso = await prisma.caso.findUnique({
    where: { id },
    include: { disposicion: true },
  })

  if (!caso) notFound()
  if (caso.disposicion || ESTADOS_TERMINALES.includes(caso.estado)) {
    redirect(`/casos/${id}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900">Emitir Disposición</h1>
      <p className="mt-1 text-sm text-slate-500">
        Caso {caso.numeroEE} — esta acción resuelve el caso y no puede editarse ni deshacerse después.
      </p>

      <EmitirDisposicionForm casoId={caso.id} />
    </div>
  )
}
