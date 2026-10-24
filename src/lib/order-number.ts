/** Convierte el número interno del pedido al identificador público acordado en docs/API.md. */
export function formatOrderNumber(number: number): string {
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new RangeError("El número de pedido debe ser un entero positivo seguro.");
  }
  return `OM-${number}`;
}
