# Matriz de requisitos — OmniMarket

Actualizar el estado en el mismo PR que cambia la funcionalidad. "Verificado" exige evidencia enlazada (job de CI, reporte, captura o medición).

Estados: Pendiente · En desarrollo · Implementado sin verificar · Verificado · Bloqueado

| ID | Requisito oficial | Peso | Prioridad | Responsable | Criterio de aceptación | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| R1 | Next.js 14+, App Router, TypeScript, Tailwind | 25% | P0 | A | `pnpm typecheck` y `pnpm build` sin errores; TS strict | Job CI | Pendiente |
| R2 | Renderizado sin errores de consola | (R1) | P0 | C | Fixture E2E falla ante `console.error` en todas las páginas | Reporte Playwright | Pendiente |
| R3 | `GET /api/test/analytics` paginado < 300 ms | 25% | P0 | A | Valida `page`/`limit` (máx. 100); p95 < 300 ms en producción caliente | Script de medición + `Server-Timing` | Pendiente |
| R4 | `POST /api/test/reset-data` | (R3) | P0 | A | Restaura dataset determinista; idempotente; no borra sesiones | Prueba de integración + prueba real en Neon `dev` (40/1200/3100; `production` intacta) | Implementado sin verificar (falta producción) |
| R5 | `GET /api/test/kanban-status` | (R3) | P0 | A | Refleja estado tras D&D sin caché | Aserción en E2E 3 | Pendiente |
| R6 | Kanban D&D con persistencia optimista | 20% | P0 | B | Movimiento instantáneo; persiste tras recarga; revierte + toast si falla | E2E 3 + prueba manual sin red | Pendiente |
| R7 | CRUD avanzado | (R6) | P0 | B (UI) / A (API) | Crear, editar, eliminar pedidos y productos con Zod cliente + servidor | E2E 2 + pruebas de esquemas | Pendiente |
| R8 | Bulk Update | (R6) | P0 | B (UI) / A (API) | N filas → nuevo estado; transacción todo-o-nada; toast | Prueba de integración + manual | Pendiente |
| R9 | OAuth 2.0 Google + GitHub exclusivo | — | P0 | C | Login con ambos en producción; rutas privadas redirigen a `/login` | E2E 1 + prueba manual con cuenta ajena | Pendiente |
| R10 | Skeletons en operaciones asíncronas | — | P0 | B | `loading.tsx` + skeletons por componente; sin spinners genéricos | Capturas | Pendiente |
| R11 | Toast / reversión en Kanban y Bulk | — | P0 | B | 100 % de mutaciones con toast de resultado | E2E + manual | Pendiente |
| R12 | 10 pruebas unitarias/integración | 15% | P0 | Todos | ≥ 10 (meta 15–20) en cálculo financiero, moneda, Zod, filtrado | Job CI Vitest | Pendiente |
| R13 | 3 flujos E2E (auth, creación, D&D) | (R12) | P0 | C (auth) / B (creación, D&D) | Los tres en verde en CI | Artefacto Playwright | Pendiente |
| R14 | GitHub Actions bloquea despliegue en Vercel | (R12) | P0 | C | Job `deploy` con `needs` de pruebas; auto-deploy de producción desactivado | Captura de pipeline rojo sin deploy | Pendiente |
| R15 | Despliegue público con SSL válido | 15% | P0 | A | URL `https://` estable y accesible | Prueba de humo en producción | Pendiente |

## Pruebas unitarias planificadas (R12)

| # | Prueba | Área PDF | Responsable | Estado |
|---|---|---|---|---|
| U1 | `averageTicket` caso normal | Cálculo financiero | B | Pendiente |
| U2 | `averageTicket` con 0 pedidos → 0 | Cálculo financiero | B | Pendiente |
| U3 | `grossMargin` (incluye costo 0) | Cálculo financiero | B | Pendiente |
| U4 | `formatCurrency` MXN desde centavos | Formateador | B | Pendiente |
| U5 | `orderCreateSchema` válido | Zod | A | Pendiente |
| U6 | `orderCreateSchema` inválido | Zod | A | Pendiente |
| U7 | `bulkUpdateSchema` límites y duplicados | Zod | A | Pendiente |
| U8 | `paginationSchema` coerción y límites | Zod | A | Pendiente |
| U9 | `filterOrders` estado/fechas/texto | Filtrado | B | Pendiente |
| U10 | `computePosition` reordenamiento Kanban | Lógica | C | Pendiente |
| I1 | analytics devuelve forma paginada | Integración | A | Pendiente |
| I2 | bulk hace rollback si falta un id | Integración | A | Pendiente |
| I3 | reset-data idempotente | Integración | A | Implementado |

## Mejoras competitivas (no oficiales)

| ID | Mejora | Prioridad | Estado |
|---|---|---|---|
| M1 | Panel `/status` de auditoría (latencia, endpoints, CI) | P1 | Pendiente |
| M2 | Kanban operable con teclado | P1 | Pendiente |
| M3 | Historial de pedido (`OrderEvent`) | P1 | Pendiente |
| M4 | Modo oscuro por tokens | P1 | Pendiente |
| M5 | Exportar CSV | P2 | Pendiente |
