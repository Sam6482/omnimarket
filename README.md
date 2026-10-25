# OmniMarket — Operations Hub

Plataforma web de analítica y gestión de e-commerce: dashboard financiero, inventario, pedidos, tablero Kanban con drag & drop y actualización masiva, con autenticación OAuth y endpoints de auditoría.

**Producción:** https://omnimarket-operations-hub-rho.vercel.app (HTTPS)

| Documento | Contenido |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Requisitos R1–R15, estado y evidencias |
| [docs/API.md](docs/API.md) | Contratos de todos los endpoints |
| [docs/adr/0001-stack-y-decisiones-base.md](docs/adr/0001-stack-y-decisiones-base.md) | Decisiones de arquitectura |
| [e2e/README.md](e2e/README.md) | Cómo ejecutar y escribir pruebas E2E |
| [CLAUDE.md](CLAUDE.md) | Reglas técnicas del equipo |

## Funcionalidades

- **Dashboard** (`/`): ingresos, pedidos, ticket promedio, margen bruto y distribución por estado, calculados en PostgreSQL. Montos en MXN desde centavos enteros.
- **Inventario** (`/inventory`): búsqueda, filtro por categoría, paginación y CRUD de productos (SKU único; no se elimina un producto con pedidos).
- **Pedidos** (`/orders`): búsqueda, filtros, paginación y CRUD. Los importes los calcula el servidor con los precios de `Product`; editar solo el cliente conserva los importes históricos.
- **Kanban** (`/kanban`): cinco columnas por estado, drag & drop y selector accesible, actualización optimista con reversión y control de concurrencia *First Writer Wins* (409).
- **Bulk Update** (`PATCH /api/orders/bulk`): cambio de estado de 1 a 100 pedidos en una transacción todo-o-nada.
- **Auditoría** (públicos): `GET /api/test/analytics`, `GET /api/test/kanban-status` y `POST /api/test/reset-data` (dataset determinista: 40 productos, 1,200 pedidos, 3,100 líneas).
- **Autenticación**: OAuth 2.0 con Google y GitHub (Auth.js v5, sesiones en base de datos). Páginas y APIs privadas exigen sesión.

## Tecnologías

Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind CSS · PostgreSQL (Neon) · Prisma 6 · Zod · Auth.js v5 · Vitest · Playwright · GitHub Actions · Vercel · pnpm 10.

## Ejecutar en local

Requisitos: Node.js ≥ 20.9, pnpm 10 (en Windows: `corepack.cmd pnpm`), una rama de Neon **de desarrollo**.

```powershell
corepack.cmd pnpm install --frozen-lockfile
Copy-Item .env.example .env.local   # completar con la base de DESARROLLO, nunca production
corepack.cmd pnpm dev
```

La app abre en `http://localhost:3000`. Para iniciar sesión en local, el cliente OAuth debe tener registrado `http://localhost:3000/api/auth/callback/<google|github>`.

Para probar `reset-data` con datos reales sin riesgo, usar el servidor protegido: `node scripts/with-neon-dev.mjs check` y `node scripts/with-neon-dev.mjs dev` (puerto 3100, solo rama `dev`).

## Verificación

```powershell
corepack.cmd pnpm lint
corepack.cmd pnpm typecheck
corepack.cmd pnpm test        # Vitest: unitarias e integración
corepack.cmd pnpm build
corepack.cmd pnpm test:e2e    # Playwright: requiere .env.e2e.local (ver e2e/README.md)
```

Prueba de humo del sitio publicado (solo lectura):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/smoke-prod.ps1
```

## CI/CD

`.github/workflows/ci.yml`:

1. **quality**: lint, pruebas, build y typecheck (en cada PR y en `main`).
2. **e2e**: Playwright contra un PostgreSQL efímero del propio job (sin secretos).
3. **deploy**: solo en `main` y **solo si los dos anteriores pasan**. Publica en Vercel y ejecuta una prueba de humo en producción.

No se publica manualmente: el sitio solo cambia mediante merge a `main` con el CI en verde.

## Flujo de trabajo

- Nunca trabajar en `main`: una rama por tarea (`feat/`, `fix/`, `test/`, `chore/`, `docs/`) y un PR pequeño.
- Merge con *Squash and merge* solo con el CI en verde.
- Commits con formato `tipo(área): descripción`.

## Seguridad

- Secretos solo en `.env.local` / `.env.neon-dev` / `.env.e2e.local` (ignorados por Git), en Vercel y en GitHub Secrets.
- Nunca ejecutar `reset-data`, migraciones destructivas ni E2E contra la base `production`. Los scripts y la configuración E2E bloquean su endpoint.
- `POST /api/test/reset-data` solo funciona con `RESET_DATA_ENABLED=true` (Vercel producción, CI y servidor protegido de `dev`).
