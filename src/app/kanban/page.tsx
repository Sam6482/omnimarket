
import { prisma } from "@/server/db";
import { formatOrderNumber } from "@/lib/order-number";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { requirePageSession } from "@/server/auth";

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

  const pages = await Promise.all(
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
  );

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
              Arrastra pedidos entre etapas o utiliza el selector
              de cada tarjeta.
            </p>
          </div>

          <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-400">
            {orders.length} pedidos cargados
          </span>
        </div>

        <KanbanBoard initialOrders={orders} />
      </div>
    </main>
  );
}
