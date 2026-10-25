/**
 * Cálculos financieros compartidos (dashboard, analítica y pruebas).
 * Todo el dinero se maneja en centavos enteros (CLAUDE.md, regla 4).
 */

function assertCents(name: string, value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} debe ser un entero de centavos.`);
  }
}

/** Porcentaje con un decimal (36.04 → 36.0). Devuelve 0 si el total es 0. */
export function percentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Ticket promedio en centavos, redondeado. 0 si no hay pedidos. */
export function averageTicketCents(revenueCents: number, orders: number): number {
  assertCents("revenueCents", revenueCents);
  if (!Number.isSafeInteger(orders) || orders < 0) {
    throw new RangeError("orders debe ser un entero mayor o igual a 0.");
  }
  if (orders === 0) return 0;
  return Math.round(revenueCents / orders);
}

/** Margen bruto en centavos: ingresos − costo. */
export function grossMarginCents(revenueCents: number, costCents: number): number {
  assertCents("revenueCents", revenueCents);
  assertCents("costCents", costCents);
  return revenueCents - costCents;
}

/** Margen bruto como porcentaje de los ingresos (un decimal). */
export function grossMarginPct(revenueCents: number, costCents: number): number {
  return percentage(grossMarginCents(revenueCents, costCents), revenueCents);
}

/** Resumen financiero a partir de totales agregados. */
export function summarizeFinance(input: { revenueCents: number; costCents: number; orders: number }) {
  const marginCents = grossMarginCents(input.revenueCents, input.costCents);
  return {
    revenueCents: input.revenueCents,
    orders: input.orders,
    averageTicketCents: averageTicketCents(input.revenueCents, input.orders),
    grossMarginCents: marginCents,
    grossMarginPct: percentage(marginCents, input.revenueCents),
  };
}
