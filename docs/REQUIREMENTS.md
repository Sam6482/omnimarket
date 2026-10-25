# Matriz de requisitos — OmniMarket

Actualizar el estado en el mismo PR que cambia la funcionalidad. "Verificado" exige evidencia enlazada (job de CI, reporte, captura o medición).

Estados: Pendiente · En desarrollo · Implementado sin verificar · Verificado · Bloqueado

**Última revisión:** 25 de octubre de 2026, sobre `main` en `dcae2f7`. Responsables: A = backend, auth, CI/CD y despliegue; B = interfaz y E2E de pantallas (hereda el trabajo de Sam).

| ID | Requisito oficial | Peso | Prioridad | Responsable | Criterio de aceptación | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| R1 | Next.js 14+, App Router, TypeScript, Tailwind | 25% | P0 | A | `pnpm typecheck` y `pnpm build` sin errores; TS strict | Job CI «Lint, pruebas, build y tipos» en verde en cada PR y en `main` (PR #10 en adelante) | Verificado |
| R2 | Renderizado sin errores de consola | (R1) | P0 | A (fixture) / B (páginas) | Fixture E2E falla ante `console.error` en todas las páginas | `e2e/fixtures.ts` (automático en cada E2E). E2E 1 recorre `/login`, `/`, `/inventory`, `/orders`, `/kanban` sin errores en CI (PR #16) | Verificado (páginas cubiertas por E2E 1) |
| R3 | `GET /api/test/analytics` paginado < 300 ms | 25% | P0 | A | Valida `page`/`limit` (máx. 100); p95 < 300 ms en producción caliente | Prod. 25-oct, 1,200 pedidos: `Server-Timing` total 4–11 ms; cliente (incl. internet) mediana 182–186 ms, p90 196–198 ms (`scripts/smoke-prod.ps1`). 10 pruebas en `tests/integration/analytics.test.ts` | Verificado |
| R4 | `POST /api/test/reset-data` | (R3) | P0 | A | Restaura dataset determinista; idempotente; no borra sesiones | Prod. 25-oct: 40/1200/3100 en 815 ms; dos resets seguidos en Neon `dev` con datos idénticos; GET → 405; protegido con `RESET_DATA_ENABLED` y anti-CSRF (PR #6). Se ejecuta en cada corrida E2E del CI | Verificado |
| R5 | `GET /api/test/kanban-status` | (R3) | P0 | A | Refleja estado tras D&D sin caché | Prod. 25-oct: tras mover OM-2, `?number=OM-2` devuelve `PROCESSING`; `Cache-Control: no-store`; smoke test del job `deploy` | Implementado sin verificar (falta aserción en E2E 3) |
| R6 | Kanban D&D con persistencia optimista | 20% | P0 | B (UI) / A (API) | Movimiento instantáneo; persiste tras recarga; revierte + toast si falla | Prod. 25-oct: OM-5 movido a Enviados, toast de éxito y sigue arriba tras recargar (PR #14). API con First Writer Wins y 409 (PR #5, 18 pruebas) | Implementado sin verificar (falta E2E 3 con fallo simulado) |
| R7 | CRUD avanzado | (R6) | P0 | B (UI) / A (API) | Crear, editar, eliminar pedidos y productos con Zod cliente + servidor | API protegida con 401; 13 pruebas de reglas de pedidos (PR #18): importes desde `Product`, importes históricos al editar solo el cliente, productos inexistentes, límite 999, 409 en conflicto. Pruebas de productos y esquemas (PR #9, #12) | Implementado sin verificar (falta E2E 2) |
| R8 | Bulk Update | (R6) | P0 | B (UI) / A (API) | N filas → nuevo estado; transacción todo-o-nada; toast | API `PATCH /api/orders/bulk` (PR #15): 14 pruebas, rollback ante id faltante (404 `missingIds`) y ante conflicto (409); 401 sin sesión en prod | En desarrollo (falta interfaz) |
| R9 | OAuth 2.0 Google + GitHub exclusivo | — | P0 | A | Login con ambos en producción; rutas privadas redirigen a `/login` | Prod. 25-oct: login con GitHub y con Google (otra cuenta); `/kanban` sin sesión → `/login?callbackUrl=%2Fkanban`; logout invalida la sesión. E2E 1 en CI (PR #16). Sin Credentials provider | Verificado |
| R10 | Skeletons en operaciones asíncronas | — | P0 | B | `loading.tsx` + skeletons por componente; sin spinners genéricos | — | Pendiente |
| R11 | Toast / reversión en Kanban y Bulk | — | P0 | B | 100 % de mutaciones con toast de resultado | Kanban muestra toast de éxito (prod. 25-oct). Falta Bulk y auditar CRUD | En desarrollo |
| R12 | 10 pruebas unitarias/integración | 15% | P0 | Todos | ≥ 10 (meta 15–20) en cálculo financiero, moneda, Zod, filtrado | **140 pruebas** en 22 archivos, en verde en CI: finanzas y moneda (`finance`, `format`), Zod (`order-status`, `bulk`, `order`, `product`), filtrado (`list-products`, `analytics`) | Verificado |
| R13 | 3 flujos E2E (auth, creación, D&D) | (R12) | P0 | A (auth, base) / B (creación, D&D) | Los tres en verde en CI | E2E 1 (autenticación) en verde en el job `e2e` del CI con PostgreSQL efímero (PR #16); reporte como artefacto `playwright-report` | En desarrollo (1 de 3) |
| R14 | GitHub Actions bloquea despliegue en Vercel | (R12) | P0 | A | Job `deploy` con `needs` de pruebas; auto-deploy de producción desactivado | Job `deploy` con `needs: [quality, e2e]`, solo en `main`, token en secretos de GitHub; ejecución `46b24f2`: quality → e2e → deploy en verde + smoke test (PR #17). Vercel no está conectado a Git: solo publica el CI | Verificado |
| R15 | Despliegue público con SSL válido | 15% | P0 | A | URL `https://` estable y accesible | `https://omnimarket-operations-hub-rho.vercel.app` (HTTPS), publicado automáticamente por el CI y verificado por el smoke test del job `deploy` | Verificado |

## Pruebas unitarias planificadas (R12)

| # | Prueba | Área PDF | Responsable | Estado |
|---|---|---|---|---|
| U1 | `averageTicket` caso normal | Cálculo financiero | A | Implementado (`tests/unit/finance.test.ts`) |
| U2 | `averageTicket` con 0 pedidos → 0 | Cálculo financiero | A | Implementado (`tests/unit/finance.test.ts`) |
| U3 | `grossMargin` (incluye costo 0) | Cálculo financiero | A | Implementado (`tests/unit/finance.test.ts`) |
| U4 | `formatCurrency` MXN desde centavos | Formateador | A | Implementado (`tests/unit/format.test.ts`) |
| U5 | `createOrderSchema` válido | Zod | A/Sam | Implementado (`tests/unit/order-schema.test.ts`) |
| U6 | `createOrderSchema` inválido (incl. > 999 sumando repetidos) | Zod | A/Sam | Implementado (`tests/unit/order-schema.test.ts`) |
| U7 | `bulkUpdateSchema` límites y duplicados | Zod | A | Implementado (`tests/unit/bulk-schema.test.ts`) |
| U8 | Paginación: coerción y límites | Zod | A | Implementado (`order-schema.test.ts`, `analytics.test.ts`) |
| U9 | Filtrado por texto, categoría y estado | Filtrado | A/Sam | Implementado (`list-products.test.ts`, `analytics.test.ts`) |
| U10 | Posición al mover en Kanban (inicio de columna) | Lógica | A/B | Implementado en servidor para Bulk (`bulk-update.test.ts`); UI pendiente de E2E 3 |
| I1 | analytics devuelve forma paginada | Integración | A | Implementado (`tests/integration/analytics.test.ts`) |
| I2 | bulk hace rollback si falta un id | Integración | A | Implementado (`tests/integration/bulk-update.test.ts`) |
| I3 | reset-data idempotente | Integración | A | Implementado (`tests/integration/reset-data.test.ts`) + probado en Neon `dev` |

## Mejoras competitivas (no oficiales)

| ID | Mejora | Prioridad | Estado |
|---|---|---|---|
| M1 | Panel `/status` de auditoría (latencia, endpoints, CI) | P1 | Pendiente |
| M2 | Kanban operable con teclado | P1 | Pendiente |
| M3 | Historial de pedido (`OrderEvent`) | P1 | Parcial: se registra cada cambio de estado (individual y bulk); falta mostrarlo en la UI |
| M4 | Modo oscuro por tokens | P1 | Pendiente |
| M5 | Exportar CSV | P2 | Pendiente |
