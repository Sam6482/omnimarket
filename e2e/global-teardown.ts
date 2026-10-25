import { PrismaClient } from "@prisma/client";
import { loadE2EEnvironment } from "./support/env";
import { deleteTestSessions } from "./support/session";

/** Borra las sesiones de prueba al terminar (el usuario E2E se conserva). */
export default async function globalTeardown() {
  const prisma = new PrismaClient({ datasourceUrl: loadE2EEnvironment().DATABASE_URL });
  try {
    await deleteTestSessions(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
