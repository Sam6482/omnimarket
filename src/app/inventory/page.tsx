
import { requirePageSession } from "@/server/auth";
import { prisma } from "@/server/db";
import { productQuerySchema } from "@/lib/schemas/product";
import { listProducts } from "@/server/services/products/list-products";
import { InventoryTable } from "@/components/inventory/inventory-table";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
};

export default async function InventoryPage({
  searchParams,
}: Props) {
  // OAuth: redirige a /login cuando no hay sesión.
  await requirePageSession("/inventory");

  const raw = await searchParams;

  const normalized = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ])
  );

  const parsed = productQuerySchema.safeParse(normalized);

  const query = parsed.success
    ? parsed.data
    : {
        page: 1,
        limit: 20,
        q: "",
        category: "",
      };

  const [result, categoryRows] = await Promise.all([
    listProducts(query),

    prisma.product.findMany({
      select: {
        category: true,
      },
      distinct: ["category"],
      orderBy: {
        category: "asc",
      },
    }),
  ]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] text-zinc-100">
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Catálogo
            </p>

            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Inventario
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Administra productos y consulta existencias.
            </p>
          </div>

          <span className="rounded-md border border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5 text-[11px] text-zinc-400">
            Datos de PostgreSQL
          </span>
        </div>

        <InventoryTable
          products={result.data}
          total={result.pagination.total}
          page={result.pagination.page}
          limit={result.pagination.limit}
          query={query.q ?? ""}
          category={query.category ?? ""}
          categories={categoryRows.map((row) => row.category)}
        />
      </div>
    </main>
  );
}
