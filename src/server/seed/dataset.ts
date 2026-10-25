import type { OrderStatus } from "@prisma/client";

/**
 * Dataset determinista de OmniMarket (docs/API.md · POST /api/test/reset-data).
 *
 * Con la misma semilla produce SIEMPRE los mismos productos, pedidos y líneas (ids, fechas,
 * precios y totales incluidos). Lo usan reset-data, el seed y los E2E (CLAUDE.md, regla 6).
 * Es código puro: no toca la base de datos, así que puede probarse sin Neon.
 */

export const DATASET_SEED = 42;
export const PRODUCT_COUNT = 40;
export const ORDER_COUNT = 1200;
export const ORDER_ITEM_COUNT = 3100;
/** Fecha fija de referencia: los pedidos se reparten en los 180 días anteriores. */
export const DATASET_ANCHOR = new Date("2026-10-24T00:00:00.000Z");
export const DATASET_DAYS = 180;

export type SeedProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  costCents: number;
  stock: number;
};

export type SeedOrder = {
  id: string;
  number: number;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  position: number;
  totalCents: number;
  costCents: number;
  itemsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SeedOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
};

export type Dataset = {
  seed: number;
  products: SeedProduct[];
  orders: SeedOrder[];
  orderItems: SeedOrderItem[];
};

/** Generador pseudoaleatorio Mulberry32: rápido y reproducible a partir de un entero. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATALOG: ReadonlyArray<{
  prefix: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  names: readonly string[];
}> = [
  { prefix: "TEC", category: "Tecnología", minPrice: 150000, maxPrice: 2800000,
    names: ["Laptop Pro 14", "Monitor 27 pulgadas", "Tablet 11 pulgadas", "Cámara web 4K", "Mini PC"] },
  { prefix: "ACC", category: "Accesorios", minPrice: 19900, maxPrice: 159900,
    names: ["Mouse inalámbrico", "Teclado mecánico", "Hub USB-C", "Base para laptop", "Mochila para laptop"] },
  { prefix: "AUD", category: "Audio", minPrice: 39900, maxPrice: 699900,
    names: ["Audífonos Bluetooth", "Bocina portátil", "Barra de sonido", "Micrófono USB", "Audífonos con cancelación"] },
  { prefix: "OFI", category: "Oficina", minPrice: 49900, maxPrice: 899900,
    names: ["Silla ergonómica", "Escritorio ajustable", "Lámpara LED", "Organizador de cables", "Reposapiés"] },
  { prefix: "ALM", category: "Almacenamiento", minPrice: 24900, maxPrice: 459900,
    names: ["SSD externo 1 TB", "Memoria USB 128 GB", "Disco duro 4 TB", "Tarjeta microSD 256 GB", "NAS de 2 bahías"] },
  { prefix: "HOG", category: "Hogar inteligente", minPrice: 29900, maxPrice: 399900,
    names: ["Foco inteligente", "Enchufe Wi-Fi", "Cámara de seguridad", "Asistente de voz", "Sensor de movimiento"] },
  { prefix: "GAM", category: "Gaming", minPrice: 59900, maxPrice: 1299900,
    names: ["Control inalámbrico", "Mouse gamer", "Silla gamer", "Tapete XL", "Audífonos gamer"] },
  { prefix: "RED", category: "Redes", minPrice: 34900, maxPrice: 549900,
    names: ["Router Wi-Fi 6", "Repetidor Wi-Fi", "Switch 8 puertos", "Adaptador USB Wi-Fi", "Kit Mesh"] },
];

const FIRST_NAMES = [
  "Ana", "Carlos", "Mariana", "Diego", "Sofía", "Luis", "Valeria", "Jorge", "Camila", "Pablo",
  "Fernanda", "Ricardo", "Daniela", "Andrés", "Paola", "Miguel", "Regina", "Emilio", "Ximena", "Hugo",
] as const;

const LAST_NAMES = [
  "García", "López", "Torres", "Hernández", "Martínez", "Ramírez", "Cruz", "Morales", "Flores", "Sánchez",
  "Gómez", "Díaz", "Reyes", "Vargas", "Castillo", "Ortiz", "Mendoza", "Ruiz", "Jiménez", "Navarro",
] as const;

/** Distribución de estados (suma 1): la mayoría entregados, pocos cancelados. */
const STATUS_WEIGHTS: ReadonlyArray<readonly [OrderStatus, number]> = [
  ["PENDING", 0.15],
  ["PROCESSING", 0.15],
  ["SHIPPED", 0.25],
  ["DELIVERED", 0.38],
  ["CANCELLED", 0.07],
];

const LINES_PER_ORDER_WEIGHTS: ReadonlyArray<readonly [number, number]> = [
  [1, 0.15],
  [2, 0.35],
  [3, 0.3],
  [4, 0.2],
];

const QUANTITY_WEIGHTS: ReadonlyArray<readonly [number, number]> = [
  [1, 0.7],
  [2, 0.2],
  [3, 0.1],
];

const MAX_LINES_PER_ORDER = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

function pickWeighted<T>(random: () => number, options: ReadonlyArray<readonly [T, number]>): T {
  const roll = random();
  let accumulated = 0;
  for (const [value, weight] of options) {
    accumulated += weight;
    if (roll < accumulated) return value;
  }
  return options[options.length - 1][0];
}

function integerBetween(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

function emailSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function buildProducts(random: () => number): SeedProduct[] {
  const products: SeedProduct[] = [];
  for (const group of CATALOG) {
    group.names.forEach((name, index) => {
      // Precios terminados en 900 centavos (p. ej. $1,299.00 → 129900), como en tienda real.
      const rawPrice = integerBetween(random, group.minPrice, group.maxPrice);
      const priceCents = Math.max(Math.round(rawPrice / 1000) * 1000 - 100, 9900);
      const costRatio = 0.45 + random() * 0.3;
      products.push({
        id: `seed-product-${pad(products.length + 1, 3)}`,
        sku: `OM-${group.prefix}-${pad(index + 1, 3)}`,
        name,
        category: group.category,
        priceCents,
        costCents: Math.round(priceCents * costRatio),
        stock: integerBetween(random, 5, 120),
      });
    });
  }
  return products;
}

/** Líneas por pedido (1–4) ajustadas para sumar exactamente ORDER_ITEM_COUNT. */
function buildLineCounts(random: () => number): number[] {
  const counts = Array.from({ length: ORDER_COUNT }, () => pickWeighted(random, LINES_PER_ORDER_WEIGHTS));
  let difference = ORDER_ITEM_COUNT - counts.reduce((sum, count) => sum + count, 0);
  let cursor = 0;
  while (difference !== 0) {
    const index = (cursor * 7) % ORDER_COUNT;
    if (difference > 0 && counts[index] < MAX_LINES_PER_ORDER) {
      counts[index] += 1;
      difference -= 1;
    } else if (difference < 0 && counts[index] > 1) {
      counts[index] -= 1;
      difference += 1;
    }
    cursor += 1;
  }
  return counts;
}

export function buildDataset(seed: number = DATASET_SEED): Dataset {
  const random = createRandom(seed);
  const products = buildProducts(random);
  const lineCounts = buildLineCounts(random);

  // Fechas primero y ordenadas: así OM-1 es el pedido más antiguo y OM-1200 el más reciente.
  const anchorMs = DATASET_ANCHOR.getTime();
  const createdTimes = Array.from({ length: ORDER_COUNT }, () => {
    const msAgo = Math.floor(random() * DATASET_DAYS * DAY_MS);
    return Math.floor((anchorMs - msAgo) / 1000) * 1000;
  }).sort((a, b) => a - b);

  const nextPosition: Record<OrderStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };

  const orders: SeedOrder[] = [];
  const orderItems: SeedOrderItem[] = [];

  for (let index = 0; index < ORDER_COUNT; index += 1) {
    const number = index + 1;
    const id = `seed-order-${pad(number, 4)}`;
    const status = pickWeighted(random, STATUS_WEIGHTS);
    nextPosition[status] += 1000;

    const firstName = FIRST_NAMES[integerBetween(random, 0, FIRST_NAMES.length - 1)];
    const lastName = LAST_NAMES[integerBetween(random, 0, LAST_NAMES.length - 1)];

    // Productos distintos dentro del mismo pedido.
    const productIndexes = new Set<number>();
    while (productIndexes.size < lineCounts[index]) {
      productIndexes.add(integerBetween(random, 0, products.length - 1));
    }

    let totalCents = 0;
    let costCents = 0;
    let itemsCount = 0;
    for (const productIndex of productIndexes) {
      const product = products[productIndex];
      const quantity = pickWeighted(random, QUANTITY_WEIGHTS);
      totalCents += product.priceCents * quantity;
      costCents += product.costCents * quantity;
      itemsCount += quantity;
      orderItems.push({
        id: `seed-item-${pad(orderItems.length + 1, 5)}`,
        orderId: id,
        productId: product.id,
        quantity,
        unitPriceCents: product.priceCents,
        unitCostCents: product.costCents,
      });
    }

    const createdAt = new Date(createdTimes[index]);
    // Los pedidos avanzados se actualizaron después de crearse, sin pasar de la fecha de referencia.
    const hoursLater = status === "PENDING" ? 0 : integerBetween(random, 1, 96);
    const updatedAt = new Date(Math.min(createdAt.getTime() + hoursLater * 60 * 60 * 1000, anchorMs));

    orders.push({
      id,
      number,
      customerName: `${firstName} ${lastName}`,
      customerEmail: `${emailSlug(firstName)}.${emailSlug(lastName)}${number}@example.com`,
      status,
      position: nextPosition[status],
      totalCents,
      costCents,
      itemsCount,
      createdAt,
      updatedAt,
    });
  }

  return { seed, products, orders, orderItems };
}
