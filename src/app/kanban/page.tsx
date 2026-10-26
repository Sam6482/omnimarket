
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { formatOrderNumber } from "@/lib/order-number";
import { requirePageSession } from "@/server/auth";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  // Protege la página y redirige al login si no hay sesión.
  await requirePageSession("/kanban");

  // Cargamos hasta 50 pedidos de cada estado.
  const statuses = [
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ] as const;

  const [pages, totalOrders, statusCounts] = await Promise.all([
  Promise.all(
    statuses.map((status) =>
      prisma.order.findMany({
        where: { status },
        select: {
          id: true,
          number: true,
          customerName: true,
          status: true,
          position: true,
          totalCents: true,
          itemsCount: true,
          updatedAt: true,
        },
        orderBy: [{ position: "asc" }, { id: "asc" }],
        take: 50,
      })
    )
  ),
    prisma.order.count(),
  prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  }),
]);

const totals = {
  PENDING: 0,
  PROCESSING: 0,
  SHIPPED: 0,
  DELIVERED: 0,
  CANCELLED: 0,
};

for (const group of statusCounts) {
  totals[group.status] = group._count._all;
}

  const orders = pages.flat().map((order) => ({
    id: order.id,
    number: formatOrderNumber(order.number),
    customerName: order.customerName,
    status: order.status,
    position: order.position,
    totalCents: order.totalCents,
    itemsCount: order.itemsCount,
    updatedAt: order.updatedAt.toISOString(),
  }));

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] text-zinc-100">
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Operaciones / Pedidos
            </p>

            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Tablero Kanban
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
            Arrastra pedidos entre etapas o utiliza el selector de cada tarjeta.
            </p>

            <p className="mt-1 text-xs text-zinc-500">
            Se muestran los primeros 50 pedidos de cada columna.
            </p>
          </div>
          <span
  data-testid="kanban-total-counter"
  className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-400">
  <span className="font-semibold text-zinc-100">
    {orders.length}
  </span>
  {" de "}
  <span className="font-semibold text-zinc-100">
    {totalOrders}
  </span>
  {" pedidos"}
</span>
        </div>

        <KanbanBoard initialOrders={orders} columnTotals={totals} />
      </div>
    </main>
  );
}
