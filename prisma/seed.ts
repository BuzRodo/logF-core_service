import { PrismaClient, Unit, ProductType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  // ─── Usuario admin ────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      displayName: 'Administrador',
      role: 'admin',
    },
  });

  const cashierHash = await bcrypt.hash('cajero1234', 10);
  await prisma.user.upsert({
    where: { username: 'cajero1' },
    update: {},
    create: {
      username: 'cajero1',
      passwordHash: cashierHash,
      displayName: 'Juan Cajero',
      role: 'cashier',
    },
  });

  // ─── Categorías ───────────────────────────────────────────────────────────
  const [principales, bebidas, postres] = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Principales' },
      update: {},
      create: { name: 'Principales', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { name: 'Bebidas' },
      update: {},
      create: { name: 'Bebidas', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { name: 'Postres' },
      update: {},
      create: { name: 'Postres', sortOrder: 3 },
    }),
  ]);

  // ─── Ingredientes ─────────────────────────────────────────────────────────
  const ingredients = await Promise.all([
    prisma.ingredient.upsert({
      where: { name: 'Carne vacuna picada' },
      update: {},
      create: { name: 'Carne vacuna picada', unit: Unit.GRAM, costPerUnit: 80000, supplier: 'Frigorífico Sur', stockGrams: 5000 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Pan de hamburguesa' },
      update: {},
      create: { name: 'Pan de hamburguesa', unit: Unit.UNIT, costPerUnit: 3000, supplier: 'Panadería Central', stockGrams: 50 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Harina 000' },
      update: {},
      create: { name: 'Harina 000', unit: Unit.GRAM, costPerUnit: 8000, supplier: 'Molino Norte', stockGrams: 10000 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Mozzarella' },
      update: {},
      create: { name: 'Mozzarella', unit: Unit.GRAM, costPerUnit: 120000, supplier: 'Lácteos UY', stockGrams: 3000 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Salsa de tomate' },
      update: {},
      create: { name: 'Salsa de tomate', unit: Unit.ML, costPerUnit: 20000, supplier: 'Conservas SA', stockGrams: 5000 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Tomate perita' },
      update: {},
      create: { name: 'Tomate perita', unit: Unit.GRAM, costPerUnit: 25000, supplier: 'Verdulería', stockGrams: 4000 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Ajo' },
      update: {},
      create: { name: 'Ajo', unit: Unit.GRAM, costPerUnit: 60000, supplier: 'Verdulería', stockGrams: 500 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Leche entera' },
      update: {},
      create: { name: 'Leche entera', unit: Unit.ML, costPerUnit: 15000, supplier: 'Conaprole', stockGrams: 5000 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Huevo' },
      update: {},
      create: { name: 'Huevo', unit: Unit.UNIT, costPerUnit: 1500, supplier: 'Granja La Palma', stockGrams: 30 },
    }),
    prisma.ingredient.upsert({
      where: { name: 'Chocolate negro' },
      update: {},
      create: { name: 'Chocolate negro', unit: Unit.GRAM, costPerUnit: 200000, supplier: 'Importadora Dulce', stockGrams: 2000 },
    }),
  ]);

  const [carne, pan, harina, mozza, salsa, tomate, ajo, leche, huevo, chocolate] = ingredients;

  // ─── Productos con receta ─────────────────────────────────────────────────
  const hamburguesa = await prisma.product.upsert({
    where: { sku: 'HAMB-01' },
    update: {},
    create: {
      sku: 'HAMB-01',
      name: 'Hamburguesa Clásica',
      categoryId: principales.id,
      price: 55000,
      type: ProductType.ELABORATED,
    },
  });

  const hamburguesaDoble = await prisma.product.upsert({
    where: { sku: 'HAMB-02' },
    update: {},
    create: {
      sku: 'HAMB-02',
      name: 'Hamburguesa Doble',
      categoryId: principales.id,
      price: 75000,
      type: ProductType.ELABORATED,
    },
  });

  const pizzaMuzz = await prisma.product.upsert({
    where: { sku: 'PIZZA-01' },
    update: {},
    create: {
      sku: 'PIZZA-01',
      name: 'Pizza Muzzarella',
      categoryId: principales.id,
      price: 48000,
      type: ProductType.ELABORATED,
    },
  });

  const pizzaNap = await prisma.product.upsert({
    where: { sku: 'PIZZA-02' },
    update: {},
    create: {
      sku: 'PIZZA-02',
      name: 'Pizza Napolitana',
      categoryId: principales.id,
      price: 52000,
      type: ProductType.ELABORATED,
    },
  });

  // Bebidas (reventa)
  await prisma.product.upsert({
    where: { sku: 'BEBA-01' },
    update: {},
    create: { sku: 'BEBA-01', name: 'Coca Cola 500ml', categoryId: bebidas.id, price: 12000, type: ProductType.RESALE },
  });
  await prisma.product.upsert({
    where: { sku: 'BEBA-02' },
    update: {},
    create: { sku: 'BEBA-02', name: 'Agua Mineral', categoryId: bebidas.id, price: 8000, type: ProductType.RESALE },
  });
  await prisma.product.upsert({
    where: { sku: 'BEBA-03' },
    update: {},
    create: { sku: 'BEBA-03', name: 'Cerveza Pilsen', categoryId: bebidas.id, price: 15000, type: ProductType.RESALE },
  });

  // Postres
  const helado = await prisma.product.upsert({
    where: { sku: 'POST-01' },
    update: {},
    create: { sku: 'POST-01', name: 'Helado Casero', categoryId: postres.id, price: 22000, type: ProductType.ELABORATED },
  });
  const brownie = await prisma.product.upsert({
    where: { sku: 'POST-02' },
    update: {},
    create: { sku: 'POST-02', name: 'Brownie con Helado', categoryId: postres.id, price: 28000, type: ProductType.ELABORATED },
  });

  // ─── Recetas ──────────────────────────────────────────────────────────────
  // Hamburguesa Clásica: 150g carne + 1 pan
  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId: hamburguesa.id, ingredientId: carne.id } },
    update: {},
    create: { productId: hamburguesa.id, ingredientId: carne.id, quantity: 150 },
  });
  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId: hamburguesa.id, ingredientId: pan.id } },
    update: {},
    create: { productId: hamburguesa.id, ingredientId: pan.id, quantity: 1 },
  });

  // Hamburguesa Doble: 300g carne + 1 pan
  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId: hamburguesaDoble.id, ingredientId: carne.id } },
    update: {},
    create: { productId: hamburguesaDoble.id, ingredientId: carne.id, quantity: 300 },
  });
  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId: hamburguesaDoble.id, ingredientId: pan.id } },
    update: {},
    create: { productId: hamburguesaDoble.id, ingredientId: pan.id, quantity: 1 },
  });

  // Pizza Muzzarella: 250g harina + 150g mozza + 100ml salsa
  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId: pizzaMuzz.id, ingredientId: harina.id } },
    update: {},
    create: { productId: pizzaMuzz.id, ingredientId: harina.id, quantity: 250 },
  });
  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId: pizzaMuzz.id, ingredientId: mozza.id } },
    update: {},
    create: { productId: pizzaMuzz.id, ingredientId: mozza.id, quantity: 150 },
  });
  await prisma.recipeItem.upsert({
    where: { productId_ingredientId: { productId: pizzaMuzz.id, ingredientId: salsa.id } },
    update: {},
    create: { productId: pizzaMuzz.id, ingredientId: salsa.id, quantity: 100 },
  });

  // Pizza Napolitana: 250g harina + 120g mozza + 100ml salsa + 80g tomate + 5g ajo
  for (const [ing, qty] of [
    [harina, 250], [mozza, 120], [salsa, 100], [tomate, 80], [ajo, 5],
  ] as Array<[typeof harina, number]>) {
    await prisma.recipeItem.upsert({
      where: { productId_ingredientId: { productId: pizzaNap.id, ingredientId: ing.id } },
      update: {},
      create: { productId: pizzaNap.id, ingredientId: ing.id, quantity: qty },
    });
  }

  // Brownie con Helado: 80g chocolate + 1 huevo + 50ml leche + 60g harina
  for (const [ing, qty] of [
    [chocolate, 80], [huevo, 1], [leche, 50], [harina, 60],
  ] as Array<[typeof harina, number]>) {
    await prisma.recipeItem.upsert({
      where: { productId_ingredientId: { productId: brownie.id, ingredientId: ing.id } },
      update: {},
      create: { productId: brownie.id, ingredientId: ing.id, quantity: qty },
    });
  }

  // Helado casero: 200ml leche + 2 huevos
  for (const [ing, qty] of [
    [leche, 200], [huevo, 2],
  ] as Array<[typeof harina, number]>) {
    await prisma.recipeItem.upsert({
      where: { productId_ingredientId: { productId: helado.id, ingredientId: ing.id } },
      update: {},
      create: { productId: helado.id, ingredientId: ing.id, quantity: qty },
    });
  }

  console.log('✅ Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
