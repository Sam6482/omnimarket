
function Skeleton({
className = "",
}: {
className?: string;
}) {
return (
    <div
    className={`animate-pulse rounded-md bg-zinc-800/80 ${className}`}
    />
  );
}

const columns = [
  "SKU",
  "Producto",
  "Categoría",
  "Precio",
  "Costo",
  "Stock",
  "Acciones",
];

export default function InventoryLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando inventario"
      className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] text-zinc-100"
    >
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6">
        {/* Encabezado */}
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

        {/* Botón de creación */}
        <div className="mb-3 flex justify-end">
          <Skeleton className="h-8 w-32" />
        </div>

        {/* Catálogo */}
        <section className="overflow-hidden rounded-lg border border-zinc-800/80 bg-[#121215]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 p-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Catálogo de productos
              </h2>
              <Skeleton className="mt-2 h-3 w-32" />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-48 sm:w-60" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead className="border-b border-zinc-800/80 bg-zinc-950/50">
                <tr className="text-[11px] text-zinc-500">
                  {columns.map((column, index) => (
                    <th
                      key={column}
                      className={`px-4 py-3 font-medium ${
                        index >= 3 ? "text-right" : ""
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60">
                {Array.from({ length: 8 }, (_, row) => (
                  <tr key={row}>
                    {columns.map((column, index) => (
                      <td key={column} className="px-4 py-3">
                        <Skeleton
                          className={`h-4 ${
                            index === 1
                              ? "w-32"
                              : index === 2
                                ? "w-24"
                                : index === 6
                                  ? "w-14"
                                  : "w-16"
                          } ${
                            index >= 3 ? "ml-auto" : ""
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <footer className="flex items-center justify-between gap-4 border-t border-zinc-800/80 px-4 py-3">
            <Skeleton className="h-3 w-24" />

            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
