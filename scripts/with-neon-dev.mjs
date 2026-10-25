// Protección para probar contra la rama de Neon "dev" sin riesgo para "production".
//
// Uso (PowerShell, desde la raíz del repo):
//   node scripts/with-neon-dev.mjs check   → verifica la conexión y muestra conteos (solo lectura)
//   node scripts/with-neon-dev.mjs dev     → arranca Next.js en http://localhost:3100 conectado a dev
//
// Reglas:
// - Solo lee .env.neon-dev (ignorado por Git). Nunca lee ni modifica .env.local.
// - Se detiene si el endpoint no es el de dev o si es el de production.
// - Nunca imprime contraseñas ni cadenas de conexión: solo el id del endpoint.
// - Usa el puerto 3100 para no confundirse con un `pnpm dev` normal (3000) conectado a production.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { config } from "dotenv";

const ENV_FILE = ".env.neon-dev";
const ALLOWED_ENDPOINTS = new Set(["ep-solitary-hat-b7ty46j4"]); // Neon branch: dev
const BLOCKED_ENDPOINTS = new Set(["ep-proud-violet-b7qazjj9"]); // Neon branch: production
const EXPECTED_DATABASE = "omnimarket_db";
const DEV_PORT = "3100";

function fail(message) {
  console.error(`\n✖ DETENIDO: ${message}\n  No se ejecutó nada contra la base de datos.\n`);
  process.exit(1);
}

function describe(name, value) {
  if (!value) fail(`${name} está vacío en ${ENV_FILE}.`);
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${name} no es una URL válida en ${ENV_FILE}.`);
  }
  const host = url.hostname;
  const endpoint = host.split(".")[0].replace(/-pooler$/, "");
  return {
    endpoint,
    pooled: host.split(".")[0].endsWith("-pooler"),
    neon: host.endsWith(".neon.tech"),
    database: url.pathname.replace(/^\//, ""),
  };
}

function loadDevEnvironment() {
  if (!existsSync(ENV_FILE)) fail(`no existe ${ENV_FILE}.`);
  const values = {};
  config({ path: ENV_FILE, processEnv: values, quiet: true });

  const pooled = describe("DATABASE_URL", values.DATABASE_URL);
  const direct = describe("DIRECT_URL", values.DIRECT_URL);

  for (const [name, info] of [["DATABASE_URL", pooled], ["DIRECT_URL", direct]]) {
    if (!info.neon) fail(`${name} no apunta a Neon.`);
    if (BLOCKED_ENDPOINTS.has(info.endpoint)) fail(`${name} apunta a PRODUCTION (${info.endpoint}).`);
    if (!ALLOWED_ENDPOINTS.has(info.endpoint)) fail(`${name} apunta a un endpoint desconocido (${info.endpoint}).`);
    if (info.database !== EXPECTED_DATABASE) fail(`${name} usa la base "${info.database}", se esperaba "${EXPECTED_DATABASE}".`);
  }
  if (!pooled.pooled) fail("DATABASE_URL debe ser la conexión con pooling (-pooler).");
  if (direct.pooled) fail("DIRECT_URL debe ser la conexión directa (sin -pooler).");

  console.log(`✔ Conexión verificada: Neon "dev" (${pooled.endpoint}), base ${EXPECTED_DATABASE}.`);
  console.log("✔ Production bloqueada: ninguna variable apunta a su endpoint.");
  return { DATABASE_URL: values.DATABASE_URL, DIRECT_URL: values.DIRECT_URL };
}

async function check(env) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  try {
    const [products, orders, orderItems, orderEvents, users] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.orderEvent.count(),
      prisma.user.count(),
    ]);
    // Huella del dataset: con el mismo seed debe ser idéntica tras cada reset.
    const totals = await prisma.order.aggregate({
      _sum: { totalCents: true },
      _min: { number: true },
      _max: { number: true },
    });
    const [sequence] = await prisma.$queryRaw`SELECT last_value FROM "Order_number_seq"`;
    console.log("\nConteos en dev (solo lectura):");
    console.table({ products, orders, orderItems, orderEvents, users });
    console.log("Huella de datos (solo lectura):");
    console.table({
      sumTotalCents: totals._sum.totalCents ?? 0,
      firstNumber: totals._min.number ?? 0,
      lastNumber: totals._max.number ?? 0,
      sequenceLastValue: Number(sequence?.last_value ?? 0),
    });
  } finally {
    await prisma.$disconnect();
  }
}

function startDevServer(env) {
  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next");
  console.log(`\nArrancando Next.js conectado a dev en http://localhost:${DEV_PORT} (Ctrl + C para detener)...\n`);
  // Las variables del proceso tienen prioridad: Next.js no las sobrescribe con .env.local.
  const child = spawn(process.execPath, [nextBin, "dev", "--port", DEV_PORT], {
    stdio: "inherit",
    // RESET_DATA_ENABLED habilita POST /api/test/reset-data solo en este servidor protegido.
    env: { ...process.env, ...env, OMNIMARKET_DB_TARGET: "neon-dev", RESET_DATA_ENABLED: "true" },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

const mode = process.argv[2];
if (mode !== "check" && mode !== "dev") {
  fail('modo inválido. Usa "check" o "dev".');
}

const env = loadDevEnvironment();
if (mode === "check") await check(env);
else startDevServer(env);
