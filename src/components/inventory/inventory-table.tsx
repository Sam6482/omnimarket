
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { ProductForm } from "@/components/inventory/product-form";
import { ProductActions } from "@/components/inventory/product-actions";

export type InventoryProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  costCents: number;
  stock: number;
};

type Props = {
  products: InventoryProduct[];
  total: number;
  page: number;
  limit: number;
  query: string;
  category: string;
  categories: string[];
};

export function InventoryTable({
  products,
  total,
  page,
  limit,
  query,
  category,
  categories,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState(query);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function navigate(
    nextPage: number,
    nextQuery = search,
    nextCategory = category
  ) {
    const params = new URLSearchParams();

    params.set("page", String(nextPage));
    params.set("limit", String(limit));

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    router.push(`/inventory?${params.toString()}`);
  }

  return (
    <>
      {/* Botón para abrir el formulario */}
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          data-testid="inventory-create-product"
          onClick={() => setShowCreateForm(true)}
          className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Formulario de creación */}
      {showCreateForm && (
        <section
          aria-label="Crear producto"
          className="mb-4 rounded-lg border border-zinc-800/80 bg-[#121215] p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Crear nuevo producto
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Agrega un artículo al catálogo de OmniMarket.
              </p>
            </div>

            <button
              type="button"
              aria-label="Cerrar formulario"
              onClick={() => setShowCreateForm(false)}
              className="rounded-md px-2 py-1 text-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            >
              ×
            </button>
          </div>

          <ProductForm
            onClose={() => {
              setShowCreateForm(false);
              router.refresh();
            }}
          />
        </section>
      )}

      {/* Catálogo */}
      <section className="overflow-hidden rounded-lg border border-zinc-800/80 bg-[#121215]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 p-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Catálogo de productos
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              {total} productos encontrados
            </p>
          </div>

          {/* Búsqueda y filtros */}
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(1);
            }}
          >
            <input
              aria-label="Buscar productos"
              data-testid="inventory-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nombre o SKU..."
              className="w-48 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500 sm:w-60"
            />

            <select
              aria-label="Filtrar categoría"
              data-testid="inventory-category"
              value={category}
              onChange={(event) =>
                navigate(1, search, event.target.value)
              }
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500"
            >
              <option value="">Todas las categorías</option>

              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* Tabla de productos */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left">
            <thead className="border-b border-zinc-800/80 bg-zinc-950/50">
              <tr className="text-[11px] text-zinc-500">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">
                  Producto
                </th>
                <th className="px-4 py-3 font-medium">
                  Categoría
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Precio
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Costo
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Stock
                </th>
                <th className="px-4 py-3 text-right font-medium">
               Acciones
               </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60">
              {products.map((product) => (
                <tr
                  key={product.id}
                  data-testid={`inventory-row-${product.id}`}
                  className="transition-colors hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {product.sku}
                  </td>

                  <td className="px-4 py-3 text-xs font-medium text-zinc-100">
                    {product.name}
                  </td>

                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {product.category}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-200 tabular-nums">
                    {formatCurrency(product.priceCents)}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400 tabular-nums">
                    {formatCurrency(product.costCents)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span
                      className={[
                        "inline-flex rounded-md px-2 py-1 font-mono text-[11px] tabular-nums",
                        product.stock === 0
                          ? "bg-rose-500/10 text-rose-400"
                          : product.stock <= 5
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-zinc-800 text-zinc-300",
                      ].join(" ")}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                   <ProductActions product={product} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-zinc-300">
                No encontramos productos
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Prueba otra búsqueda o categoría.
              </p>
            </div>
          )}
        </div>

        {/* Paginación */}
        <footer className="flex items-center justify-between gap-4 border-t border-zinc-800/80 px-4 py-3">
          <p className="text-[11px] text-zinc-500">
            Página {page} de {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => navigate(page - 1)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => navigate(page + 1)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
