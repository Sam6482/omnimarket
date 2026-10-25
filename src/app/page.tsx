
import Link from "next/link";
import { prisma } from "@/server/db";
import { formatCurrency, formatPercent } from "@/lib/format";
import { requirePageSession } from "@/server/auth";

export const dynamic = "force-dynamic";

const STATUSES = [
  {
    key: "PENDING",
    label: "Pendientes",
    color: "bg-amber-500",
  },
  {
    key: "PROCESSING",
    label: "En proceso",
    color: "bg-blue-500",
  },
  {
    key: "SHIPPED",
    label: "Enviados",
    color: "bg-indigo-500",
  },
  {
    key: "DELIVERED",
    label: "Entregados",
    color: "bg-emerald-500",
  },
  {
    key: "CANCELLED",
    label: "Cancelados",
    color: "bg-rose-500",
  },
] as const;

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
        {title}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  context,
  symbol,
}: {
  label: string;
  value: string;
  context: React.ReactNode;
  symbol: string;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-zinc-800/80 bg-[#121215] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-zinc-400">{label}</h2>
        <span
          aria-hidden="true"
          className="font-mono text-sm text-zinc-600"
        >
          {symbol}
        </span>
      </div>

      <p className="mt-2 break-words font-mono text-2xl font-semibold tracking-tight text-zinc-100 tabular-nums">
        {value}
      </p>

      <div className="mt-2 flex min-h-5 items-center gap-1.5 text-[11px] text-zinc-500">
        {context}
      </div>
    </article>
  );
}

export default async function HomePage() {
  await requirePageSession("/");
  // Se conservan las consultas a PostgreSQL existentes.
  const [groups, productCount, productStock] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: {
        totalCents: true,
        costCents: true,
      },
    }),
    prisma.product.count(),
    prisma.product.aggregate({
      _sum: { stock: true },
    }),
  ]);

  const byStatus = Object.fromEntries(
    STATUSES.map(({ key }) => [key, 0])
  ) as Record<(typeof STATUSES)[number]["key"], number>;

  let orders = 0;
  let revenueCents = 0;
  let costCents = 0;

  for (const group of groups) {
    const count = group._count._all;

    byStatus[group.status] = count;
    orders += count;
    revenueCents += group._sum.totalCents ?? 0;
    costCents += group._sum.costCents ?? 0;
  }

  const marginCents = revenueCents - costCents;
  const marginPct =
    revenueCents > 0
      ? (marginCents / revenueCents) * 100
      : 0;

  const averageTicketCents =
    orders > 0 ? Math.round(revenueCents / orders) : 0;

  const activeOrders =
    byStatus.PENDING +
    byStatus.PROCESSING +
    byStatus.SHIPPED;

  const totalStock = productStock._sum.stock ?? 0;

  const averageStock =
    productCount > 0 ? totalStock / productCount : 0;

  const cards = [
    {
      label: "Ingresos",
      value: formatCurrency(revenueCents),
      symbol: "$",
      context: (
        <span>
          AOV:{" "}
          <span className="font-mono text-zinc-400 tabular-nums">
            {formatCurrency(averageTicketCents)}
          </span>
        </span>
      ),
    },
    {
      label: "Pedidos",
      value: orders.toLocaleString("es-MX"),
      symbol: "#",
      context: (
        <span>
          <span className="font-mono text-zinc-400 tabular-nums">
            {activeOrders}
          </span>{" "}
          activos en flujo Kanban
        </span>
      ),
    },
    {
      label: "Margen bruto",
      value: formatPercent(marginPct),
      symbol: "%",
      context: (
        <span className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
          {formatCurrency(marginCents)} de margen
        </span>
      ),
    },
    {
      label: "Productos",
      value: productCount.toLocaleString("es-MX"),
      symbol: "◫",
      context: <span>SKU registrados en el catálogo</span>,
    },
  ];

  return (
    <main className="min-h-screen bg-[#09090B] text-zinc-100">
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Overview
              </span>
            </div>

            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              Dashboard
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Visión general de operaciones y rendimiento comercial
            </p>
          </div>

          <span className="rounded-md border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1.5 text-[11px] text-zinc-400">
            Datos actuales · PostgreSQL
          </span>
        </div>

        {/* Indicadores principales */}
        <section
          aria-label="Indicadores principales"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {cards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </section>

        {/* Paneles operativos */}
        <section className="mt-4 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
          {/* Estado de pedidos */}
          <article className="rounded-lg border border-zinc-800/80 bg-[#121215] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <SectionHeading
                title="Estado de los pedidos"
                description="Distribución por etapa operativa"
              />

              <span className="rounded-md border border-zinc-800/80 bg-zinc-950/60 px-2 py-1 font-mono text-[11px] text-zinc-400 tabular-nums">
                {orders} total
              </span>
            </div>

            <div
              role="img"
              aria-label={`Distribución de ${orders} pedidos entre cinco estados`}
              className="mt-7 flex h-2.5 w-full overflow-hidden rounded-md bg-zinc-800"
            >
              {STATUSES.map((status) => {
                const count = byStatus[status.key];
                const width = orders
                  ? (count / orders) * 100
                  : 0;

                return (
                  <div
                    key={status.key}
                    className={`${status.color} transition-[width] duration-300`}
                    style={{ width: `${width}%` }}
                    title={`${status.label}: ${count} pedidos`}
                  />
                );
              })}
            </div>

            <div className="mt-5 divide-y divide-zinc-800/60">
              {STATUSES.map((status) => {
                const count = byStatus[status.key];
                const percent = orders
                  ? (count / orders) * 100
                  : 0;

                return (
                  <div
                    key={status.key}
                    className="grid grid-cols-[minmax(0,1fr)_70px_48px] items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${status.color}`}
                      />
                      <span className="truncate text-xs text-zinc-300">
                        {status.label}
                      </span>
                    </div>

                    <span className="text-right font-mono text-xs text-zinc-500 tabular-nums">
                      {percent.toFixed(1)}%
                    </span>

                    <span className="text-right font-mono text-xs font-medium text-zinc-200 tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-zinc-800/60 pt-4">
              <Link
                href="/kanban"
                className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
              >
                Abrir tablero Kanban
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>

          {/* Inventario */}
          <article className="flex flex-col rounded-lg border border-zinc-800/80 bg-[#121215] p-4 sm:p-5">
            <SectionHeading
              title="Inventario"
              description="Disponibilidad actual del catálogo"
            />

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-md border border-zinc-800/80 bg-zinc-950/60 p-3">
                <p className="text-[11px] text-zinc-500">
                  Productos registrados (SKU)
                </p>
                <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                  {productCount.toLocaleString("es-MX")}
                </p>
              </div>

              <div className="rounded-md border border-zinc-800/80 bg-zinc-950/60 p-3">
                <p className="text-[11px] text-zinc-500">
                  Unidades en existencia
                </p>
                <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                  {totalStock.toLocaleString("es-MX")}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-b border-zinc-800/60 pb-4">
              <span className="text-xs text-zinc-500">
                Existencia promedio
              </span>

              <span className="font-mono text-xs font-medium text-zinc-300 tabular-nums">
                {averageStock.toFixed(1)} u/SKU
              </span>
            </div>

            <div className="mt-auto pt-5">
              <Link
                href="/inventory"
                className="flex w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
              >
                Ver inventario
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-4 text-[11px] text-zinc-600">
          <span>OmniMarket · Operations Hub</span>
          <span>Importes almacenados en centavos · MXN</span>
        </footer>
      </div>
    </main>
  );
}
