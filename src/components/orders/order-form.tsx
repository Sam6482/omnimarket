
"use client";

import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type Product = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
};

type Item = {
  productId: string;
  quantity: number;
};

type Props = {
  onClose: () => void;
};

export function OrderForm({ onClose }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<Item[]>([
    { productId: "", quantity: 1 },
  ]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch("/api/products?limit=100&page=1", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Necesitas iniciar sesión para consultar productos."
              : "No se pudo cargar el catálogo."
          );
        }

        const result: { data: Product[] } = await response.json();

        if (!controller.signal.aborted) {
          setProducts(result.data);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Error al cargar productos."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProducts();

    return () => controller.abort();
  }, []);

  function changeItem(index: number, patch: Partial<Item>) {
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  const estimatedTotal = items.reduce((sum, item) => {
    const product = products.find(
      (candidate) => candidate.id === item.productId
    );

    return sum + (product?.priceCents ?? 0) * item.quantity;
  }, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading) return;

    if (
      !customerName.trim() ||
      !customerEmail.trim() ||
      items.length === 0 ||
      items.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 999
      )
    ) {
      setError("Completa los datos y selecciona productos válidos.");
      return;
    }

    // Unificamos productos repetidos para enviar una línea por SKU.
    const quantities = new Map<string, number>();

    for (const item of items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity
      );
    }

    if ([...quantities.values()].some((quantity) => quantity > 999)) {
      setError("Máximo 999 unidades por producto.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          status,
          items: [...quantities.entries()].map(
            ([productId, quantity]) => ({ productId, quantity })
          ),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Tu sesión no está activa.");
        }
        if (response.status === 404) {
          throw new Error(
            "Algún producto ya no existe. Actualiza el catálogo."
          );
        }
        if (response.status === 400) {
          throw new Error("Revisa los datos del pedido.");
        }

        throw new Error(
          `No se pudo crear el pedido (HTTP ${response.status}).`
        );
      }
      toast.success("Pedido creado correctamente.");
      router.refresh();
      onClose();
    } catch (cause) {
  const message =
    cause instanceof Error
      ? cause.message
      : "No se pudo crear el pedido.";

  setError(message);
  toast.error(message);
} finally {
  setSaving(false);
}
  }

  const inputClass =
    "mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500";

  return (
    <form
      onSubmit={(event) => void submit(event)}
      data-testid="order-create-form"
      className="space-y-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-400">
          Nombre del cliente
          <input
            required
            maxLength={150}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Nombre completo"
            className={inputClass}
          />
        </label>

        <label className="text-xs text-zinc-400">
          Correo electrónico
          <input
            required
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            placeholder="cliente@ejemplo.com"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-xs text-zinc-400">
        Estado inicial
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={inputClass}
        >
          <option value="PENDING">Pendiente</option>
          <option value="PROCESSING">En proceso</option>
          <option value="SHIPPED">Enviado</option>
          <option value="DELIVERED">Entregado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </label>

      <div className="border-t border-zinc-800 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200">
            Artículos del pedido
          </h3>
          <button
            type="button"
            onClick={() =>
              setItems((previous) => [
                ...previous,
                { productId: "", quantity: 1 },
              ])
            }
            disabled={loading || saving}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            + Agregar artículo
          </button>
        </div>

        {loading && (
          <p className="text-xs text-zinc-500">
            Cargando productos...
          </p>
        )}

        {!loading && products.length === 0 && (
          <p className="text-xs text-amber-400">
            No hay productos disponibles en la primera página del catálogo.
          </p>
        )}

        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_85px_34px] items-end gap-2"
            >
              <label className="text-[11px] text-zinc-500">
                Producto
                <select
                  required
                  value={item.productId}
                  onChange={(event) =>
                    changeItem(index, {
                      productId: event.target.value,
                    })
                  }
                  disabled={loading || saving}
                  className={inputClass}
                >
                  <option value="">Seleccionar producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} · {product.name} ·{" "}
                      {formatCurrency(product.priceCents)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[11px] text-zinc-500">
                Cantidad
                <input
                  required
                  type="number"
                  min={1}
                  max={999}
                  step={1}
                  value={item.quantity}
                  onChange={(event) =>
                    changeItem(index, {
                      quantity: Number(event.target.value),
                    })
                  }
                  disabled={saving}
                  className={inputClass}
                />
              </label>

              <button
                type="button"
                aria-label={`Quitar artículo ${index + 1}`}
                onClick={() =>
                  setItems((previous) =>
                    previous.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                disabled={items.length === 1 || saving}
                className="h-[34px] rounded-md border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
        <div>
          <p className="text-xs text-zinc-400">Total estimado</p>
          <p className="mt-1 text-[11px] text-zinc-600">
            El servidor verifica los precios
          </p>
        </div>

        <strong className="font-mono text-xl font-semibold text-zinc-100 tabular-nums">
          {formatCurrency(estimatedTotal)}
        </strong>
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
          data-testid="order-submit"
          disabled={saving || loading || products.length === 0}
          className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
        >
          {saving ? "Creando..." : "Crear pedido"}
        </button>
      </div>
    </form>
  );
}
