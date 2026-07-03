# Infracciones Lanín

## Descripción del proyecto

Webapp interna para el Área de Infracciones del Parque Nacional Lanín (Administración de Parques Nacionales). Digitaliza el seguimiento administrativo y legal de los expedientes de infracciones desde que son derivados por GDE/TAD hasta la resolución (Disposición) y la generación de la orden de pago.

### Funcionalidades principales

- Registrar el Expediente Electrónico (EE) derivado desde GDE o TAD, vinculándolo a un caso interno (N° de EE único, evita duplicados)
- Evaluar, tipificar la infracción y emitir la Disposición (Sancionado / Archivado / Sobreseído)
- Generar automáticamente la orden de pago en PDF cuando corresponde sanción, y registrar el comprobante de pago recibido externamente
- Buscador con filtros: estado, tipo de infracción, repartición/origen (GDE o TAD), rango de fecha de la infracción y rango de fecha de recepción del EE (independientes entre sí), texto libre (N° EE, N° Disposición, infractor)
- Importador de `.xlsx` para migración inicial del historial de infracciones (no reemplaza la carga por formulario en el uso diario)
- Alertas de vencimiento de plazos legales (descargo, resolución)

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** Next.js (Server Actions / API routes, monolito — no justifica microservicios para este volumen)
- **Base de datos:** PostgreSQL + Prisma
- **Almacenamiento de adjuntos:** S3-compatible o almacenamiento local, a definir con el área de sistemas de APN
- **Generación de PDF:** Puppeteer o pdf-lib (orden de pago)
- **Infraestructura:** on-premise, empaquetado en contenedores Docker — lo despliega y mantiene el área de sistemas de APN, no depende de un proveedor cloud específico
- **Auth:** interno (usuario/contraseña, sin OAuth público), con roles; preparado para sumar SSO institucional más adelante

## Estructura

Next.js full-stack en un solo proyecto (sin `frontend/`/`backend/` separados — Server Actions y Route Handlers cubren el backend):

```
infracciones-lanin/
├── app/
│   ├── actions/         Server Actions (auth.ts, casos.ts)
│   ├── login/
│   ├── api/adjuntos/    Route Handler que sirve adjuntos con auth (no van en /public)
│   └── (app)/           Grupo de rutas autenticadas — layout con nav y verifySession()
│       └── casos/       nuevo/, [id]/, page.tsx (listado + buscador)
├── lib/
│   ├── session.ts       Sesión JWT (jose) en cookie httpOnly
│   ├── dal.ts            verifySession() / requireRol() — Data Access Layer
│   ├── ee.ts             normalización/validación del N° de EE, mapeo repartición→origen
│   ├── labels.ts          labels de enums para la UI
│   ├── prisma.ts          cliente Prisma (con adapter de Postgres)
│   └── generated/prisma/  cliente generado por Prisma (gitignored)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── proxy.ts              (reemplaza a "middleware" desde Next.js 16) protección optimista por sesión
├── prisma.config.ts       config de Prisma 7 (ya no usa `url` en el datasource del schema)
├── docker-compose.yml     Postgres para desarrollo local
└── docs/especificacion.md
```

### Cómo levantar el proyecto en desarrollo

```bash
npm run db:up       # levanta Postgres en Docker
npm run db:migrate   # crea las tablas (primera vez: --name init)
npm run db:seed      # crea usuarios de prueba (los 3 roles) y catálogo de tipos de infracción
npm run dev           # levanta la app en http://localhost:3000
```

Las credenciales de los usuarios de prueba quedan impresas en la consola al correr `db:seed`.

## Convenciones

- Todo el código, variables, comentarios y UI en **español**
- Componentes en **PascalCase**
- Commits y nombres de archivos en **inglés**, salvo textos visibles al usuario

## Roles

- **Mesa de Entradas:** registra el EE derivado desde GDE/TAD, gestiona notificaciones y el seguimiento administrativo del área
- **Responsable del Área (de Infracciones):** evalúa, tipifica, resuelve y firma la Disposición
- **Administrador:** gestión de usuarios, catálogo de infracciones y montos, parámetros de plazos legales

## Modelo de datos (referencia inicial)

- **Caso/Expediente interno:** N° de EE (único), repartición (`DGA#APNAC`, `DGAJ#APNAC`, `DC#APNAC`), origen (GDE o TAD, derivado de la repartición), infractor, tipo de infracción, fecha de la infracción, fecha de recepción del EE, sector del parque, guardaparque interviniente, Jefe de Guardaparques que elevó el caso, adjuntos, estado
- **Estados:** Cargado → En evaluación → (Con descargo presentado) → Resuelto (Sancionado / Archivado / Sobreseído) → (Con orden de pago) → Pagado
- **Disposición:** N° de Disposición, resultado, monto de la multa (si aplica)
- **Orden de pago:** PDF generado, código de referencia, comprobante adjunto al conciliar

## Notas / reglas de negocio clave

- El sistema **no reemplaza a GDE ni a TAD**: solo referencia el N° de EE, que sigue siendo la fuente de verdad del trámite formal.
- **No hay integración por API con GDE** en esta fase (no hay permisos de APN para gestionarla). La carga es manual vía formulario, con el N° de EE como clave única para evitar duplicados.
- Formato de EE: `EX-AAAA-NNNNNNNN- -SIGLA-SIGLA#SIGLA`. Validación flexible (no regex rígido) más normalización (mayúsculas, sin espacios extra) antes de chequear duplicados.
- Reparticiones válidas conocidas: `DGA#APNAC`, `DGAJ#APNAC` (vía GDE), `DC#APNAC` (vía TAD) — desplegable en el formulario, con opción "Otra" a texto libre por si aparece una nueva.
- **No hay registro de infracciones en campo** (los guardaparques no usan la app). El punto de entrada al sistema es Mesa de Entradas, al recibir la derivación del EE.
- El acto de cierre del Área de Infracciones es una **"Disposición"**, no una "resolución" genérica — respetar esta terminología en el código y la UI.
- El pago de la multa **no se cobra online**: el sistema solo genera la orden de pago; se concilia manualmente al recibir el comprobante externo.
- El historial de cada caso es de solo lectura una vez escrito (auditoría inmutable) — dato sensible en un sistema con valor legal.
- Flujo completo: Guardaparque detecta infracción → Jefe de Guardaparques eleva → se inicia el EE en GDE o TAD → se deriva al Área de Infracciones → Mesa de Entradas lo registra en el sistema → Responsable del Área evalúa y emite la Disposición → (si corresponde) orden de pago.

## Notas técnicas

- **Next.js 16**: "Middleware" pasó a llamarse **Proxy** (`proxy.ts` en la raíz, no `middleware.ts`). `params` y `searchParams` en páginas son `Promise` y hay que `await`-earlos.
- **Prisma 7**: el datasource del `schema.prisma` ya **no lleva `url`** — la connection string vive en `prisma.config.ts` (usado por la CLI) y en runtime el `PrismaClient` necesita un **adapter** explícito (`@prisma/adapter-pg` + `pg`), ver `lib/prisma.ts`. El generator usa `provider = "prisma-client"` (no `prisma-client-js`) y el cliente generado se importa desde `@/lib/generated/prisma/client`.
- **Sesión**: JWT propio firmado con `jose` en una cookie `httpOnly` (no se usa NextAuth/Auth.js) — patrón documentado oficialmente por Next.js, evita depender de una librería de auth de compatibilidad incierta con una versión de Next tan nueva.
- **Adjuntos**: se guardan en `./uploads/<casoId>/...` (no en `/public`) y se sirven vía `app/api/adjuntos/[...path]/route.ts`, que exige sesión antes de devolver el archivo — no son de acceso público dado que son evidencia de expedientes con valor legal.
- Este entorno de desarrollo no tiene Docker disponible. El flujo se probó igual de punta a punta usando `npx prisma dev` (una base Postgres local efímera que no depende de Docker) en vez de `docker-compose.yml` — sirvió para validar el código, pero **no** es el mecanismo real de desarrollo: contra esa base efímera `prisma migrate dev` falla (error P1017, por cómo maneja su shadow database contra `template1`), así que la sincronización de schema para esa prueba se hizo con `prisma db push`. Contra el Postgres real de `docker-compose.yml` no debería pasar esto — ahí corresponde usar `npm run db:migrate` (`prisma migrate dev`) normalmente, que además genera el historial de migraciones en `prisma/migrations/` (no hay ninguno commiteado todavía).
- En esa prueba end-to-end (login → registrar EE → duplicado rechazado → buscador con los filtros combinados → control de acceso por rol → logout) se encontró y corrigió un bug real: las fechas de infracción y de recepción de EE se mostraban un día antes del cargado, por mezclar fechas guardadas en UTC medianoche con formateo en hora local. Se corrigió centralizando el formateo de fechas-sin-hora en `lib/dates.ts` (`formatFechaSolo`, fuerza `timeZone: 'UTC'`) y ajustando el límite superior de los filtros de rango de fecha en `app/(app)/casos/page.tsx` para que también sea explícitamente UTC.
