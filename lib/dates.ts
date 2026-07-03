/**
 * fechaInfraccion y fechaRecepcionEE son fechas calendario (sin hora), guardadas
 * como medianoche UTC a partir de un <input type="date">. Formatearlas con la
 * zona horaria local (como haría toLocaleDateString por defecto) corre el día
 * mostrado según el huso del servidor. Se fuerza UTC para que el día mostrado
 * sea siempre el que se cargó.
 */
export function formatFechaSolo(date: Date): string {
  return date.toLocaleDateString('es-AR', { timeZone: 'UTC' })
}
