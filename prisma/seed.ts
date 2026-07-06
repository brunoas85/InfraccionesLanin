import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { TIPO_INFRACCION_OTROS_NOMBRE } from '../lib/tipos'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DEV_PASSWORD = 'infracciones2026'

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10)

  await prisma.user.upsert({
    where: { email: 'admin@infraccioneslanin.local' },
    update: {},
    create: {
      email: 'admin@infraccioneslanin.local',
      nombre: 'Administrador',
      rol: 'ADMIN',
      passwordHash,
    },
  })

  await prisma.user.upsert({
    where: { email: 'mesadeentradas@infraccioneslanin.local' },
    update: {},
    create: {
      email: 'mesadeentradas@infraccioneslanin.local',
      nombre: 'Mesa de Entradas',
      rol: 'MESA_DE_ENTRADAS',
      passwordHash,
    },
  })

  await prisma.user.upsert({
    where: { email: 'responsable@infraccioneslanin.local' },
    update: {},
    create: {
      email: 'responsable@infraccioneslanin.local',
      nombre: 'Responsable del Área',
      rol: 'RESPONSABLE_AREA',
      passwordHash,
    },
  })

  const tiposInfraccion = [
    { nombre: 'Pesca sin permiso', montoMin: 50000, montoMax: 200000 },
    { nombre: 'Circulación fuera de senderos habilitados', montoMin: 20000, montoMax: 80000 },
    { nombre: 'Extracción de flora o fauna nativa', montoMin: 100000, montoMax: 500000 },
    { nombre: 'Fogón fuera de zona habilitada', montoMin: 80000, montoMax: 300000 },
    { nombre: 'Ingreso de mascotas a zona restringida', montoMin: 15000, montoMax: 60000 },
    { nombre: TIPO_INFRACCION_OTROS_NOMBRE, montoMin: 0, montoMax: 0 },
  ]

  for (const tipo of tiposInfraccion) {
    const existing = await prisma.tipoInfraccion.findFirst({ where: { nombre: tipo.nombre } })
    if (!existing) {
      await prisma.tipoInfraccion.create({ data: tipo })
    }
  }

  console.log('Seed completo.')
  console.log(`Contraseña para todos los usuarios de prueba: ${DEV_PASSWORD}`)
  console.log('- admin@infraccioneslanin.local (ADMIN)')
  console.log('- mesadeentradas@infraccioneslanin.local (MESA_DE_ENTRADAS)')
  console.log('- responsable@infraccioneslanin.local (RESPONSABLE_AREA)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
