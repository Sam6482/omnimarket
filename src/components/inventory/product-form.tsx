
"use client";

import { useToast } from "@/components/ui/toast-provider";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type ProductFormProps = {
  onClose: () => void;
};

type ProductFields = {
  sku: string;
  name: string;
  category: string;
  price: string;
  cost: string;
  stock: string;
};

const initialValues: ProductFields = {
  sku: "",
  name: "",
  category: "",
  price: "",
  cost: "",
  stock: "0",
};

function moneyToCents(value: string): number {
  return Math.round(Number(value) * 100);
}

export function ProductForm({ onClose }: ProductFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [fields, setFields] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof ProductFields, value: string) {
    setFields((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const priceCents = moneyToCents(fields.price);
    const costCents = moneyToCents(fields.cost);
    const stock = Number(fields.stock);

    if (
      !fields.sku.trim() ||
      !fields.name.trim() ||
      !fields.category.trim() ||
      fields.price.trim() === "" ||
      fields.cost.trim() === "" ||
      !Number.isSafeInteger(priceCents) ||
      !Number.isSafeInteger(costCents) ||
      !Number.isSafeInteger(stock) ||
      priceCents < 0 ||
      costCents < 0 ||
      stock < 0
    ) {
      setError("Revisa los campos y los importes del producto.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          sku: fields.sku.trim().toUpperCase(),
          name: fields.name.trim(),
          category: fields.category.trim(),
          priceCents,
          costCents,
          stock,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Necesitas iniciar sesión para crear productos.");
        }
        if (response.status === 409) {
          throw new Error("Ya existe un producto con ese SKU.");
        }
        throw new Error("No fue posible guardar el producto.");
      }

      toast.success("Producto creado correctamente.");
      router.refresh();
      onClose();
    
      } catch (cause) {
  const message =
    cause instanceof Error
      ? cause.message
      : "Ocurrió un error inesperado.";

  setError(message);
  toast.error(message);
} finally {
  setSaving(false);
}
  }

  return (
    <form
      onSubmit={submit}
      data-testid="product-create-form"
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["sku", "SKU", "OM-TEC-050"],
            ["name", "Nombre", "Teclado mecánico"],
            ["category", "Categoría", "Tecnología"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label
            key={key}
            className="block text-xs font-medium text-zinc-400"
          >
            {label}
            <input
              required
              value={fields[key]}
              onChange={(event) => setField(key, event.target.value)}
              placeholder={placeholder}
              maxLength={key === "sku" ? 32 : 150}
              data-testid={`product-field-${key}`}
              className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500"
            />
          </label>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["price", "Precio (MXN)"],
            ["cost", "Costo (MXN)"],
            ["stock", "Stock"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="block text-xs font-medium text-zinc-400"
          >
            {label}
            <input
              required
              type="number"
              min="0"
              step={key === "stock" ? "1" : "0.01"}
              value={fields[key]}
              onChange={(event) => setField(key, event.target.value)}
              data-testid={`product-field-${key}`}
              className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500"
            />
          </label>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-900/70 bg-rose-950/30 px-3 py-2 text-xs text-rose-300"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={saving}
          data-testid="product-submit"
          className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
