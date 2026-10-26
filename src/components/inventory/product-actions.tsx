
"use client";

import { useToast } from "@/components/ui/toast-provider";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { InventoryProduct } from "./inventory-table";

type Props = {
  product: InventoryProduct;
};

function centsToPesos(cents: number) {
  return (cents / 100).toFixed(2);
}

function pesosToCents(value: string) {
  return Math.round(Number(value) * 100);
}

export function ProductActions({ product }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(
    centsToPesos(product.priceCents)
  );
  const [cost, setCost] = useState(
    centsToPesos(product.costCents)
  );
  const [stock, setStock] = useState(String(product.stock));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const priceCents = pesosToCents(price);
    const costCents = pesosToCents(cost);
    const stockValue = Number(stock);

    if (
      !name.trim() ||
      !category.trim() ||
      !/^[A-Z0-9-]{3,32}$/.test(sku.trim().toUpperCase()) ||
      price.trim() === "" ||
      cost.trim() === "" ||
      stock.trim() === "" ||
      !Number.isSafeInteger(priceCents) ||
      !Number.isSafeInteger(costCents) ||
      !Number.isSafeInteger(stockValue) ||
      priceCents < 0 ||
      costCents < 0 ||
      stockValue < 0
    ) {
      setError("Revisa los campos y los importes.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(product.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            sku: sku.trim().toUpperCase(),
            name: name.trim(),
            category: category.trim(),
            priceCents,
            costCents,
            stock: stockValue,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401)
          throw new Error("Tu sesión no está activa.");

        if (response.status === 409)
          throw new Error("El SKU ya está registrado.");

        if (response.status === 404)
          throw new Error("El producto ya no existe.");

        throw new Error(`No se pudo editar (HTTP ${response.status}).`);
      }

      setEditing(false);
      setSuccess("Producto actualizado.");
      toast.success("Producto actualizado correctamente.");
      router.refresh();

      } catch (cause) {
  const message =
    cause instanceof Error
      ? cause.message
      : "No se pudo actualizar el producto.";

  setError(message);
  toast.error(message);
} finally {
  setBusy(false);
}
  }

  async function remove() {
    if (busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/products/${encodeURIComponent(product.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        if (response.status === 409)
          throw new Error(
            "No puedes eliminar este producto porque tiene pedidos asociados."
          );

        if (response.status === 401)
          throw new Error("Tu sesión no está activa.");

        if (response.status === 404)
          throw new Error("El producto ya no existe.");

        throw new Error(`No se pudo eliminar (HTTP ${response.status}).`);
      }

      setShowDeleteConfirm(false);
      setSuccess("Producto eliminado.");
      toast.success("Producto eliminado correctamente.");
      router.refresh();
      
      } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "No se pudo eliminar el producto.";

      setError(message);
      toast.error(message);
      } finally {
      setBusy(false);
      }
      }

function cancelDelete() {
  if (!busy) {
    setShowDeleteConfirm(false);
  }
}

  return (
    <div className="min-w-[145px] space-y-2">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          data-testid={`product-edit-${product.id}`}
          onClick={() => {
            setEditing((previous) => !previous);
            setError("");
            setSuccess("");
          }}
          disabled={busy}
          className="rounded-md border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          Editar
        </button>

        <button
          type="button"
          data-testid={`product-delete-${product.id}`}
          onClick={() => setShowDeleteConfirm(true)}
          disabled={busy}
          className="rounded-md border border-rose-900/60 px-2 py-1.5 text-[11px] text-rose-400 hover:bg-rose-950/40 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>

      {editing && (
        <form
          data-testid={`product-edit-form-${product.id}`}
          onSubmit={(event) => void save(event)}
          className="space-y-2 rounded-md border border-zinc-700 bg-zinc-950 p-3"
        >
          {[
            {
              label: "SKU",
              value: sku,
              change: setSku,
            },
            {
              label: "Nombre",
              value: name,
              change: setName,
            },
            {
              label: "Categoría",
              value: category,
              change: setCategory,
            },
            {
              label: "Precio MXN",
              value: price,
              change: setPrice,
            },
            {
              label: "Costo MXN",
              value: cost,
              change: setCost,
            },
            {
              label: "Stock",
              value: stock,
              change: setStock,
            },
          ].map((field) => (
            <label
              key={field.label}
              className="block text-[11px] text-zinc-400"
            >
              {field.label}
              <input
                required
                value={field.value}
                onChange={(event) => field.change(event.target.value)}
                className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
          >
            {busy ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-rose-400">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="text-[11px] text-emerald-400">
          {success}
        </p>
      )}
    {showDeleteConfirm && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`delete-title-${product.id}`}
      aria-describedby={`delete-description-${product.id}`}
      className="w-full max-w-md rounded-xl border border-zinc-700 bg-[#18181B] p-6 shadow-2xl"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-rose-500/10 p-3 text-rose-400">
          🗑️
        </div>

        <div>
          <h2
            id={`delete-title-${product.id}`}
            className="text-lg font-semibold text-zinc-100"
          >
            ¿Eliminar producto?
          </h2>

          <p className="text-xs text-zinc-400">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      <p
        id={`delete-description-${product.id}`}
        className="mb-6 text-sm leading-relaxed text-zinc-300"
      >
        ¿Estás segura de que deseas eliminar{" "}
        <strong className="text-white">{product.name}</strong>{" "}
        ({product.sku})?
      </p>

      <div className="flex justify-end gap-3 border-t border-zinc-700 pt-4">
        <button
          type="button"
          onClick={cancelDelete}
          disabled={busy}
          className="rounded-md border border-zinc-600 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
        >
          {busy ? "Eliminando..." : "Sí, eliminar"}
        </button>
      </div>
    </div>
  </div>

)}
</div>
  );
}
