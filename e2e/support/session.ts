import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

/**
 * Sesiones de prueba para E2E (ADR-0001): se inserta una fila en `Session` de la base de
 * PRUEBA y el navegador recibe su cookie. No existe login falso ni bypass en la aplicación:
 * Auth.js valida la sesión exactamente igual que en producción.
 */

export const E2E_USER = { id: "e2e-user", email: "e2e@omnimarket.test", name: "Usuario E2E" } as const;

/** Nombre de la cookie de Auth.js v5 en HTTP (localhost). En HTTPS es `__Secure-authjs.session-token`. */
export const SESSION_COOKIE_NAME = "authjs.session-token";

export const STORAGE_STATE_PATH = "e2e/.auth/user.json";

export async function createTestSession(prisma: PrismaClient, hours = 4) {
  await prisma.user.upsert({ where: { id: E2E_USER.id }, update: {}, create: { ...E2E_USER } });
  const sessionToken = `e2e-${randomBytes(24).toString("hex")}`;
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: E2E_USER.id, expires } });
  return { sessionToken, expires };
}

export function sessionCookie(sessionToken: string, expires: Date, baseURL: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    domain: new URL(baseURL).hostname,
    path: "/",
    expires: Math.floor(expires.getTime() / 1000),
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };
}

export async function deleteTestSessions(prisma: PrismaClient) {
  await prisma.session.deleteMany({ where: { userId: E2E_USER.id } });
}
