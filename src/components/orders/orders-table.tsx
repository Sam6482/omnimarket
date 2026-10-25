
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { OrderForm } from "@/components/orders/order-form";
import { OrderActions } from "@/components/orders/order-actions";

type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type OrderRow = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  totalCents: number;
  itemsCount: number;
  createdAt: string;
};

type Props = {
  orders: OrderRow[];
  total: number;
  page: number;
  limit: number;
  query: string;
  status: string;
};

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-amber-500/10 text-amber-400",
  },
  PROCESSING: {
    label: "En proceso",
    className: "bg-blue-500/10 text-blue-400",
  },
  SHIPPED: {
    label: "Enviado",
    className: "bg-indigo-500/10 text-indigo-400",
  },
  DELIVERED: {
    label: "Entregado",
    className: "bg-emerald-500/10 text-emerald-400",
  },
  CANCELLED: {
    label: "Cancelado",
    className: "bg-rose-500/10 text-rose-400",
  },
};

export function OrdersTable({
  orders,
  total,
  page,
  limit,
  query,
  status,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function navigate(
    nextPage: number,
    nextQuery = search,
    nextStatus = status
  ) {
    const params = new URLSearchParams();

    params.set("page", String(nextPage));
    params.set("limit", String(limit));

    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus) params.set("status", nextStatus);

    router.push(`/orders?${params.toString()}`);
  }

  return (

      <>
    <div className="mb-3 flex justify-end">
      <button
        type="button"
        data-testid="orders-create-button"
        onClick={() => setShowCreateForm(true)}
        className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
      >
        + Nuevo pedido
      </button>
    </div>

    {showCreateForm && (
      <section className="mb-4 rounded-lg border border-zinc-800/80 bg-[#121215] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Crear nuevo pedido
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Selecciona el cliente y los productos.
            </p>
          </div>

          <button
            type="button"
            aria-label="Cerrar formulario"
            onClick={() => setShowCreateForm(false)}
            className="rounded-md px-2 py-1 text-lg text-zinc-500 hover:bg-zinc-800"
          >
            ×
          </button>
        </div>

        <OrderForm onClose={() => setShowCreateForm(false)} />
      </section>
    )}

    <section className="overflow-hidden rounded-lg border border-zinc-800/80 bg-[#121215]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 p-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Registro de pedidos
          </h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            {total} resultados
          </p>
        </div>

        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(1);
          }}
        >
          <input
            aria-label="Buscar pedidos"
            data-testid="orders-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cliente, email o número..."
            className="w-56 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
          />

          <select
            aria-label="Filtrar estado"
            data-testid="orders-status-filter"
            value={status}
            onChange={(event) =>
              navigate(1, search, event.target.value)
            }
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500"
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-zinc-800/80 bg-zinc-950/50">
            <tr className="text-[11px] text-zinc-500">
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">
                Artículos
              </th>
              <th className="px-4 py-3 text-right font-medium">
                Total
              </th>
              <th className="px-4 py-3 text-right font-medium">
                Fecha
              </th>
              <th className="px-4 py-3 text-right font-medium">
               Acciones
             </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/60">
            {orders.map((order) => {
              const badge = statusConfig[order.status];

              return (
                <tr
                  key={order.id}
                  data-testid={`order-row-${order.id}`}
                  className="transition-colors hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-200">
                    {order.number}
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-zinc-200">
                      {order.customerName}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {order.customerEmail}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400 tabular-nums">
                    {order.itemsCount}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-xs font-medium text-zinc-200 tabular-nums">
                    {formatCurrency(order.totalCents)}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-[11px] text-zinc-500 tabular-nums">
                    {new Date(order.createdAt).toLocaleDateString(
                      "es-MX",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "America/Mexico_City",
                      }
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
               <OrderActions
               order={{
               id: order.id,
               number: order.number,
                 customerName: order.customerName,
                  customerEmail: order.customerEmail,
               }}
               />
</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="px-4 py-12 text-center text-xs text-zinc-500">
            No se encontraron pedidos.
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-3">
        <span className="text-[11px] text-zinc-500">
          Página {page} de {totalPages}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => navigate(page - 1)}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Anterior
          </button>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => navigate(page + 1)}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
     </>
  );
}
