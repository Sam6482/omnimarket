# Integrar Fase A sin afectar trabajo de B y C

Este paquete es un **andamiaje inicial**, no una aplicación final ni un despliegue.

## Orden recomendado

1. Un integrante hace **PR `chore/docs-root`** para trasladar `omnimarket-kit/CLAUDE.md`, `omnimarket-kit/docs/` y la plantilla `.github/pull_request_template.md` a la raíz del repo. Hacer merge tras revisión.
2. El Programador A actualiza `main` (`git switch main && git pull --ff-only`) y crea `feat/bootstrap`.
3. En esa rama coloca **solo** los archivos nuevos de este ZIP. El ZIP también incluye los documentos originales para referencia: **no sobrescribas cambios hechos por tus compañeros**. El repo resultante debe tener `package.json` y `CLAUDE.md` directamente en la raíz.
4. Verifica que Node >= 20.9 y que pnpm funcione. Ejecuta `pnpm install` en tu Windows (genera `pnpm-lock.yaml`; súbelo al PR).
5. Ejecuta `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:generate`.
6. Abre PR de `feat/bootstrap` hacia `main` después de mostrar logs de las comprobaciones. B y C actualizan `main` **después** del merge.

## Variables secretas y migración

- Copia `.env.example` como `.env.local` y coloca las URL pooled / directa de **una BD de desarrollo**, nunca dentro del repositorio.
- Solo A ejecuta `pnpm db:migrate --name init` una vez validadas las URL y el esquema.
- `db:reset` es expresamente una tarea pendiente: el comando sale con error sin tocar la BD.
- `pnpm test:e2e` todavía no tiene flujos. C es responsable de agregarlos.
- El esquema Auth.js preparado debe revisarse con C antes de integrar Auth.js v5.

## Opciones de diseño pactadas en este scaffold

- `Order.number` es `Int @default(autoincrement())` con representación externa `OM-<number>`.
- Sólo `.env.local` guarda credenciales locales; `prisma.config.ts` lo carga para la CLI.
- Next.js `16.3.5`, Prisma `6.19.3` (se evita el cambio de adapter obligatorio de Prisma 7 para esta primera fase); los comandos de instalación generan el lockfile.
- Se prefiere estabilidad con pocas herramientas a perseguir versiones mayoritarias nuevas durante el fin de semana.

## Criterio de verificación

Una carpeta generada no prueba que el proyecto compile. **Este paquete se creó en un entorno sin acceso al registro npm**, así que instalación, lint, typecheck, Vitest y build no se han ejecutado aquí. A debe ejecutar y corregirlos localmente.
