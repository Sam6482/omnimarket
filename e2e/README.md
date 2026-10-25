# Pruebas E2E (Playwright) — R13

Tres flujos obligatorios: **1. Autenticación** (`auth.spec.ts`, listo), **2. Creación** y **3. Drag & Drop del Kanban**.

## Reglas

- Nunca contra `production`: la configuración se detiene si detecta su endpoint.
- Sin login falso ni bypass: `globalSetup` inserta una fila en `Session` de la base de **prueba** y el navegador usa su cookie (ADR-0001).
- Importar siempre `test` y `expect` desde `./fixtures`: la prueba falla si la página registra `console.error` (R2).
- Usar `data-testid` estables. Existentes: `login-google`, `login-github`, `login-error`, `logout-button`.
- No modificar pantallas ni APIs para que un E2E pase: si falla por un error de la app, avisar al dueño.

## Preparación local (una sola vez)

1. En Neon, crear una rama **propia** desde `production` (p. ej. `dev-e2e`). No usar `production` ni `dev`.
2. Crear `.env.e2e.local` en la raíz (Git lo ignora) con las conexiones de esa rama:
   ```
   DATABASE_URL="<cadena con pooling de dev-e2e>"
   DIRECT_URL="<cadena directa de dev-e2e>"
   ```
3. Instalar el navegador de Playwright:
   ```powershell
   corepack.cmd pnpm exec playwright install chromium
   ```

## Ejecutar

```powershell
corepack.cmd pnpm test:e2e
```

Playwright levanta su propio servidor en `http://localhost:3200` conectado a la base de prueba, ejecuta `POST /api/test/reset-data` (40 productos / 1,200 pedidos) y crea una sesión de prueba. Cada ejecución empieza desde los mismos datos.

## Escribir un flujo con sesión

Las pruebas ya tienen sesión por defecto (`storageState`). Para una prueba sin sesión:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

Para comprobar el estado real del Kanban tras un movimiento (flujo 3):

```ts
const response = await page.request.get("/api/test/kanban-status?number=OM-5");
expect((await response.json()).order.status).toBe("SHIPPED");
```

## CI

El job `e2e` de `.github/workflows/ci.yml` usa un PostgreSQL de servicio (sin secretos), aplica las migraciones y ejecuta los E2E. El reporte HTML queda como artefacto `playwright-report`.
