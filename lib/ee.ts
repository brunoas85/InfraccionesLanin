export const REPARTICIONES = {
  DGA_APNAC: { label: 'DGA#APNAC', origen: 'GDE' as const },
  DGAJ_APNAC: { label: 'DGAJ#APNAC', origen: 'GDE' as const },
  DC_APNAC: { label: 'DC#APNAC', origen: 'TAD' as const },
  OTRA: { label: 'Otra', origen: null },
} as const

export type ReparticionKey = keyof typeof REPARTICIONES

/**
 * Normaliza un N° de EE para comparación y almacenamiento: mayúsculas,
 * sin espacios al principio/final, y espacios internos colapsados a uno solo.
 * El formato real de GDE/TAD trae un segmento con un espacio fijo entre guiones
 * (`EX-2018-XXXXXXXX- -APN-DGA#APNAC`) que no hay que perder al normalizar.
 */
export function normalizeNumeroEE(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ')
}

/**
 * Validación de forma general del N° de EE, no un regex rígido: no hay
 * especificación oficial confirmada de todas las variantes posibles del
 * segmento de repartición, así que solo se valida la estructura base
 * (EX-AAAA-NNNNNNNN-...) y se deja pasar el resto.
 */
const EE_SHAPE = /^EX-\d{4}-\d{8}-/

export function isValidNumeroEEShape(value: string): boolean {
  return EE_SHAPE.test(normalizeNumeroEE(value))
}

export function origenDeReparticion(reparticion: ReparticionKey): 'GDE' | 'TAD' | null {
  return REPARTICIONES[reparticion].origen
}
