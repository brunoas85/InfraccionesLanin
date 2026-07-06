'use client'

import { useActionState } from 'react'
import { subirDocumento } from '@/app/actions/casos'

const CATEGORIAS = [
  { value: 'RECURSO', label: 'Recurso' },
  { value: 'ACTA', label: 'Acta' },
  { value: 'INFORME_ACTA', label: 'Informe de Acta' },
] as const

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

export function SubirDocumentoForm({ casoId }: { casoId: string }) {
  const [state, action, pending] = useActionState(subirDocumento, undefined)

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="casoId" value={casoId} />
      <h3 className="text-sm font-semibold text-slate-900">Cargar Recurso / Acta / Informe de Acta</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Categoría</label>
          <select name="categoria" className={`mt-1 ${inputClass}`} defaultValue="" required>
            <option value="" disabled>
              Seleccioná…
            </option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.categoria && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.categoria[0]}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Archivos</label>
          <input type="file" name="archivos" multiple className={`mt-1 ${inputClass}`} required />
          {state?.fieldErrors?.archivos && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.archivos[0]}</p>
          )}
        </div>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? 'Subiendo…' : 'Subir documento'}
      </button>
    </form>
  )
}
