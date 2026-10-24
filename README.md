# OmniMarket — Operations Hub

Proyecto académico de analítica e-commerce. Desarrollo colaborativo de tres programadores.

- [Cómo importar el andamiaje sin conflictos](docs/IMPORTAR-FASE-A.md)
- [Lineamientos y estado de cumplimiento](docs/REQUIREMENTS.md)
- [Contratos de API](docs/API.md)
- [Arquitectura](docs/adr/0001-stack-y-decisiones-base.md)
- [Reglas para Claude Code](CLAUDE.md)

## Arranque (después de integrar la rama)

Requisitos: Node.js >=20.9, pnpm 10, Git, credenciales de una BD de desarrollo Neon.

```powershell
pnpm install
pnpm dev
```

La app abre en `http://localhost:3000`. Verificación local:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Base de datos (solo Programador A)

Copiar `.env.example` a `.env.local` y completar la conexión pooled (`DATABASE_URL`) y directa (`DIRECT_URL`).

```powershell
pnpm db:generate
pnpm db:migrate --name init
```

No ejecutar `db:reset` aún: pendiente de implementar de forma determinista. No hay OAuth ni UI funcional en la Fase A.
