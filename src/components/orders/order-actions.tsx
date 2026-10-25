
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = {
  order: {
    id: string;
    number: string;
    customerName: string;
    customerEmail: string;
  };
};

export function OrderActions({ order }: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(order.customerName);
  const [email, setEmail] = useState(order.customerEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (!name.trim() || !email.trim()) {
      setError("Completa el nombre y correo del cliente.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(order.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            customerName: name.trim(),
            customerEmail: email.trim(),
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Tu sesión ha expirado.");
        }
        if (response.status === 404) {
          throw new Error("El pedido ya no existe.");
        }
        if (response.status === 400) {
          throw new Error("Los datos no son válidos.");
        }

        throw new Error(
          `No se pudo actualizar (HTTP ${response.status}).`
        );
      }

      setEditing(false);
      setSuccess("Pedido actualizado.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar el pedido."
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;

    const confirmed = window.confirm(
      `¿Eliminar permanentemente el pedido ${order.number}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(order.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Tu sesión ha expirado.");
        }
        if (response.status === 404) {
          throw new Error("El pedido ya no existe.");
        }
        if (response.status === 409) {
          throw new Error(
            "El pedido no puede eliminarse por un conflicto de datos."
          );
        }

        throw new Error(
          `No se pudo eliminar (HTTP ${response.status}).`
        );
      }

      setSuccess("Pedido eliminado.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo eliminar el pedido."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-[160px]">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-testid={`order-edit-${order.id}`}
          disabled={busy}
          onClick={() => {
            setEditing((previous) => !previous);
            setName(order.customerName);
            setEmail(order.customerEmail);
            setError("");
            setSuccess("");
          }}
          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          Editar
        </button>

        <button
          type="button"
          data-testid={`order-delete-${order.id}`}
          disabled={busy}
          onClick={() => void remove()}
          className="rounded-md border border-rose-900/60 px-2.5 py-1.5 text-[11px] text-rose-400 transition-colors hover:bg-rose-950/40 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>

      {editing && (
        <form
          data-testid={`order-edit-form-${order.id}`}
          onSubmit={(event) => void save(event)}
          className="mt-3 space-y-3 rounded-md border border-zinc-700 bg-zinc-950 p-3 text-left"
        >
          <label className="block text-[11px] text-zinc-400">
            Nombre del cliente
            <input
              required
              maxLength={150}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500"
            />
          </label>

          <label className="block text-[11px] text-zinc-400">
            Correo electrónico
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="rounded-md border border-zinc-700 px-2.5 py-2 text-[11px] text-zinc-400"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-zinc-100 px-2.5 py-2 text-[11px] font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
            >
              {busy ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-rose-400">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="mt-2 text-[11px] text-emerald-400">
          {success}
        </p>
      )}
    </div>
  );
}
