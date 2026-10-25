
"use client";

import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import { formatCurrency } from "@/lib/format";

type Status =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type KanbanOrder = {
  id: string;
  number: string;
  customerName: string;
  status: Status;
  position: number;
  totalCents: number;
  itemsCount: number;
  updatedAt: string;
};

const COLUMNS: {
  status: Status;
  label: string;
  color: string;
}[] = [
  { status: "PENDING", label: "Pendientes", color: "bg-amber-500" },
  { status: "PROCESSING", label: "En proceso", color: "bg-blue-500" },
  { status: "SHIPPED", label: "Enviados", color: "bg-indigo-500" },
  { status: "DELIVERED", label: "Entregados", color: "bg-emerald-500" },
  { status: "CANCELLED", label: "Cancelados", color: "bg-rose-500" },
];

export function KanbanBoard({
  initialOrders,
}: {
  initialOrders: KanbanOrder[];
}) {
  const router = useRouter();

  const [orders, setOrders] = useState(initialOrders);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function moveOrder(id: string, nextStatus: Status) {
    if (pendingId) return;

    const currentOrder = orders.find((order) => order.id === id);

    if (!currentOrder || currentOrder.status === nextStatus) return;

    const snapshot = orders;

    const columnPositions = orders
  .filter((order) => order.status === nextStatus)
  .map((order) => order.position);

const nextPosition = columnPositions.length
  ? Math.min(...columnPositions) - 1000
  : 1000;

    // La tarjeta se mueve inmediatamente.
    setOrders((previous) =>
      previous.map((order) =>
        order.id === id
          ? {
              ...order,
              status: nextStatus,
              position: nextPosition,
            }
          : order
      )
    );

    setPendingId(id);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            status: nextStatus,
            position: nextPosition,
            expectedUpdatedAt: currentOrder.updatedAt,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Debes iniciar sesión para mover pedidos."
          );
        }

        if (response.status === 409) {
          throw new Error(
            "El pedido cambió en otra sesión. Actualiza el tablero."
          );
        }

        throw new Error(
          `No se pudo guardar el movimiento (HTTP ${response.status}).`
        );
      }

      const result: {
        id: string;
        status: Status;
        position: number;
        updatedAt: string;
      } = await response.json();

      // Conservamos la versión actualizada para futuros movimientos.
      setOrders((previous) =>
        previous.map((order) =>
          order.id === id
            ? {
                ...order,
                status: result.status,
                position: result.position,
                updatedAt: result.updatedAt,
              }
            : order
        )
      );

      setMessage({
        type: "success",
        text: `${currentOrder.number} actualizado correctamente.`,
      });
    } catch (error) {
      // Si el servidor rechaza el cambio, revertimos la tarjeta.
      setOrders(snapshot);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo mover el pedido.",
      });

      // Recupera datos actualizados si hubo un conflicto.
      router.refresh();
    } finally {
      setPendingId(null);
      setDraggedId(null);
      setOverColumn(null);
    }
  }

  function onDragStart(event: DragEvent<HTMLElement>, id: string) {
    if (pendingId) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  }

  function onDrop(event: DragEvent<HTMLElement>, status: Status) {
    event.preventDefault();

    const id =
      event.dataTransfer.getData("text/plain") || draggedId;

    setDraggedId(null);
    setOverColumn(null);

    if (id) void moveOrder(id, status);
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={[
            "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs",
            message.type === "error"
              ? "border-rose-900/70 bg-rose-950/30 text-rose-300"
              : "border-emerald-900/70 bg-emerald-950/20 text-emerald-300",
          ].join(" ")}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-sm"
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const columnOrders = orders
            .filter((order) => order.status === column.status)
            .sort(
              (a, b) =>
                a.position - b.position ||
                a.id.localeCompare(b.id)
            );

          const highlighted = overColumn === column.status;

          return (
            <section
              key={column.status}
              data-testid={`kanban-column-${column.status}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOverColumn(column.status);
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null
                  )
                ) {
                  setOverColumn(null);
                }
              }}
              onDrop={(event) => onDrop(event, column.status)}
              className={[
                "flex min-h-[360px] min-w-[245px] flex-1 flex-col rounded-lg border bg-[#121215] transition-colors",
                highlighted
                  ? "border-indigo-500/70 bg-indigo-500/5"
                  : "border-zinc-800/80",
              ].join(" ")}
            >
              <header className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${column.color}`}
                  />
                  <h2 className="text-xs font-semibold text-zinc-200">
                    {column.label}
                  </h2>
                </div>

                <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                  {columnOrders.length}
                </span>
              </header>

              <div className="flex-1 space-y-2 p-2">
                {columnOrders.map((order) => (
                  <article
                    key={order.id}
                    data-testid={`kanban-card-${order.id}`}
                    draggable={!pendingId}
                    onDragStart={(event) =>
                      onDragStart(event, order.id)
                    }
                    onDragEnd={() => {
                      setDraggedId(null);
                      setOverColumn(null);
                    }}
                    className={[
                      "cursor-grab rounded-md border border-zinc-800 bg-zinc-950/70 p-3 transition-colors hover:border-zinc-600 active:cursor-grabbing",
                      draggedId === order.id
                        ? "opacity-40"
                        : "",
                      pendingId === order.id
                        ? "opacity-60"
                        : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-zinc-400">
                        {order.number}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        ⋮⋮
                      </span>
                    </div>

                    <p className="mt-2 truncate text-xs font-medium text-zinc-100">
                      {order.customerName}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-2.5">
                      <span className="text-[10px] text-zinc-500">
                        {order.itemsCount} artículos
                      </span>
                      <span className="font-mono text-[11px] text-zinc-300 tabular-nums">
                        {formatCurrency(order.totalCents)}
                      </span>
                    </div>

                    {/* Alternativa accesible al arrastre con ratón. */}
                    <label className="mt-3 block text-[10px] text-zinc-500">
                      Mover a
                      <select
                        aria-label={`Mover pedido ${order.number}`}
                        data-testid={`kanban-move-${order.id}`}
                        value={order.status}
                        disabled={pendingId !== null}
                        onChange={(event) => {
                          void moveOrder(
                            order.id,
                            event.target.value as Status
                          );
                        }}
                        className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-indigo-500 disabled:opacity-50"
                      >
                        {COLUMNS.map((target) => (
                          <option
                            key={target.status}
                            value={target.status}
                          >
                            {target.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}

                {columnOrders.length === 0 && (
                  <div className="rounded-md border border-dashed border-zinc-800 p-6 text-center text-[11px] text-zinc-500">
                    Arrastra un pedido aquí
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
