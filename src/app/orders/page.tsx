
import Link from "next/link";
import { requireSession } from "@/server/auth";
import { orderQuerySchema } from "@/lib/schemas/order";
import { listOrders } from "@/server/services/orders/list-orders";
import { OrdersTable } from "@/components/orders/orders-table";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
};

export default async function OrdersPage({ searchParams }: Props) {
  const user = await requireSession();

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] px-4 py-10 sm:px-6">
        <section className="mx-auto max-w-lg rounded-lg border border-zinc-800/80 bg-[#121215] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Acceso restringido
          </p>

          <h1 className="mt-3 text-xl font-semibold text-zinc-100">
            Pedidos
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Inicia sesión para consultar y administrar pedidos.
          </p>

          <Link
            href="/"
            className="mt-5 inline-flex rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-700"
          >
            Volver al dashboard
          </Link>
        </section>
      </main>
    );
  }

  const raw = await searchParams;

  const normalized = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ])
  );

  const parsed = orderQuerySchema.safeParse(normalized);

  const query = parsed.success
    ? parsed.data
    : orderQuerySchema.parse({});

  const result = await listOrders(query);

  const orders = result.data.map((order) => ({
    id: order.id,
    number: order.number,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    status: order.status,
    totalCents: order.totalCents,
    itemsCount: order.itemsCount,
    createdAt: order.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] text-zinc-100">
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6">
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Operaciones / Comercial
          </p>

          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Pedidos
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Consulta, filtra y administra pedidos de OmniMarket.
          </p>
        </div>

        <OrdersTable
          orders={orders}
          total={result.pagination.total}
          page={result.pagination.page}
          limit={result.pagination.limit}
          query={query.q ?? ""}
          status={query.status ?? ""}
        />
      </div>
    </main>
  );
}
