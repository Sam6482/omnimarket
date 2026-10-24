// Prisma CLI 6.19: .env.local es la única fuente de secretos locales.
// Este archivo no contiene credenciales; las carga en memoria antes de ejecutar migraciones.
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
});
