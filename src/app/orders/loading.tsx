
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
  "",
  "Pedido",
  "Cliente",
  "Estado",
  "Artículos",
  "Total",
  "Fecha",
  "Acciones",
];

export default function OrdersLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando pedidos"
      className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] text-zinc-100"
    >
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6">
        {/* Encabezado */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Operaciones / Comercial
          </p>

          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Pedidos
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Consulta, filtra y administra pedidos de OmniMarket.
          </p>
        </div>

        {/* Botón nuevo pedido */}
        <div className="mb-3 flex justify-end">
          <Skeleton className="h-8 w-32" />
        </div>

        {/* Registro de pedidos */}
        <section className="overflow-hidden rounded-lg border border-zinc-800/80 bg-[#121215]">
          {/* Cabecera y filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 p-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Registro de pedidos
              </h2>
              <Skeleton className="mt-2 h-3 w-24" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>

          {/* Tabla de pedidos */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-zinc-800/80 bg-zinc-950/50">
                <tr className="text-[11px] text-zinc-500">
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className={`px-4 py-3 font-medium ${
                        index >= 4 ? "text-right" : ""
                      }`}
                    >
                      {index === 0 ? (
                        <Skeleton className="h-4 w-4 rounded-sm" />
                      ) : (
                        column
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60">
                {Array.from({ length: 8 }, (_, row) => (
                  <tr key={row}>
                    {columns.map((_, index) => (
                      <td key={index} className="px-4 py-3">
                        {index === 0 ? (
                          <Skeleton className="h-4 w-4 rounded-sm" />
                        ) : index === 2 ? (
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-2 w-36" />
                          </div>
                        ) : (
                          <Skeleton
                            className={`h-4 ${
                              index === 3
                                ? "w-24"
                                : index === 7
                                  ? "w-14"
                                  : "w-20"
                            } ${
                              index >= 4 ? "ml-auto" : ""
                            }`}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <footer className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-3">
            <Skeleton className="h-3 w-24" />

            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}