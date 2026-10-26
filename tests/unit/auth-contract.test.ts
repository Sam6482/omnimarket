import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  nextAuthConfig: undefined as unknown,
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

// Auth.js simulado: se captura la configuración y se controla lo que devuelve auth().
vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    mocks.nextAuthConfig = config;
    return { auth: mocks.auth, handlers: { GET: vi.fn(), POST: vi.fn() }, signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/google", () => ({ default: (options: object) => ({ id: "google", options }) }));
vi.mock("next-auth/providers/github", () => ({ default: (options: object) => ({ id: "github", options }) }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({ name: "prisma-adapter" }) }));
vi.mock("@/server/db", () => ({ prisma: {} }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { requirePageSession, requireSession } from "@/server/auth";
import { API_ERROR_STATUS, unauthorizedResponse } from "@/server/http/errors";

type AuthConfig = {
  providers: Array<{ id: string; options: { allowDangerousEmailAccountLinking?: boolean } }>;
  session: { strategy: string };
  pages: { signIn: string };
  callbacks: {
    session: (args: { session: { user: Record<string, unknown>; expires: string }; user: { id: string } }) => {
      user: Record<string, unknown>;
    };
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("configuración de Auth.js", () => {
  it("usa solo Google y GitHub, sesiones en base de datos y /login", () => {
    const config = mocks.nextAuthConfig as AuthConfig;
    expect(config.providers.map((provider) => provider.id)).toEqual(["google", "github"]);
    // Ambos verifican el correo: la misma persona puede entrar con cualquiera de los dos.
    expect(config.providers.every((provider) => provider.options.allowDangerousEmailAccountLinking)).toBe(true);
    expect(config.session.strategy).toBe("database");
    expect(config.pages.signIn).toBe("/login");
  });

  it("incluye el id del usuario en la sesión", () => {
    const config = mocks.nextAuthConfig as AuthConfig;
    const result = config.callbacks.session({
      session: { user: { name: "Ana", email: "ana@example.com" }, expires: "2026-11-01T00:00:00.000Z" },
      user: { id: "user-1" },
    });
    expect(result.user).toMatchObject({ id: "user-1", email: "ana@example.com" });
  });
});

describe("requireSession", () => {
  it("devuelve null sin sesión", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireSession()).resolves.toBeNull();
  });

  it("devuelve el usuario con id, email y nombre", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", email: "ana@example.com", name: "Ana" }, expires: "x" });
    await expect(requireSession()).resolves.toEqual({ id: "user-1", email: "ana@example.com", name: "Ana" });
  });

  it("devuelve null si la sesión no trae id", async () => {
    mocks.auth.mockResolvedValue({ user: { email: "ana@example.com" }, expires: "x" });
    await expect(requireSession()).resolves.toBeNull();
  });

  it("es seguro por defecto: si Auth.js falla devuelve null (la ruta responde 401)", async () => {
    mocks.auth.mockRejectedValue(new Error("MissingSecret"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(requireSession()).resolves.toBeNull();
  });
});

describe("requirePageSession", () => {
  it("redirige a /login conservando la ruta de regreso", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requirePageSession("/kanban")).rejects.toThrow("REDIRECT:/login?callbackUrl=%2Fkanban");
  });

  it("devuelve el usuario si hay sesión", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", email: null, name: null }, expires: "x" });
    await expect(requirePageSession()).resolves.toEqual({ id: "user-1", email: null, name: null });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("helpers de error", () => {
  it("unauthorizedResponse responde 401 UNAUTHENTICATED sin caché", async () => {
    const response = unauthorizedResponse();
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("asigna el código HTTP del contrato a cada error", () => {
    expect(API_ERROR_STATUS).toEqual({
      VALIDATION_ERROR: 400,
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      INTERNAL_ERROR: 500,
    });
  });
});
