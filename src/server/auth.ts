/**
 * Contrato de autenticación para rutas privadas (CLAUDE.md, regla 2).
 *
 * Uso en cada handler privado, como primera comprobación:
 *
 *   const user = await requireSession();
 *   if (!user) return unauthorizedResponse(); // @/server/http/errors
 *
 * TEMPORAL — hasta integrar Auth.js (Google + GitHub, sesiones en base de datos):
 * devuelve siempre `null`, así que toda ruta privada responde 401 (seguro por defecto).
 * La firma NO cambiará al conectar OAuth; solo cambia la implementación de este archivo.
 *
 * Prohibido: claves de prueba, variables de entorno o parámetros que omitan la autenticación.
 * En Vitest, simular con `vi.mock("@/server/auth")` dentro de cada archivo de prueba.
 */

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export async function requireSession(): Promise<SessionUser | null> {
  return null;
}
