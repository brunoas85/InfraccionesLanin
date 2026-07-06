'use client'

import { useActionState, useState } from 'react'
import { registrarEE } from '@/app/actions/casos'

const REPARTICIONES = [
  { value: 'DGA_APNAC', label: 'DGA#APNAC' },
  { value: 'DGAJ_APNAC', label: 'DGAJ#APNAC' },
  { value: 'DC_APNAC', label: 'DC#APNAC' },
  { value: 'OTRA', label: 'Otra' },
] as const

const UGDS = [
  { value: 'SUR', label: 'Sur' },
  { value: 'CENTRO', label: 'Centro' },
  { value: 'NORTE', label: 'Norte' },
] as const

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

export function RegistrarEEForm({
  tipos,
  otrosNombre,
}: {
  tipos: { id: string; nombre: string }[]
  otrosNombre: string
}) {
  const [state, action, pending] = useActionState(registrarEE, undefined)
  const [reparticion, setReparticion] = useState<string>('DGA_APNAC')
  const esOtra = reparticion === 'OTRA'
  const [tipoInfraccionId, setTipoInfraccionId] = useState<string>('')
  const esOtroTipo = tipos.find((t) => t.id === tipoInfraccionId)?.nombre === otrosNombre

  return (
    <form action={action} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <Field label="N° de Expediente Electrónico (EE)" error={state?.fieldErrors?.numeroEE}>
        <input
          name="numeroEE"
          className={inputClass}
          placeholder="EX-2018-XXXXXXXX-   -APN-DGA#APNAC"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Repartición" error={state?.fieldErrors?.reparticion}>
          <select
            name="reparticion"
            className={inputClass}
            value={reparticion}
            onChange={(e) => setReparticion(e.target.value)}
          >
            {REPARTICIONES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        {esOtra && (
          <Field label="Origen del expediente" error={state?.fieldErrors?.origenManual}>
            <select name="origenManual" className={inputClass} defaultValue="">
              <option value="" disabled>
                Seleccioná…
              </option>
              <option value="GDE">GDE</option>
              <option value="TAD">TAD</option>
            </select>
          </Field>
        )}
      </div>

      {esOtra && (
        <Field label="Código de la repartición" error={state?.fieldErrors?.reparticionOtra}>
          <input name="reparticionOtra" className={inputClass} placeholder="SIGLA#APNAC" />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre del infractor" error={state?.fieldErrors?.infractorNombre}>
          <input name="infractorNombre" className={inputClass} required />
        </Field>
        <Field label="DNI del infractor (opcional)" error={state?.fieldErrors?.infractorDni}>
          <input name="infractorDni" className={inputClass} />
        </Field>
      </div>

      <Field label="Tipo de infracción" error={state?.fieldErrors?.tipoInfraccionId}>
        <select
          name="tipoInfraccionId"
          className={inputClass}
          value={tipoInfraccionId}
          onChange={(e) => setTipoInfraccionId(e.target.value)}
          required
        >
          <option value="" disabled>
            Seleccioná…
          </option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </Field>

      {esOtroTipo && (
        <Field
          label="Especificá el tipo de infracción"
          error={state?.fieldErrors?.tipoInfraccionOtra}
        >
          <input name="tipoInfraccionOtra" className={inputClass} required />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha de la infracción" error={state?.fieldErrors?.fechaInfraccion}>
          <input type="date" name="fechaInfraccion" className={inputClass} required />
        </Field>
        <Field label="Fecha de recepción del EE" error={state?.fieldErrors?.fechaRecepcionEE}>
          <input type="date" name="fechaRecepcionEE" className={inputClass} required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Sector del parque" error={state?.fieldErrors?.sector}>
          <input name="sector" className={inputClass} required />
        </Field>
        <Field label="U.G.D." error={state?.fieldErrors?.ugd}>
          <select name="ugd" className={inputClass} defaultValue="" required>
            <option value="" disabled>
              Seleccioná…
            </option>
            {UGDS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Guardaparque interviniente"
          error={state?.fieldErrors?.guardaparqueInterviniente}
        >
          <input name="guardaparqueInterviniente" className={inputClass} required />
        </Field>
        <Field label="Jefe de Guardaparques que elevó" error={state?.fieldErrors?.jefeGuardaparques}>
          <input name="jefeGuardaparques" className={inputClass} required />
        </Field>
      </div>

      <Field label="Descripción (opcional)" error={state?.fieldErrors?.descripcion}>
        <textarea name="descripcion" rows={3} className={inputClass} />
      </Field>

      <Field label="Adjuntos (opcional)">
        <input type="file" name="adjuntos" multiple className={inputClass} />
      </Field>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? 'Registrando…' : 'Registrar caso'}
      </button>
    </form>
  )
}
