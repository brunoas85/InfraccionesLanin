'use client'

import { useActionState } from 'react'
import { registrarDescargo } from '@/app/actions/casos'

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

export function RegistrarDescargoForm({ casoId }: { casoId: string }) {
  const [state, action, pending] = useActionState(registrarDescargo, undefined)

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="casoId" value={casoId} />
      <h3 className="text-sm font-semibold text-slate-900">Registrar descargo</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Fecha de presentación</label>
          <input type="date" name="fechaPresentacion" className={`mt-1 ${inputClass}`} required />
          {state?.fieldErrors?.fechaPresentacion && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.fechaPresentacion[0]}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Archivos (opcional)</label>
          <input type="file" name="archivos" multiple className={`mt-1 ${inputClass}`} />
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
        {pending ? 'Registrando…' : 'Registrar descargo'}
      </button>
    </form>
  )
}
