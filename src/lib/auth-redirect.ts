/**
 * Utilidades puras del flujo de login (sin dependencias de servidor; probadas en Vitest).
 */

export const OAUTH_PROVIDERS = [
  { id: "google", label: "Continuar con Google" },
  { id: "github", label: "Continuar con GitHub" },
] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"];

export function isOAuthProvider(value: unknown): value is OAuthProviderId {
  return OAUTH_PROVIDERS.some((provider) => provider.id === value);
}

/**
 * Solo permite volver a rutas internas ("/algo"). Bloquea redirecciones abiertas
 * ("https://otro.sitio", "//otro.sitio", "/\\otro.sitio") y valores vacíos.
 */
export function safeCallbackUrl(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(trimmed)) return fallback;
  return trimmed;
}

/** Mensaje legible para los códigos de error que Auth.js envía a /login?error=... */
export function loginErrorMessage(code: unknown): string | null {
  if (typeof code !== "string" || code === "") return null;
  switch (code) {
    case "OAuthAccountNotLinked":
      return "Ese correo ya inició sesión con otro proveedor. Usa el mismo proveedor que la primera vez.";
    case "AccessDenied":
      return "Acceso denegado. Autoriza la aplicación para continuar.";
    case "Configuration":
      return "El inicio de sesión no está configurado correctamente. Avisa al equipo.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}
