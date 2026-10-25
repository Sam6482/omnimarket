import { handlers } from "@/server/auth";

export const runtime = "nodejs";

/** Endpoints de Auth.js: /api/auth/signin, /callback/:provider, /signout, /session, etc. */
export const { GET, POST } = handlers;
