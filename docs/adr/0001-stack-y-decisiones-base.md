# ADR-0001 — Stack y decisiones base

- Estado: **Propuesta** (cambiar a "Aceptada" cuando los tres lo aprueben)
- Fecha: 2026-10-23

## Contexto

Competencia con rúbrica oficial (PDF). Tres programadores, fin de semana, Claude Code como apoyo. Prioridad: cumplimiento verificable, estabilidad y despliegue temprano.

## Decisiones

1. **Monolito modular Next.js** (App Router, TS strict, Tailwind) desplegado en Vercel. Sin microservicios.
2. **PostgreSQL en Neon + Prisma**, misma región que las funciones de Vercel para cumplir < 300 ms.
3. **Auth.js con Google y GitHub y sesiones en base de datos.** OAuth es el único login. El E2E de autenticación inserta una `Session` en la BD de prueba y usa su cookie: no existe proveedor falso en producción.
4. **`/api/test/*` públicos.** El evaluador los consultará directamente. `analytics` y `kanban-status` son de solo lectura; `reset-data` solo restaura tablas de dominio y nunca usuarios ni sesiones. Pendiente confirmar con el docente.
5. **Mutaciones vía Route Handlers + TanStack Query** (optimismo explícito con `onMutate`/`onError`), no Server Actions.
6. **Dinero en centavos enteros.**
7. **Deploy de producción desde GitHub Actions** (Vercel CLI, job dependiente de las pruebas) para que el CI realmente bloquee despliegues. Auto-deploy de producción de Vercel desactivado.
8. **Dataset determinista único** para seed, reset-data y E2E.

## Consecuencias

- Las rutas privadas requieren `requireSession()` en cada handler.
- Los previews de Vercel no tendrán OAuth funcional (callbacks fijos); se aceptan sin login.
- El SLA depende de evitar cold starts: se requiere medición y, si hace falta, ping periódico.
