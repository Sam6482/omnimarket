# Contratos de API — OmniMarket

Versión 0.1 (propuesta del viernes). Los esquemas Zod de `src/lib/schemas/` son la fuente de verdad del código; este documento debe mantenerse sincronizado con ellos.

## Convenciones

- JSON en request y response. Fechas en ISO 8601 (UTC). Dinero en centavos enteros (`*Cents`).
- Errores:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Descripción legible", "details": {} } }
```

| HTTP | code | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Entrada inválida (Zod) |
| 401 | `UNAUTHENTICATED` | Ruta privada sin sesión |
| 403 | `FORBIDDEN` | Operación deshabilitada en el entorno u origen no permitido (`reset-data`) |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `CONFLICT` | Duplicado (SKU) o conflicto de versión |
| 500 | `INTERNAL_ERROR` | Error no controlado (sin filtrar detalles internos) |

- Paginación: `page` (entero ≥ 1, por defecto 1) y `limit` (1–100, por defecto 20; analytics por defecto 50).

```json
"pagination": { "page": 1, "limit": 50, "total": 1240, "totalPages": 25, "hasNext": true }
```

- Estados de pedido (enum `OrderStatus`): `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`. Cada estado es una columna del Kanban. Movimiento libre entre columnas (restricción de transiciones: mejora P1 pendiente de decisión).

---

## Endpoints de auditoría (públicos)

### `GET /api/test/analytics`

Query: `page`, `limit`, opcionales `from`, `to` (fechas ISO) y `status`.

Objetivo: p95 < 300 ms en producción. Incluye header `Server-Timing: db;dur=…, total;dur=…` y `Cache-Control: no-store`.

```json
{
  "summary": {
    "revenueCents": 123456789,
    "orders": 1240,
    "averageTicketCents": 99562,
    "grossMarginCents": 45678900,
    "grossMarginPct": 37.0,
    "byStatus": { "PENDING": 210, "PROCESSING": 180, "SHIPPED": 300, "DELIVERED": 480, "CANCELLED": 70 }
  },
  "data": [
    {
      "id": "clx…",
      "number": "OM-1042",
      "createdAt": "2026-10-20T15:04:05.000Z",
      "status": "SHIPPED",
      "customerName": "Ana López",
      "itemsCount": 3,
      "totalCents": 250000,
      "costCents": 160000,
      "marginCents": 90000,
      "marginPct": 36.0
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1240, "totalPages": 25, "hasNext": true },
  "meta": { "durationMs": 42, "generatedAt": "2026-10-24T18:00:00.000Z" }
}
```

Errores: 400 si `page`/`limit` son inválidos o `limit > 100`.

### `POST /api/test/reset-data`

Sin body. Restaura el dataset determinista (semilla fija) dentro de una transacción. Borra y recrea solo `OrderEvent`, `OrderItem`, `Order`, `Product`. **No toca** `User`, `Account`, `Session`. Idempotente: dos llamadas seguidas producen el mismo estado (ids `seed-*`, números `OM-1…OM-1200`; el siguiente pedido creado será `OM-1201`).

Protección del endpoint:

- Solo funciona si el entorno define `RESET_DATA_ENABLED=true` (Vercel producción, CI de E2E y `node scripts/with-neon-dev.mjs dev`). Sin la variable responde **403 `FORBIDDEN`**. **No agregarla a `.env.local`.**
- Rechaza con 403 las peticiones de navegador desde otro sitio (`Origin` distinto o `Sec-Fetch-Site: cross-site`). curl, Postman, Playwright y la propia app funcionan.
- Solo acepta `POST` (un `GET` recibe 405).
- 409 `CONFLICT` si ya hay un reset en curso (no se encola).
- 500 `INTERNAL_ERROR` sin detalles internos; la transacción revierte todo.

```json
{ "ok": true, "seed": 42, "counts": { "products": 40, "orders": 1200, "orderItems": 3100 }, "durationMs": 850 }
```

### `GET /api/test/kanban-status`

`Cache-Control: no-store`. Dos formas:

Sin parámetros — estado completo del tablero:

```json
{
  "columns": [
    {
      "status": "PENDING",
      "count": 210,
      "totalCents": 2100000,
      "orders": [{ "id": "clx…", "number": "OM-1042", "position": 1000, "updatedAt": "…" }]
    }
  ],
  "generatedAt": "…"
}
```

`orders` por columna se limita a las primeras 50 por `position` (los conteos son totales).

Con `?orderId=…` o `?number=OM-1042` — estado de un pedido:

```json
{ "order": { "id": "clx…", "number": "OM-1042", "status": "SHIPPED", "position": 1500, "updatedAt": "…" } }
```

404 si no existe.

---

## Autenticación (Auth.js v5)

- Proveedores: Google y GitHub (OAuth 2.0). Sin Credentials provider.
- Sesiones en base de datos (`Session`), duración 7 días. Cookie: `__Secure-authjs.session-token` (HTTPS) o `authjs.session-token` (HTTP local).
- Página: `/login` (`?callbackUrl=/ruta-interna`, `?error=` de Auth.js). Endpoints de Auth.js en `/api/auth/*`.
- Callbacks OAuth a registrar: `https://<dominio>/api/auth/callback/google` y `https://<dominio>/api/auth/callback/github`.
- Rutas privadas: `const user = await requireSession(); if (!user) return unauthorizedResponse();` (`@/server/auth`, `@/server/http/errors`).
- Páginas privadas: `const user = await requirePageSession("/ruta");` → redirige a `/login` sin sesión.
- Si Auth.js está mal configurado, `requireSession()` devuelve `null` (401), nunca acceso.

## Endpoints privados (requieren sesión)

### Pedidos

| Método | Ruta | Body / Query | Respuesta |
|---|---|---|---|
| GET | `/api/orders` | `page`, `limit`, `status`, `q` (número, cliente o email), `from`, `to`, `sort` (`createdAt:desc` por defecto) | `{ data: Order[], pagination }` |
| POST | `/api/orders` | `{ customerName, customerEmail, status?, items: [{ productId, quantity }] }` | 201 `Order` |
| GET | `/api/orders/:id` | — | `Order` con `items` |
| PATCH | `/api/orders/:id` | campos editables (`customerName`, `customerEmail`, `items`) | `Order` |
| DELETE | `/api/orders/:id` | — | 204 |
| PATCH | `/api/orders/:id/status` | `{ status, position, expectedUpdatedAt? }` | `{ id, status, position, updatedAt }` |
| PATCH | `/api/orders/bulk` | `{ ids: string[] (1–100, únicos), status }` | `{ updated: number, unchanged: number }` |

Reglas:

- `POST /api/orders`: el servidor toma `priceCents`/`costCents` de cada `Product` y calcula `totalCents`/`costCents` del pedido. `quantity` entero 1–999. `items` no vacío. Valida stock (P1).
- `PATCH …/status`: movimiento de Kanban. Si se envía `expectedUpdatedAt` y no coincide → 409 `CONFLICT` (el cliente revierte y refresca).
- `PATCH /api/orders/bulk`: transacción todo-o-nada. Si algún id no existe → 404 con `details.missingIds` y no se modifica nada. Si otro usuario modificó alguno durante la operación → 409 `CONFLICT` (`details.orderIds`) y se revierte todo. Los que ya están en el estado destino no se tocan (`unchanged`). Los movidos van al inicio de la columna destino, en el orden recibido (siguen visibles en las primeras 50 de `kanban-status`).
- Cada cambio de estado registra un `OrderEvent` (P1).

`Order` (lista):

```json
{ "id": "clx…", "number": "OM-1042", "customerName": "Ana López", "customerEmail": "ana@example.com",
  "status": "PENDING", "position": 1000, "totalCents": 250000, "costCents": 160000,
  "itemsCount": 3, "createdAt": "…", "updatedAt": "…" }
```

### Productos

| Método | Ruta | Body / Query | Respuesta |
|---|---|---|---|
| GET | `/api/products` | `page`, `limit`, `q`, `category` | `{ data: Product[], pagination }` |
| POST | `/api/products` | `{ sku, name, category, priceCents, costCents, stock }` | 201 `Product` (409 si SKU duplicado) |
| PATCH | `/api/products/:id` | campos parciales | `Product` |
| DELETE | `/api/products/:id` | — | 204 (409 si tiene pedidos asociados) |

Validación: `priceCents` y `costCents` enteros ≥ 0; `stock` entero ≥ 0; `sku` 3–32 caracteres `[A-Z0-9-]`.
