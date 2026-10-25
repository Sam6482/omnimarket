/**
 * Formateadores de presentación (solo UI). El dinero viaja siempre en centavos enteros
 * y se convierte a pesos únicamente al mostrarlo (CLAUDE.md, regla 4).
 */

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function assertCents(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("El monto debe ser un entero de centavos.");
  }
}

/** 250000 → "$2,500.00" (MXN, es-MX). */
export function formatCurrency(cents: number): string {
  assertCents(cents);
  return currencyFormatter.format(cents / 100);
}

/** 36 → "36.0 %". Recibe el porcentaje ya calculado (p. ej. de `grossMarginPct`). */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError("El porcentaje debe ser un número finito.");
  return `${percentFormatter.format(value)} %`;
}
