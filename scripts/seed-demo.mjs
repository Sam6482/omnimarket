
import { config } from "dotenv";
import { PrismaClient, OrderStatus } from "@prisma/client";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL en .env.local");
}

const prisma = new PrismaClient();

const products = [
  ["OM-LAP-001", "Laptop Pro 14", "Tecnología", 2499900, 1880000, 18],
  ["OM-MOU-002", "Mouse inalámbrico", "Accesorios", 45900, 23000, 75],
  ["OM-KEY-003", "Teclado mecánico", "Accesorios", 129900, 75000, 42],
  ["OM-MON-004", "Monitor 27 pulgadas", "Tecnología", 549900, 395000, 24],
  ["OM-HDP-005", "Audífonos Bluetooth", "Audio", 89900, 48000, 60],
  ["OM-SPK-006", "Bocina portátil", "Audio", 119900, 67000, 35],
  ["OM-CAM-007", "Cámara web HD", "Tecnología", 79900, 41000, 32],
  ["OM-CHR-008", "Silla ergonómica", "Oficina", 389900, 265000, 14],
  ["OM-DES-009", "Escritorio ajustable", "Oficina", 599900, 420000, 10],
  ["OM-HUB-010", "Hub USB-C", "Accesorios", 69900, 35000, 80],
  ["OM-SSD-011", "SSD externo 1 TB", "Almacenamiento", 189900, 125000, 28],
  ["OM-BAG-012", "Mochila para laptop", "Accesorios", 99900, 54000, 50],
];

const customers = [
  "Ana García", "Carlos López", "Mariana Torres", "Diego Hernández",
  "Sofía Martínez", "Luis Ramírez", "Valeria Cruz", "Jorge Morales",
  "Camila Flores", "Pablo Sánchez",
];

const statuses = [
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

async function main() {
  console.log("Preparando datos de demostración...");

  for (const [sku, name, category, priceCents, costCents, stock] of products) {
    await prisma.product.upsert({
      where: { sku },
      update: {},
      create: {
        sku, name, category, priceCents, costCents, stock,
      },
    });
  }

  const savedProducts = await prisma.product.findMany({
    where: { sku: { in: products.map(([sku]) => sku) } },
    orderBy: { sku: "asc" },
  });

  let created = 0;
  let existing = 0;

  for (let i = 0; i < 20; i++) {
    const id = `omnimarket-demo-order-${String(i + 1).padStart(3, "0")}`;

    const alreadyExists = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });

    if (alreadyExists) {
      existing++;
      continue;
    }

    const customerName = customers[i % customers.length];
    const status = statuses[i % statuses.length];

    const first = savedProducts[i % savedProducts.length];
    const second = savedProducts[(i + 3) % savedProducts.length];

    const lines = [
      { product: first, quantity: 1 + (i % 3) },
      { product: second, quantity: 1 },
    ];

    const totalCents = lines.reduce(
      (sum, line) => sum + line.product.priceCents * line.quantity, 0
    );
    const costCents = lines.reduce(
      (sum, line) => sum + line.product.costCents * line.quantity, 0
    );
    const itemsCount = lines.reduce(
      (sum, line) => sum + line.quantity, 0
    );

    await prisma.order.create({
      data: {
        id,
        customerName,
        customerEmail: `demo${i + 1}@example.com`,
        status,
        position: (i + 1) * 1000,
        totalCents,
        costCents,
        itemsCount,
        items: {
          create: lines.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            unitPriceCents: product.priceCents,
            unitCostCents: product.costCents,
          })),
        },
        events: {
          create: {
            eventType: "DEMO_ORDER_CREATED",
            toStatus: status,
          },
        },
      },
    });

    created++;
  }

  const productCount = await prisma.product.count();
  const orderCount = await prisma.order.count();

  console.log({
    productsInDatabase: productCount,
    ordersInDatabase: orderCount,
    ordersCreatedNow: created,
    demoOrdersAlreadyExisting: existing,
  });

  console.log("Seed de demostración completado.");
}

try {
  await main();
} catch (error) {
  console.error("Falló el seed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
