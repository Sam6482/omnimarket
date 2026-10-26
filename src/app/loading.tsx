
const pulse = "animate-pulse rounded-md bg-zinc-800/80";

function Skeleton({
className = "",
}: {
className?: string;
}) {
return <div className={`${pulse} ${className}`} />;
}

export default function Loading() {
return (
    <main
    aria-busy="true"
    aria-label="Cargando dashboard"
    className="min-h-screen bg-[#09090B] text-zinc-100"
    >
    <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6">
        {/* Encabezado */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
            <Skeleton className="h-2 w-20" />
            <h1 className="text-xl font-semibold tracking-tight">
            Dashboard
            </h1>
            <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-7 w-44" />
        </div>

        {/* Cuatro indicadores principales */}
        <section
        aria-label="Cargando indicadores principales"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
        {["Ingresos", "Pedidos", "Margen bruto", "Productos"].map(
            (label) => (
            <article
                key={label}
                className="min-w-0 rounded-lg border border-zinc-800/80 bg-[#121215] p-4 sm:p-5"
            >
                <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-medium text-zinc-400">
                    {label}
                </h2>
                <Skeleton className="h-4 w-4" />
                </div>
                <Skeleton className="mt-3 h-8 w-32 max-w-full" />
                <Skeleton className="mt-3 h-3 w-40 max-w-full" />
            </article>
            )
        )}
        </section>

        {/* Paneles operativos */}
        <section className="mt-4 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
          {/* Distribución de pedidos */}
        <article className="rounded-lg border border-zinc-800/80 bg-[#121215] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                Estado de los pedidos
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                Distribución por etapa operativa
                </p>
            </div>
            <Skeleton className="h-6 w-16" />
            </div>

            <Skeleton className="mt-7 h-2.5 w-full" />

            <div className="mt-5 divide-y divide-zinc-800/60">
            {[
                "Pendientes",
                "En proceso",
                "Enviados",
                "Entregados",
                "Cancelados",
            ].map((status) => (
                <div
                key={status}
                className="grid grid-cols-[minmax(0,1fr)_70px_48px] items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
                    <span className="text-xs text-zinc-400">
                    {status}
                    </span>
                </div>
                <Skeleton className="ml-auto h-3 w-12" />
                <Skeleton className="ml-auto h-3 w-8" />
                </div>
            ))}
            </div>

            <div className="mt-5 border-t border-zinc-800/60 pt-4">
            <Skeleton className="h-3 w-40" />
            </div>
        </article>

          {/* Panel de inventario */}
        <article className="flex flex-col rounded-lg border border-zinc-800/80 bg-[#121215] p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-zinc-100">
            Inventario
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
            Disponibilidad actual del catálogo
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[
                "Productos registrados (SKU)",
                "Unidades en existencia",
            ].map((label) => (
                <div
                key={label}
                className="rounded-md border border-zinc-800/80 bg-zinc-950/60 p-3"
                >
                <p className="text-[11px] text-zinc-500">
                    {label}
                </p>
                <Skeleton className="mt-3 h-7 w-20" />
                </div>
            ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-b border-zinc-800/60 pb-4">
            <span className="text-xs text-zinc-500">
                Existencia promedio
            </span>
            <Skeleton className="h-3 w-20" />
            </div>

            <div className="mt-auto pt-5">
            <Skeleton className="h-9 w-full" />
            </div>
        </article>
        </section>

        {/* Pie de página */}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-4 text-[11px] text-zinc-600">
        <span>OmniMarket · Operations Hub</span>
        <span>Importes almacenados en centavos · MXN</span>
        </footer>
    </div>
    </main>
);
}
