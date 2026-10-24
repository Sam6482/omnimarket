# Arranque — viernes 23 de octubre (3 programadores)

Objetivo de la sesión (~2 h): **URL pública con HTTPS + CI en verde + base de datos migrada + OAuth configurado.** Nada de funcionalidades todavía.

## Roles definitivos

| | Rol | Dueño de |
|---|---|---|
| **A** | Plataforma y datos | Andamiaje, Prisma/Neon, seed y `reset-data`, servicios y API, `/api/test/*`, rendimiento |
| **B** | Producto y UI | Sistema visual, layout, dashboard, tabla de pedidos, CRUD (UI), Bulk (UI), Kanban, skeletons, toasts |
| **C** | Auth, calidad y DevOps | OAuth (Google/GitHub), middleware, Vercel, GitHub Actions, Playwright + 3 E2E, guardia de consola |

## Línea de tiempo

### 0:00–0:15 · Los tres juntos
1. Leer `docs/adr/0001-stack-y-decisiones-base.md` y aprobarlo (o anotar cambios).
2. Un integrante crea el repo `omnimarket` en GitHub (público o privado) y agrega a los otros dos como colaboradores.
3. Decidir el nombre del proyecto en Vercel (define el dominio `https://<nombre>.vercel.app`, necesario para los callbacks de OAuth).

### 0:15–1:40 · En paralelo

**A — Andamiaje (crítico: hacer push antes de 0:55, desbloquea a B y C)**
1. Crear la app con Claude Code (prompt A abajo).
2. Crear la base en Neon (región igual a la de Vercel; por defecto Vercel usa `iad1` → Neon `us-east-1`). Copiar las URLs pooled y directa a `.env.local`.
3. Esquema Prisma completo + primera migración.
4. Push a `main` (primer commit directo permitido; después, todo por PR).

**B — Identidad visual y documentación (0:15–0:55), luego UI base**
1. Subir a `main` (después del push de A, vía PR) los archivos de este kit: `CLAUDE.md`, `docs/*`, `.github/pull_request_template.md`.
2. Definir identidad: color de acento, tipografía, escala de grises, colores por estado de pedido. Anotarlo en `docs/DESIGN.md`.
3. Tras el push de A: rama `feat/ui-foundation` → shadcn/ui, tokens CSS (claro/oscuro), shell del layout vacío (prompt B).

**C — OAuth + Vercel + CI**
1. **Google Cloud Console:** proyecto → pantalla de consentimiento (Externa, scopes `openid email profile`) → **Publicar (In production)**. Si queda en "Testing", el evaluador no podrá entrar. Crear cliente OAuth "Aplicación web" con URIs de redirección:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<nombre>.vercel.app/api/auth/callback/google`
2. **GitHub → Settings → Developer settings → OAuth Apps:** crear **dos** apps:
   - `OmniMarket (dev)` → callback `http://localhost:3000/api/auth/callback/github`
   - `OmniMarket` → callback `https://<nombre>.vercel.app/api/auth/callback/github`
3. Guardar secretos en un gestor de contraseñas compartido. **Nunca** en el repo, chat o capturas.
4. Tras el push de A: importar el repo en Vercel, cargar variables de entorno, primer deploy, verificar HTTPS.
5. Rama `chore/ci`: `ci.yml` con lint + typecheck + test + build (prompt C).
6. Proteger `main` en GitHub: requiere PR, 1 aprobación y el check de CI.

### 1:40–2:00 · Los tres juntos — checkpoint
- [ ] `https://<nombre>.vercel.app` abre con candado válido
- [ ] CI en verde en `main`
- [ ] Migración aplicada en Neon
- [ ] Variables OAuth cargadas en Vercel (prod) y en el `.env.local` de cada quien
- [ ] `main` protegida
- [ ] PR de documentación mergeado
- [ ] Horarios reales del sábado acordados

## Variables de entorno (`.env.example`, sin valores)

```
DATABASE_URL=        # Neon pooled (para la app)
DIRECT_URL=          # Neon directa (para migraciones)
AUTH_SECRET=         # generar con: npx auth secret
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

---

## Prompts para Claude Code

Abran Claude Code **en la carpeta del repo** para que lea `CLAUDE.md`. Pídanle siempre que muestre el plan antes de editar.

### Prompt A — Andamiaje (en una carpeta vacía)

```
Lee CLAUDE.md y docs/API.md. Objetivo: andamiaje inicial de OmniMarket, sin funcionalidades.
1. Crea una app Next.js (versión estable actual) con App Router, TypeScript strict, Tailwind, ESLint, carpeta src/ y alias @/*, usando pnpm.
2. Agrega Prettier, scripts en package.json: dev, build, lint, typecheck (tsc --noEmit), test (vitest run), test:e2e, db:migrate, db:reset.
3. Configura Vitest con una prueba trivial que pase en tests/unit/.
4. Instala Prisma y crea prisma/schema.prisma con: modelos de Auth.js (User, Account, Session, VerificationToken) y de dominio Product, Order, OrderItem, OrderEvent según CLAUDE.md (dinero en Int con sufijo Cents, enum OrderStatus, Order.number único, Order.position Float, índices en (status, position) y createdAt). Usa DATABASE_URL y DIRECT_URL.
5. Crea src/server/db.ts con el singleton de Prisma y .env.example con las variables documentadas (sin valores).
6. Crea la estructura de carpetas de CLAUDE.md con .gitkeep donde falte.
Muéstrame el plan antes de editar. Al final ejecuta pnpm lint, pnpm typecheck, pnpm test y pnpm build y repórtame la salida real.
```

Después: `pnpm db:migrate --name init` con el `.env.local` apuntando a Neon.

### Prompt B — UI base (rama feat/ui-foundation)

```
Lee CLAUDE.md y docs/DESIGN.md. Objetivo: fundación visual, sin datos.
1. Inicializa shadcn/ui y agrega: button, card, skeleton, badge, dropdown-menu, sheet, table, checkbox, dialog, sonner.
2. Define tokens de color en variables CSS en :root y su versión oscura, según docs/DESIGN.md, incluidos colores por estado de pedido.
3. Crea src/app/(dashboard)/layout.tsx con sidebar (Dashboard, Pedidos, Kanban, Productos) y topbar, responsivo y navegable con teclado.
4. Crea páginas vacías para cada sección con su loading.tsx usando Skeleton.
5. Monta <Toaster /> de Sonner en el layout raíz.
Sin datos simulados. Muestra el plan antes de editar y al final ejecuta lint, typecheck y build.
```

### Prompt C — CI (rama chore/ci)

```
Lee CLAUDE.md. Objetivo: .github/workflows/ci.yml.
Jobs en pull_request y push a main: instalar con pnpm (con caché), lint, typecheck, test y build.
Deja preparado (comentado) un job e2e con servicio Postgres y un job deploy con Vercel CLI que dependa (needs) de todos los anteriores y corra solo en push a main.
Usa variables de entorno ficticias solo para el build en CI cuando sean necesarias, nunca secretos reales en el archivo.
Muestra el plan antes de editar.
```
