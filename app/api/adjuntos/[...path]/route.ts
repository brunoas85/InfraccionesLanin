import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ path: string[] }>

export async function GET(_request: Request, { params }: { params: Params }) {
  await verifySession()

  const { path: pathSegments } = await params
  const rutaArchivo = `uploads/${pathSegments.join('/')}`

  const adjunto = await prisma.adjunto.findFirst({ where: { rutaArchivo } })
  if (!adjunto) {
    return new Response('No encontrado', { status: 404 })
  }

  const absolutePath = path.join(/* turbopackIgnore: true */ process.cwd(), adjunto.rutaArchivo)
  const buffer = await readFile(absolutePath)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': adjunto.tipo,
      'Content-Disposition': `inline; filename="${encodeURIComponent(adjunto.nombreArchivo)}"`,
    },
  })
}
