
"use client";

import { OrderActions } from "@/components/orders/order-actions";
import { OrderForm } from "@/components/orders/order-form";
import { formatCurrency } from "@/lib/format";
import { BULK_MAX_IDS } from "@/lib/schemas/bulk";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("PROCESSING");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [bulkMessage, setBulkMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Solo se permite seleccionar pedidos visibles en la página actual.
  const visibleIds = orders.map((order) => order.id);
  const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedVisibleIds.includes(id));

  function toggleOrder(id: string) {
    setBulkMessage(null);
    setSelectedIds((current) => {
      const visibleSelected = current.filter((item) => visibleIds.includes(item));
      if (visibleSelected.includes(id)) {
        return visibleSelected.filter((item) => item !== id);
      }
      if (visibleSelected.length >= BULK_MAX_IDS) return visibleSelected;
      return [...visibleSelected, id];
    });
  }

  function toggleAllVisible() {
    setBulkMessage(null);
    setSelectedIds(allVisibleSelected ? [] : visibleIds.slice(0, BULK_MAX_IDS));
  }

  function openBulkConfirm() {
  if (selectedVisibleIds.length === 0 || isBulkUpdating) return;
  setShowBulkConfirm(true);
}
  async function handleBulkUpdate() {
    const ids = selectedVisibleIds.slice(0, BULK_MAX_IDS);
    if (ids.length === 0 || isBulkUpdating) return;
    setShowBulkConfirm(false);

    setIsBulkUpdating(true);
    setBulkMessage(null);

    try {
      const response = await fetch("/api/orders/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: bulkStatus }),
      });
      const payload: unknown = await response.json();
      const result =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : {};

      if (!response.ok) {
        const errorObject =
          result.error && typeof result.error === "object"
            ? (result.error as Record<string, unknown>)
            : null;
        const message =
          (typeof result.message === "string" && result.message) ||
          (typeof result.error === "string" && result.error) ||
          (errorObject && typeof errorObject.message === "string" && errorObject.message) ||
          "No se pudieron actualizar los pedidos. No se aplicaron cambios.";
        throw new Error(message);
      }

      const updated = typeof result.updated === "number" ? result.updated : 0;
      const unchanged = typeof result.unchanged === "number" ? result.unchanged : 0;
      setSelectedIds([]);
      setBulkMessage({
        type: "success",
        text: `Operación completada: ${updated} actualizado(s) y ${unchanged} sin cambios.`,
      });
      router.refresh();
    } catch (error) {
      setBulkMessage({
        type: "error",
        text: error instanceof Error ? error.message : "No se pudo actualizar los pedidos.",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  }

  function navigate(
    nextPage: number,
    nextQuery = search,
    nextStatus = status
  ) {
    if (isBulkUpdating) return;
    const params = new URLSearchParams();

    params.set("page", String(nextPage));
    params.set("limit", String(limit));

    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus) params.set("status", nextStatus);

    setSelectedIds([]);
    setBulkMessage(null);
    router.push(`/orders?${params.toString()}`);
  }

  return (
    <>
    {showBulkConfirm && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-confirm-title"
          aria-describedby="bulk-confirm-description"
          className="w-full max-w-md rounded-2xl border border-zinc-700 bg-[#18181b] p-6 text-white shadow-2xl"
        >
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/15 p-3 text-amber-400">
              ⚠️
            </div>

            <div>
              <h2
                id="bulk-confirm-title"
                className="text-lg font-bold text-zinc-100"
              >
                Confirmar actualización masiva
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                Verifica los cambios antes de continuar.
              </p>
            </div>
          </div>

          <p
            id="bulk-confirm-description"
            className="mb-4 text-sm leading-6 text-zinc-300"
          >
            Estás a punto de cambiar el estado de{" "}
            <span className="font-semibold text-white">
              {selectedVisibleIds.length} pedido(s)
            </span>
            .
          </p>

          <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800/70 p-4">
            <span className="text-sm text-zinc-300">Nuevo estado</span>

            <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-sm font-semibold text-indigo-300">
              {statusConfig[bulkStatus].label}
            </span>
          </div>

          <p className="mb-6 text-xs text-zinc-400">
            ¿Deseas continuar con la actualización?
          </p>

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-700 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowBulkConfirm(false)}
              disabled={isBulkUpdating}
              className="rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleBulkUpdate}
              disabled={isBulkUpdating || selectedVisibleIds.length === 0}
              data-testid="bulk-confirm-button"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isBulkUpdating
                ? "Actualizando..."
                : "Confirmar actualización"}
            </button>
          </div>
        </div>
      </div>
    )}
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
            disabled={isBulkUpdating}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cliente, email o número..."
            className="w-56 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
          />

          <select
            aria-label="Filtrar estado"
            data-testid="orders-status-filter"
            disabled={isBulkUpdating}
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
            disabled={isBulkUpdating}
            className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            Buscar
          </button>
        </form>
      </div>

      {selectedVisibleIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
          <span className="text-xs font-medium text-zinc-200" data-testid="bulk-selection-count">
            {selectedVisibleIds.length} pedido(s) seleccionado(s)
          </span>
          <select
            aria-label="Nuevo estado para pedidos seleccionados"
            data-testid="bulk-status-select"
            value={bulkStatus}
            disabled={isBulkUpdating}
            onChange={(event) => setBulkStatus(event.target.value as OrderStatus)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100"
          >
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <button
            type="button"
            data-testid="bulk-update-button"
            disabled={isBulkUpdating}
            onClick={openBulkConfirm}
            className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBulkUpdating ? "Actualizando..." : "Actualizar seleccionados"}
          </button>
          <button
            type="button"
            disabled={isBulkUpdating}
            onClick={() => { setSelectedIds([]); setBulkMessage(null); }}
            className="text-xs text-zinc-400 hover:text-white disabled:opacity-50"
          >
            Limpiar selección
          </button>
        </div>
      )}

      {bulkMessage && (
        <div
          role={bulkMessage.type === "error" ? "alert" : "status"}
          data-testid="bulk-result-message"
          className={`border-b px-4 py-3 text-xs ${
            bulkMessage.type === "success"
              ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-400"
              : "border-rose-900/40 bg-rose-950/30 text-rose-400"
          }`}
        >
          {bulkMessage.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-zinc-800/80 bg-zinc-950/50">
            <tr className="text-[11px] text-zinc-500">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los pedidos de esta página"
                  data-testid="bulk-select-all"
                  checked={allVisibleSelected}
                  disabled={isBulkUpdating}
                  onChange={toggleAllVisible}
                  className="h-4 w-4 cursor-pointer accent-indigo-500"
                />
              </th>
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
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar pedido ${order.number}`}
                      data-testid={`bulk-select-${order.id}`}
                      checked={selectedVisibleIds.includes(order.id)}
                      disabled={isBulkUpdating}
                      onChange={() => toggleOrder(order.id)}
                      className="h-4 w-4 cursor-pointer accent-indigo-500"
                    />
                  </td>
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
            disabled={page <= 1 || isBulkUpdating}
            onClick={() => navigate(page - 1)}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Anterior
          </button>

          <button
            type="button"
            disabled={page >= totalPages || isBulkUpdating}
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
