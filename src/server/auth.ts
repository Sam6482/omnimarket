import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";

/**
 * Autenticación OAuth 2.0 (R9): Google + GitHub con Auth.js v5, sesiones en base de datos
 * (ADR-0001). OAuth es el único método de login: no hay Credentials provider ni bypass.
 *
 * Variables de entorno (solo en Vercel / .env.local, nunca en el repo):
 *   AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
 *
 * Contrato para rutas privadas (no cambia):
 *   const user = await requireSession();
 *   if (!user) return unauthorizedResponse(); // @/server/http/errors
 *
 * Para páginas privadas: `const user = await requirePageSession();` (redirige a /login).
 * En Vitest: `vi.mock("@/server/auth")` en cada archivo de prueba.
 */

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Google y GitHub verifican los correos: se permite que la misma persona entre con cualquiera
  // de los dos y llegue a la MISMA cuenta (si no, el segundo proveedor muestra OAuthAccountNotLinked).
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    GitHub({ allowDangerousEmailAccountLinking: true }),
  ],
  session: { strategy: "database", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Con sesiones en base de datos, el callback por defecto omite el id del usuario.
    session({ session, user }) {
      return { ...session, user: { ...session.user, id: user.id } };
    },
  },
});

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
};

/**
 * Usuario autenticado o `null`. Seguro por defecto: si la configuración de Auth.js falla
 * (p. ej. falta AUTH_SECRET) o la base no responde, devuelve `null` → la ruta responde 401.
 */
export async function requireSession(): Promise<SessionUser | null> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? null, name: user.name ?? null };
  } catch (error) {
    console.error("[auth] No se pudo verificar la sesión:", error);
    return null;
  }
}

/** Para Server Components de páginas privadas: redirige a /login si no hay sesión. */
export async function requirePageSession(callbackUrl = "/"): Promise<SessionUser> {
  const user = await requireSession();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}
