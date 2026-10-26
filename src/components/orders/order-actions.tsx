
"use client";

import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Product = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
};

type OrderItem = {
  productId: string;
  quantity: number;
};

type OrderDetail = {
  customerName: string;
  customerEmail: string;
  items: {
    quantity: number;
    product: Product;
  }[];
};

type Props = {
  order: {
    id: string;
    number: string;
    customerName: string;
    customerEmail: string;
  };
};

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500";

export function OrderActions({ order }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(order.customerName);
  const [email, setEmail] = useState(order.customerEmail);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  async function openEditor() {
    setError("");
    setLoading(true);
    setEditing(true);

    try {
      const [detailResponse, catalogResponse] = await Promise.all([
        fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/products?page=1&limit=100", {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);

      if (!detailResponse.ok || !catalogResponse.ok) {
        throw new Error(
          "No fue posible cargar los datos. Comprueba tu sesión."
        );
      }

      const detail: OrderDetail = await detailResponse.json();
      const catalog: { data: Product[] } =
        await catalogResponse.json();

      setName(detail.customerName);
      setEmail(detail.customerEmail);

      const loadedItems = detail.items.map((item) => ({
  productId: item.product.id,
  quantity: item.quantity,
}));

setItems(loadedItems);
setOriginalItems(loadedItems.map((item) => ({ ...item })));
      // Incluye productos ya asociados al pedido,
      // aunque no aparezcan entre los primeros 100.
      const productMap = new Map<string, Product>();

      for (const product of catalog.data) {
        productMap.set(product.id, product);
      }

      for (const item of detail.items) {
        if (!productMap.has(item.product.id)) {
          productMap.set(item.product.id, item.product);
        }
      }

      setProducts([...productMap.values()]);
    } catch (cause) {
      setEditing(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo abrir el editor."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index: number, patch: Partial<OrderItem>) {
    setItems((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    );
  }

  const estimatedTotal = items.reduce((sum, item) => {
    const product = products.find(
      (candidate) => candidate.id === item.productId
    );

    return sum + (product?.priceCents ?? 0) * item.quantity;
  }, 0);
 

  
function normalizeItems(lines: OrderItem[]) {
  const quantities = new Map<string, number>();

  for (const item of lines) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity
    );
  }

  return [...quantities.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
}


  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loading) return;

    const quantities = new Map<string, number>();

    for (const item of items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity
      );
    }

    if (
      !name.trim() ||
      !email.trim() ||
      items.length === 0 ||
      items.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 999
      ) ||
      [...quantities.values()].some((quantity) => quantity > 999)
    ) {
      setError("Revisa el cliente, los artículos y las cantidades.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(order.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
  customerName: name.trim(),
  customerEmail: email.trim(),

  // Solo reemplazamos artículos cuando cambiaron realmente.
  ...(JSON.stringify(normalizeItems(items)) !==
  JSON.stringify(normalizeItems(originalItems))
    ? { items: normalizeItems(items) }
    : {}),
}),
        }
      );

      if (!response.ok) {
        const messages: Record<number, string> = {
          400: "Hay datos inválidos en el pedido.",
          401: "Debes iniciar sesión.",
          404: "El pedido o algún producto ya no existe.",
          409: "Hubo un conflicto. Actualiza la página.",
        };

        throw new Error(
          messages[response.status] ??
            `No se pudo guardar (HTTP ${response.status}).`
        );
      }

      setEditing(false);
      toast.success("Pedido actualizado correctamente.");
      router.refresh();

      } catch (cause) {
  const message =
    cause instanceof Error
      ? cause.message
      : "No se pudo guardar el pedido.";

  setError(message);
  toast.error(message);
} finally {
  setBusy(false);
}

  }

  async function remove() {
    if (busy || loading) return;

    if (
      !window.confirm(
        `¿Eliminar permanentemente ${order.number}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(order.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Debes iniciar sesión."
            : `No se pudo eliminar (HTTP ${response.status}).`
        );
      }

      setEditing(false);
      toast.success("Pedido eliminado correctamente.");
      router.refresh();

      } catch (cause) {
  const message =
    cause instanceof Error
      ? cause.message
      : "No se pudo eliminar.";

  setError(message);
  toast.error(message);
} finally {
  setBusy(false);
}

  }

  return (
    <div className="min-w-[160px]">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => {
            if (editing) {
              setEditing(false);
              setError("");
            } else {
              void openEditor();
            }
          }}
          data-testid={`order-edit-${order.id}`}
          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Cargando..." : editing ? "Cerrar" : "Editar"}
        </button>

        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void remove()}
          data-testid={`order-delete-${order.id}`}
          className="rounded-md border border-rose-900/60 px-2.5 py-1.5 text-[11px] text-rose-400 hover:bg-rose-950/40 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>

      {editing && !loading && (
        <form
          onSubmit={(event) => void save(event)}
          data-testid={`order-edit-form-${order.id}`}
          className="mt-3 w-[min(380px,75vw)] space-y-3 rounded-md border border-zinc-700 bg-zinc-950 p-3 text-left"
        >
          <label className="block text-[11px] text-zinc-400">
            Cliente
            <input
              required
              maxLength={150}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </label>

          <label className="block text-[11px] text-zinc-400">
            Correo electrónico
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </label>

          <div className="border-t border-zinc-800 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">
                Artículos
              </span>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setItems((previous) => [
                    ...previous,
                    { productId: "", quantity: 1 },
                  ])
                }
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                + Agregar
              </button>
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_65px_26px] gap-1.5"
                >
                  <select
                    aria-label={`Producto ${index + 1}`}
                    required
                    value={item.productId}
                    disabled={busy}
                    onChange={(event) =>
                      updateItem(index, {
                        productId: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Seleccionar...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} · {product.name}
                      </option>
                    ))}
                  </select>

                  <input
                    aria-label={`Cantidad ${index + 1}`}
                    required
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    value={item.quantity}
                    disabled={busy}
                    onChange={(event) =>
                      updateItem(index, {
                        quantity: Number(event.target.value),
                      })
                    }
                    className={inputClass}
                  />

                  <button
                    type="button"
                    aria-label={`Quitar artículo ${index + 1}`}
                    disabled={busy || items.length === 1}
                    onClick={() =>
                      setItems((previous) =>
                        previous.filter((_, i) => i !== index)
                      )
                    }
                    className="text-sm text-zinc-500 hover:text-rose-400 disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
            <span className="text-[11px] text-zinc-500">
              Total estimado
            </span>
            <span className="font-mono text-xs text-zinc-100">
              {formatCurrency(estimatedTotal)}
            </span>
          </div>

          <p className="text-[10px] text-zinc-500">
            Al guardar artículos, se recalcularán sus precios usando
            el catálogo actual.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
          >
            {busy ? "Guardando..." : "Guardar pedido"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
