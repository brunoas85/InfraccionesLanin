import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { logout } from '@/app/actions/auth'

const ROL_LABEL: Record<string, string> = {
  MESA_DE_ENTRADAS: 'Mesa de Entradas',
  RESPONSABLE_AREA: 'Responsable del Área',
  ADMIN: 'Administrador',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  const puedeRegistrarEE = session.rol === 'MESA_DE_ENTRADAS' || session.rol === 'ADMIN'

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/casos" className="text-sm font-semibold text-emerald-800">
              Infracciones Lanín
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/casos" className="hover:text-emerald-800">
                Casos
              </Link>
              {puedeRegistrarEE && (
                <Link href="/casos/nuevo" className="hover:text-emerald-800">
                  Registrar EE
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>
              {session.nombre} · <span className="text-slate-400">{ROL_LABEL[session.rol]}</span>
            </span>
            <form action={logout}>
              <button type="submit" className="text-emerald-800 hover:underline">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
