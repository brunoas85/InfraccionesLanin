import { requireRol } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { TIPO_INFRACCION_OTROS_NOMBRE } from '@/lib/tipos'
import { RegistrarEEForm } from './registrar-ee-form'

export default async function NuevoCasoPage() {
  await requireRol('MESA_DE_ENTRADAS', 'RESPONSABLE_AREA', 'ADMIN')

  const tipos = await prisma.tipoInfraccion.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
  })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900">Registrar EE recibido</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cargá los datos del Expediente Electrónico derivado por GDE o TAD al Área de Infracciones.
      </p>

      <RegistrarEEForm
        tipos={tipos.map((t) => ({ id: t.id, nombre: t.nombre }))}
        otrosNombre={TIPO_INFRACCION_OTROS_NOMBRE}
      />
    </div>
  )
}
