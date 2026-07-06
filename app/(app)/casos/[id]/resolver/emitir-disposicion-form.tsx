'use client'

import { useActionState } from 'react'
import { emitirDisposicion } from '@/app/actions/disposicion'
import { RESULTADO_DISPOSICION_LABEL, TIPO_CONSECUENCIA_LABEL } from '@/lib/labels'

function Field({
  label,
  children,
  error,
}: {
  label: string
  children: React.ReactNode
  error?: string[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-red-600">{error[0]}</p>}
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'

export function EmitirDisposicionForm({ casoId }: { casoId: string }) {
  const [state, action, pending] = useActionState(emitirDisposicion, undefined)

  return (
    <form action={action} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <input type="hidden" name="casoId" value={casoId} />

      <Field label="N° de Disposición (Acto Administrativo)" error={state?.fieldErrors?.numero}>
        <input name="numero" className={inputClass} required />
      </Field>

      <Field label="Resultado" error={state?.fieldErrors?.resultado}>
        <select name="resultado" className={inputClass} defaultValue="" required>
          <option value="" disabled>
            Seleccioná…
          </option>
          {Object.entries(RESULTADO_DISPOSICION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Monto de la multa (opcional)" error={state?.fieldErrors?.monto}>
        <input type="number" step="0.01" min="0" name="monto" className={inputClass} />
      </Field>

      <Field label="Consecuencias" error={state?.fieldErrors?.consecuencias}>
        <div className="flex flex-wrap gap-4">
          {Object.entries(TIPO_CONSECUENCIA_LABEL).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="consecuencias" value={value} />
              {label}
            </label>
          ))}
        </div>
      </Field>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? 'Emitiendo…' : 'Emitir Disposición'}
      </button>
    </form>
  )
}
