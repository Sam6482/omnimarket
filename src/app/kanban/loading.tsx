
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
  {
    status: "PENDING",
    label: "Pendientes",
    color: "bg-amber-500",
  },
  {
    status: "PROCESSING",
    label: "En proceso",
    color: "bg-blue-500",
  },
  {
    status: "SHIPPED",
    label: "Enviados",
    color: "bg-indigo-500",
  },
  {
    status: "DELIVERED",
    label: "Entregados",
    color: "bg-emerald-500",
  },
  {
    status: "CANCELLED",
    label: "Cancelados",
    color: "bg-rose-500",
  },
];

export default function KanbanLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando tablero Kanban"
      className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] text-zinc-100"
    >
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6">
        {/* Encabezado */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Operaciones / Pedidos
            </p>

            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Tablero Kanban
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Arrastra pedidos entre etapas o utiliza el selector
              de cada tarjeta.
            </p>
          </div>

          <Skeleton className="h-8 w-36" />
        </div>

        {/* Columnas Kanban */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((column) => (
            <section
              key={column.status}
              className="flex min-h-[360px] min-w-[245px] flex-1 flex-col rounded-lg border border-zinc-800/80 bg-[#121215]"
            >
              {/* Encabezado de columna */}
              <header className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${column.color}`}
                  />

                  <h2 className="text-xs font-semibold text-zinc-200">
                    {column.label}
                  </h2>
                </div>

                <Skeleton className="h-5 w-8" />
              </header>

              {/* Tarjetas de carga */}
              <div className="flex-1 space-y-2 p-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <article
                    key={index}
                    className="rounded-md border border-zinc-800 bg-zinc-950/70 p-3"
                  >
                    {/* Número de pedido */}
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-3 w-20" />
                      <span
                        aria-hidden="true"
                        className="text-[10px] text-zinc-600"
                      >
                        ⋮⋮
                      </span>
                    </div>

                    {/* Cliente */}
                    <Skeleton className="mt-3 h-3 w-32 max-w-full" />

                    {/* Artículos e importe */}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-2.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>

                    {/* Selector de estado */}
                    <div className="mt-3">
                      <span className="text-[10px] text-zinc-500">
                        Mover a
                      </span>
                      <Skeleton className="mt-1 h-8 w-full" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
