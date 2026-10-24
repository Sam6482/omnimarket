# CLAUDE.md — OmniMarket Operations Hub

Reglas técnicas permanentes para Claude Code y para el equipo. Si una instrucción de chat contradice este archivo, pregunta antes de actuar. Las decisiones nuevas se registran en `docs/adr/`.

## Proyecto

Dashboard analítico de e-commerce para competencia. Fuente oficial de requisitos: "Lineamientos Oficiales - OmniMarket Operations Hub" (PDF). Matriz de seguimiento: `docs/REQUIREMENTS.md`. Contratos de API: `docs/API.md`.

El dictamen exige: despliegue público con SSL + CI activo + endpoints `/api/test/*` respondiendo. Todo cambio debe preservar esas tres cosas.

## Stack (no cambiar sin ADR)

- Next.js (versión estable fijada en package.json, cumple 14+) con App Router · TypeScript `strict` · Tailwind CSS
- PostgreSQL (Neon) + Prisma
- Auth.js (NextAuth v5) con Google y GitHub, Prisma Adapter, **sesiones en base de datos**. OAuth es el único método de login: no agregar Credentials provider.
- Zod para toda validación (esquemas compartidos cliente/servidor en `src/lib/schemas`)
- TanStack Query para estado del servidor y mutaciones optimistas
- dnd-kit (con KeyboardSensor) · shadcn/ui · Recharts · Sonner
- Vitest (unit/integración) · Playwright (E2E)
- GitHub Actions · Vercel
- Gestor de paquetes: **pnpm**

## Comandos

```bash
pnpm dev            # servidor local
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest
pnpm test:e2e       # Playwright
pnpm db:migrate     # prisma migrate dev (solo Programador A crea migraciones)
pnpm db:reset       # restablece la BD local con el dataset determinista
```

Antes de declarar una tarea terminada: `pnpm lint && pnpm typecheck && pnpm test` deben pasar. Reporta la salida real; nunca afirmes que algo pasó sin ejecutarlo.

## Arquitectura

```
src/app/            rutas (páginas en (dashboard)/, API en api/)
src/server/         solo servidor: db.ts, auth.ts, services/, seed/
src/lib/            código puro y compartido: schemas/, finance.ts, format.ts, filters.ts, api-client.ts
src/features/       componentes y hooks por módulo: dashboard/, orders/, kanban/, products/
src/components/ui/  componentes base (shadcn, Skeleton, EmptyState)
tests/unit, tests/integration, e2e/
```

Reglas:

1. **Route Handlers delgados**: autenticar → validar con Zod → llamar a un servicio → responder. La lógica de negocio vive en `src/server/services`.
2. **Autorización en cada handler privado** con `requireSession()`. No confiar solo en el middleware.
3. Las rutas `/api/test/*` son públicas por decisión (ver ADR-0001); `reset-data` solo toca tablas de dominio (Product, Order, OrderItem, OrderEvent), nunca usuarios ni sesiones.
4. **Dinero en centavos enteros** (`Int`, sufijo `Cents`). Formatear solo en la UI con `formatCurrency` (MXN, es-MX).
5. El servidor calcula precios y totales a partir de `Product`; nunca confía en montos enviados por el cliente.
6. Seed, `reset-data` y E2E usan el mismo generador determinista `src/server/seed/dataset.ts` (semilla fija).
7. Formato de error único: `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
8. Server Components para carga inicial; `"use client"` solo donde hay interactividad.
9. Prisma: `select` explícito, sin `include` masivos. Consultas de conteo y página en paralelo.

## UX obligatoria

- Toda carga o mutación asíncrona muestra **Skeleton** (no spinners genéricos).
- Toda mutación de Kanban y Bulk muestra **toast** de éxito o error y **revierte** el cambio optimista si falla.
- Accesibilidad: elementos interactivos operables con teclado, `aria-label` en botones de icono, contraste AA.
- Cero `console.error` / advertencias de hidratación (lo verifica un fixture E2E).
- Agregar `data-testid` estables a elementos que usan los E2E.

## Prohibido

- Datos simulados que aparenten persistencia real en código integrado a `main`.
- Secretos en el repositorio, en logs o en mensajes de commit. Usar `.env.local` (ignorado) y variables de Vercel/GitHub.
- `any` sin comentario que lo justifique. `// @ts-ignore`.
- Nuevas dependencias sin justificación en el PR.
- Modificar `prisma/schema.prisma` o crear migraciones si no eres el responsable (Programador A); proponer el cambio por PR/issue.
- Desactivar pruebas para que el CI pase.

## Git

- `main` protegida: PR + CI verde + 1 aprobación. Merge squash.
- Ramas cortas: `feat/…`, `fix/…`, `test/…`, `chore/…`, `docs/…`.
- Conventional Commits: `feat(kanban): persist column move with optimistic rollback`.
- PR pequeño (< 400 líneas idealmente), con el requisito afectado (R#) y cómo se probó.
- Archivos compartidos sensibles (`package.json`, `src/lib/schemas/`, `schema.prisma`): avisar al equipo antes de modificarlos.

## Definición de terminado

Una funcionalidad está **Verificada** solo si: cumple el requisito oficial, persiste tras recargar (si aplica), maneja errores, valida entradas, tiene prueba automatizada que la cubre y funciona en producción. Actualiza su estado en `docs/REQUIREMENTS.md` en el mismo PR.

Estados válidos: Pendiente · En desarrollo · Implementado sin verificar · Verificado · Bloqueado.
