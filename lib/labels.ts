export const ESTADO_LABEL: Record<string, string> = {
  CARGADO: 'Cargado',
  EN_EVALUACION: 'En evaluación',
  CON_DESCARGO: 'Con descargo presentado',
  RESUELTO: 'Resuelto',
  CON_ORDEN_DE_PAGO: 'Con orden de pago',
  PAGADO: 'Pagado',
}

export const ESTADO_COLOR: Record<string, string> = {
  CARGADO: 'bg-slate-100 text-slate-700',
  EN_EVALUACION: 'bg-amber-100 text-amber-800',
  CON_DESCARGO: 'bg-amber-100 text-amber-800',
  RESUELTO: 'bg-emerald-100 text-emerald-800',
  CON_ORDEN_DE_PAGO: 'bg-blue-100 text-blue-800',
  PAGADO: 'bg-emerald-100 text-emerald-800',
}

export const REPARTICION_LABEL: Record<string, string> = {
  DGA_APNAC: 'DGA#APNAC',
  DGAJ_APNAC: 'DGAJ#APNAC',
  DC_APNAC: 'DC#APNAC',
  OTRA: 'Otra',
}

export const ORIGEN_LABEL: Record<string, string> = {
  GDE: 'GDE',
  TAD: 'TAD',
}
