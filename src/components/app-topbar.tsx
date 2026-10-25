
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type AppTopbarProps = {
  sessionUser?: {
    name: string | null;
    email: string | null;
  } | null;
};

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Inventario", href: "/inventory" },
  { label: "Pedidos", href: "/orders" },
  { label: "Kanban", href: "/kanban" },
];

export function AppTopbar({ sessionUser }: AppTopbarProps) {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-zinc-800/80 bg-[#09090B]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-950">
            OM
          </div>

          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            OmniMarket
          </span>

          <span className="hidden text-zinc-700 sm:inline">/</span>

          <span className="hidden text-xs text-zinc-400 sm:inline">
            Operations Hub
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="ml-auto flex shrink-0 items-center gap-0.5 rounded-lg border border-zinc-800/80 bg-zinc-900 p-1 md:ml-8"
        >
          {navigation.map(({ label, href }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
                  active
                    ? "bg-zinc-800 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-4 lg:flex">
          <div
            className="flex items-center gap-2"
            title="Meta de rendimiento. No es una medición en vivo."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span className="font-mono text-[11px] text-zinc-500">
              SLA objetivo &lt;300ms
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-3">
  <div className="flex items-center gap-2">
    <span
      className={[
        "h-1.5 w-1.5 rounded-full",
        sessionUser ? "bg-emerald-500" : "bg-zinc-600",
      ].join(" ")}
    />

    <span className="max-w-[155px] truncate text-[11px] text-zinc-400">
      {sessionUser
        ? sessionUser.name ?? sessionUser.email ?? "Sesión activa"
        : "Sin sesión"}
    </span>
  </div>

  {sessionUser && (
    <button
      type="button"
      data-testid="logout-button"
      onClick={() => {
        void signOut({ redirectTo: "/login" });
      }}
      className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
    >
      Cerrar sesión
    </button>
  )}
</div>
        </div>
      </div>
    </header>
  );
}
